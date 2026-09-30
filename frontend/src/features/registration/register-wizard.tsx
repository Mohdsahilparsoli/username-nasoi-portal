"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, CircleCheck, Copy, Info, LogIn, Pencil, Send, TriangleAlert, Wand2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileUpload } from "@/components/ui/file-upload";
import { ChoiceGroup, Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { DistrictOptions, StateOptions } from "@/components/ui/location-options";
import { Alert } from "@/components/ui/misc";
import * as api from "@/lib/api";
import { CATEGORIES, GENDERS, QUALIFICATIONS } from "@/lib/constants";
import { cn, fmtDate, maskAccount } from "@/lib/utils";
import { BANK_DOC_TYPES, EMPTY_FORM, STEP_SCHEMAS, STEPS, type RegistrationForm } from "./schema";

const DRAFT_KEY = "nasoi_registration_draft_v2";
const IMG = "image/png,image/jpeg,.png,.jpg,.jpeg";
const DOC = ".pdf,image/png,image/jpeg,.png,.jpg,.jpeg";

/** Resize an uploaded photo to a small JPEG thumbnail (stored for the profile, not shown here). */
function toThumbnail(file: File, size = 180): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, size / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function RegisterWizard() {
  const [step, setStep] = useState(0);
  const stepRef = useRef(0);
  stepRef.current = step;
  const [done, setDone] = useState<{ id: string; mobile: string; password: string } | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  // Validate only the current step's schema.
  const resolver: Resolver<RegistrationForm> = (values, ctx, opts) =>
    zodResolver(STEP_SCHEMAS[stepRef.current] as never)(values, ctx, opts as never) as never;

  // Errors appear when "Next" is pressed, then update live while the user fixes them.
  const form = useForm<RegistrationForm>({ resolver, defaultValues: EMPTY_FORM, mode: "onSubmit", reValidateMode: "onChange" });
  const { register, formState: { errors }, watch, setValue, getValues, reset } = form;
  const v = watch();

  // Restore draft once, then keep saving it while the user types.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as { values: RegistrationForm; step: number };
        reset({ ...EMPTY_FORM, ...d.values, account: "", account2: "" });
        setStep(Math.min(d.step, STEPS.length - 1));
        setDraftLoaded(true);
      }
    } catch { /* ignore broken draft */ }
  }, [reset]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/incompatible-library
    const sub = watch((values) => {
      // Bank account numbers are never kept in the draft.
      const { account: _a, account2: _b, ...safe } = values as RegistrationForm;
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ values: safe, step: stepRef.current })); } catch { /* quota */ }
    });
    return () => sub.unsubscribe();
  }, [watch]);

  const goTo = (i: number) => {
    setStep(i);
    // Fresh step: clear old errors and the "submitted" state, keep all values.
    reset(undefined, { keepValues: true, keepDefaultValues: true, keepDirty: true, keepTouched: true });
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...JSON.parse(raw), step: i }));
    } catch { /* ignore */ }
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const next = form.handleSubmit(
    () => goTo(step + 1),
    () => toast.error("Please fix the highlighted fields."),
  );

  const submit = useMutation({
    mutationFn: async (values: RegistrationForm) => {
      // Final safety check: every step must be valid.
      for (let i = 0; i < STEP_SCHEMAS.length; i++) {
        if (!STEP_SCHEMAS[i].safeParse(values).success) {
          goTo(i);
          throw new Error(`Please complete "${STEPS[i].title}".`);
        }
      }
      return api.registerDeo({
        name: values.name.trim().toUpperCase(),
        fatherName: values.fatherName.trim().toUpperCase(),
        motherName: values.motherName.trim().toUpperCase(),
        dob: values.dob, gender: values.gender, category: values.category, religion: values.religion,
        mobile: values.mobile, altMobile: values.altMobile, email: values.email.trim(),
        state: values.state, district: values.district, tehsil: values.tehsil, pincode: values.pincode, address: values.address,
        qualification: values.qualification, photo: values.photo, photoName: values.photoName, certificateName: values.certificateName,
        bank: { bankName: values.bankName, holder: values.holder.toUpperCase(), account: values.account, ifsc: values.ifsc.toUpperCase() },
        bankDocType: values.bankDocType, bankDocName: values.bankDocName,
      });
    },
    onSuccess: ({ user, password }) => {
      localStorage.removeItem(DRAFT_KEY);
      setDone({ id: user.id, mobile: user.mobile, password });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (e) => toast.error(e.message),
  });

  const fillSample = () => {
    const rnd = String(Math.floor(10000000 + Math.random() * 89999999));
    const acc = "1234567890" + rnd.slice(0, 2);
    reset({
      name: "AMIT SINGH", fatherName: "RAJENDRA SINGH", motherName: "MEENA DEVI", dob: "2000-08-15",
      gender: "Male", category: "GEN", religion: "",
      mobile: "98" + rnd, altMobile: "", email: `amit${rnd.slice(0, 4)}@example.com`,
      state: "Uttar Pradesh", district: "Meerut", tehsil: "Mawana", pincode: "250401",
      address: "Village Kithore, Tehsil Mawana, District Meerut",
      bankName: "Bank of Baroda", holder: "AMIT SINGH", account: acc, account2: acc, ifsc: "BARB0MAWANA",
      bankDocType: "Cancelled Cheque", bankDocName: getValues("bankDocName") || "cancelled-cheque.jpg",
      qualification: "12th", photo: getValues("photo") || "", photoName: getValues("photoName") || "passport-photo.jpg",
      certificateName: getValues("certificateName") || "12th-marksheet.pdf",
      declare: false, terms: false,
    });
    toast.success("Sample data filled in all steps. Go to Review to submit.");
  };

  if (done) return <Success {...done} />;

  const err = (k: keyof RegistrationForm) => errors[k]?.message as string | undefined;
  const last = STEPS.length - 1;

  return (
    <div ref={topRef} className="scroll-mt-24">
      <Stepper step={step} onJump={(i) => i < step && goTo(i)} />

      <Card className="mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-saffron px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-saffron-dark">Step {step + 1} of {STEPS.length}</p>
            <h2 className="text-xl font-bold">{STEPS[step].title}</h2>
          </div>
          <Button type="button" variant="light" size="sm" onClick={fillSample}>
            <Wand2 /> Fill sample data
          </Button>
        </div>

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (step < last) next();
            // The resolver returns only the current step's fields, so submit the full form values.
            else form.handleSubmit(() => submit.mutate(getValues()))();
          }}
        >
          <div className="space-y-5 px-5 py-6 sm:px-6">
            {draftLoaded && step === 0 && (
              <Alert tone="blue" icon={Info}>Your saved draft has been restored. Bank account numbers are never saved and must be entered again.</Alert>
            )}

            {/* STEP 1 – Personal */}
            {step === 0 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field className="sm:col-span-2" label="Full Name (as per Certificate)" htmlFor="name" required error={err("name")}>
                  <Input id="name" className="uppercase" maxLength={60} aria-invalid={!!err("name")} {...register("name")} />
                </Field>
                <Field label="Father's Name" htmlFor="fatherName" required error={err("fatherName")}>
                  <Input id="fatherName" className="uppercase" maxLength={60} aria-invalid={!!err("fatherName")} {...register("fatherName")} />
                </Field>
                <Field label="Mother's Name" htmlFor="motherName" required error={err("motherName")}>
                  <Input id="motherName" className="uppercase" maxLength={60} aria-invalid={!!err("motherName")} {...register("motherName")} />
                </Field>
                <Field label="Date of Birth" htmlFor="dob" required error={err("dob")}>
                  <Input id="dob" type="date" aria-invalid={!!err("dob")} {...register("dob")} />
                </Field>
                <Field label="Religion" htmlFor="religion">
                  <Input id="religion" maxLength={30} {...register("religion")} />
                </Field>
                <Field label="Gender" required error={err("gender")}>
                  <ChoiceGroup name="gender" options={GENDERS} register={register as never} invalid={!!err("gender")} />
                </Field>
                <Field label="Category" required error={err("category")}>
                  <ChoiceGroup name="category" options={CATEGORIES} register={register as never} invalid={!!err("category")} />
                </Field>
              </div>
            )}

            {/* STEP 2 – Contact */}
            {step === 1 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Mobile Number" htmlFor="mobile" required error={err("mobile")}>
                  <Input id="mobile" inputMode="numeric" maxLength={10} aria-invalid={!!err("mobile")} {...register("mobile", { onChange: digitsOnly })} />
                </Field>
                <Field label="Alternate Mobile Number" htmlFor="altMobile" error={err("altMobile")}>
                  <Input id="altMobile" inputMode="numeric" maxLength={10} aria-invalid={!!err("altMobile")} {...register("altMobile", { onChange: digitsOnly })} />
                </Field>
                <Field className="sm:col-span-2" label="Email ID" htmlFor="email" required error={err("email")}>
                  <Input id="email" type="email" maxLength={80} aria-invalid={!!err("email")} {...register("email")} />
                </Field>
                <Field label="State / Union Territory" htmlFor="state" required error={err("state")}>
                  <Select id="state" aria-invalid={!!err("state")} {...register("state", { onChange: () => setValue("district", "") })}>
                    <StateOptions />
                  </Select>
                </Field>
                <Field label="District" htmlFor="district" required error={err("district")}>
                  <Select id="district" disabled={!v.state} aria-invalid={!!err("district")} {...register("district")}>
                    <DistrictOptions state={v.state} />
                  </Select>
                </Field>
                <Field label="Sub District / Tehsil" htmlFor="tehsil" required error={err("tehsil")}>
                  <Input id="tehsil" maxLength={40} aria-invalid={!!err("tehsil")} {...register("tehsil")} />
                </Field>
                <Field label="Area Pincode" htmlFor="pincode" required error={err("pincode")}>
                  <Input id="pincode" inputMode="numeric" maxLength={6} aria-invalid={!!err("pincode")} {...register("pincode", { onChange: digitsOnly })} />
                </Field>
                <Field className="sm:col-span-2" label="Full Residential Address" htmlFor="address" required error={err("address")}>
                  <Textarea id="address" maxLength={200} aria-invalid={!!err("address")} {...register("address")} />
                </Field>
              </div>
            )}

            {/* STEP 3 – Bank */}
            {step === 2 && (
              <>
                <Alert tone="amber" icon={TriangleAlert}>Demo portal: use sample details, not your real bank account.</Alert>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Bank Name" htmlFor="bankName" required error={err("bankName")}>
                    <Input id="bankName" maxLength={60} aria-invalid={!!err("bankName")} {...register("bankName")} />
                  </Field>
                  <Field label="Account Holder Name" htmlFor="holder" required error={err("holder")}>
                    <Input id="holder" className="uppercase" maxLength={60} aria-invalid={!!err("holder")} {...register("holder")} />
                  </Field>
                  <Field label="Account Number" htmlFor="account" required error={err("account")}>
                    <Input id="account" type="password" inputMode="numeric" autoComplete="off" maxLength={18} aria-invalid={!!err("account")} {...register("account", { onChange: digitsOnly })} />
                  </Field>
                  <Field label="Confirm Account Number" htmlFor="account2" required error={err("account2")}>
                    <Input id="account2" inputMode="numeric" autoComplete="off" maxLength={18} aria-invalid={!!err("account2")} {...register("account2", { onChange: digitsOnly })} />
                  </Field>
                  <Field label="IFSC Code" htmlFor="ifsc" required error={err("ifsc")} hint="e.g. SBIN0001234">
                    <Input id="ifsc" className="uppercase" maxLength={11} aria-invalid={!!err("ifsc")} {...register("ifsc")} />
                  </Field>
                </div>
                <div className="space-y-4 rounded-xl border border-line p-4 sm:p-5">
                  <Field label="Bank proof – upload one" required error={err("bankDocType")}>
                    <ChoiceGroup name="bankDocType" options={[...BANK_DOC_TYPES]} register={register as never} invalid={!!err("bankDocType")} />
                  </Field>
                  {v.bankDocType && (
                    <Field label={`Upload ${v.bankDocType}`} required error={err("bankDocName")}>
                      <FileUpload
                        fileName={v.bankDocName}
                        accept={DOC}
                        hint={`${v.bankDocType === "Bank Passbook" ? "First page of passbook showing name & account number" : "Cancelled cheque with your name printed"} · PDF, JPG or PNG, max 2 MB`}
                        invalid={!!err("bankDocName")}
                        onFile={(f) => setValue("bankDocName", f.name, { shouldValidate: true })}
                        onClear={() => setValue("bankDocName", "", { shouldValidate: true })}
                      />
                    </Field>
                  )}
                </div>
              </>
            )}

            {/* STEP 4 – Documents: one item per row */}
            {step === 3 && (
              <div className="space-y-6">
                <Field label="Highest Educational Qualification" required error={err("qualification")}>
                  <ChoiceGroup name="qualification" options={QUALIFICATIONS} register={register as never} invalid={!!err("qualification")} />
                </Field>
                <div className="border-t border-line" />
                <Field label="Passport Size Photo" required error={err("photoName")}>
                  <FileUpload
                    kind="image"
                    fileName={v.photoName}
                    accept={IMG}
                    hint="Recent colour photo, plain background · JPG or PNG, max 2 MB"
                    invalid={!!err("photoName")}
                    onFile={async (f) => {
                      setValue("photo", await toThumbnail(f).catch(() => ""));
                      setValue("photoName", f.name, { shouldValidate: true });
                    }}
                    onClear={() => {
                      setValue("photo", "");
                      setValue("photoName", "", { shouldValidate: true });
                    }}
                  />
                </Field>
                <div className="border-t border-line" />
                <Field label={`Education Certificate${v.qualification ? ` (${v.qualification})` : ""}`} required error={err("certificateName")}>
                  <FileUpload
                    fileName={v.certificateName}
                    accept={DOC}
                    hint="Marksheet / certificate of your highest qualification · PDF, JPG or PNG, max 2 MB"
                    invalid={!!err("certificateName")}
                    onFile={(f) => setValue("certificateName", f.name, { shouldValidate: true })}
                    onClear={() => setValue("certificateName", "", { shouldValidate: true })}
                  />
                </Field>
              </div>
            )}

            {/* STEP 5 – Review */}
            {step === 4 && (
              <div className="space-y-5">
                <ReviewBlock title="Personal Details" onEdit={() => goTo(0)} rows={[
                  ["Full Name", v.name.toUpperCase()], ["Father's Name", v.fatherName.toUpperCase()], ["Mother's Name", v.motherName.toUpperCase()],
                  ["Date of Birth", fmtDate(v.dob)], ["Gender", v.gender], ["Category", v.category], ["Religion", v.religion || "—"],
                ]} />
                <ReviewBlock title="Contact & Address" onEdit={() => goTo(1)} rows={[
                  ["Mobile", v.mobile], ["Alternate Mobile", v.altMobile || "—"], ["Email ID", v.email],
                  ["State / UT", v.state], ["District", v.district], ["Tehsil / Pincode", `${v.tehsil} / ${v.pincode}`], ["Address", v.address],
                ]} />
                <ReviewBlock title="Bank Details" onEdit={() => goTo(2)} rows={[
                  ["Bank Name", v.bankName], ["Account Holder", v.holder.toUpperCase()], ["Account Number", maskAccount(v.account)],
                  ["IFSC Code", v.ifsc.toUpperCase()], [`Bank Proof (${v.bankDocType || "—"})`, uploaded(v.bankDocName)],
                ]} />
                <ReviewBlock title="Qualification & Documents" onEdit={() => goTo(3)} rows={[
                  ["Highest Qualification", v.qualification], ["Passport Size Photo", uploaded(v.photoName)], ["Education Certificate", uploaded(v.certificateName)],
                ]} />
                <div className="space-y-3 rounded-xl border border-line bg-primary-soft/50 p-4">
                  <h3 className="font-semibold">Declaration</h3>
                  <Tick label="I hereby declare that the information provided above is true and correct to the best of my knowledge. I understand that any false statement will lead to immediate disqualification." error={err("declare")} {...register("declare")} />
                  <Tick label={<>I meet the eligibility criteria and have read and agree to the <Link href="/terms" target="_blank" className="font-semibold text-primary underline">Terms &amp; Conditions</Link>.</>} error={err("terms")} {...register("terms")} />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-canvas/60 px-5 py-4 sm:px-6">
            <Button type="button" variant="light" onClick={() => goTo(step - 1)} disabled={step === 0}>
              <ArrowLeft /> Back
            </Button>
            <span className="hidden text-xs text-muted sm:block">Progress is saved automatically on this device.</span>
            {step < last ? (
              <Button type="submit">Next <ArrowRight /></Button>
            ) : (
              <Button type="submit" variant="success" disabled={submit.isPending}>
                <Send /> {submit.isPending ? "Submitting…" : "Submit Registration"}
              </Button>
            )}
          </div>
        </form>
      </Card>
      <p className="mt-4 text-center text-sm text-muted">
        Already registered? <Link href="/login" className="font-medium text-primary hover:underline">Login here</Link>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const uploaded = (name?: string) => (name ? `✓ Uploaded – ${name}` : "Not uploaded");

function digitsOnly(e: React.ChangeEvent<HTMLInputElement>) {
  e.target.value = e.target.value.replace(/\D/g, "");
}

function Stepper({ step, onJump }: { step: number; onJump: (i: number) => void }) {
  return (
    <div>
      {/* Mobile: compact progress */}
      <div className="sm:hidden">
        <div className="mb-1.5 flex justify-between text-xs font-medium text-muted">
          <span>Step {step + 1} of {STEPS.length}</span>
          <span className="text-navy">{STEPS[step].title}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-saffron transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>
      {/* Desktop: full stepper */}
      <ol className="hidden items-center sm:flex">
        {STEPS.map((s, i) => {
          const state = i < step ? "done" : i === step ? "current" : "todo";
          return (
            <li key={s.key} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                onClick={() => onJump(i)}
                disabled={i >= step}
                className="flex items-center gap-2 disabled:cursor-default"
                aria-current={state === "current" ? "step" : undefined}
              >
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-full border-2 text-sm font-bold transition",
                    state === "done" && "border-success bg-success text-white",
                    state === "current" && "border-saffron bg-saffron text-white shadow-[0_0_0_4px] shadow-saffron/20",
                    state === "todo" && "border-slate-300 bg-white text-muted",
                  )}
                >
                  {state === "done" ? <Check className="size-4" /> : i + 1}
                </span>
                <span className={cn("hidden text-sm font-medium lg:block", state === "todo" ? "text-muted" : "text-navy")}>{s.short}</span>
              </button>
              {i < STEPS.length - 1 && <span className={cn("mx-2 h-0.5 flex-1 rounded", i < step ? "bg-success" : "bg-slate-200")} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const Tick = ({
  label,
  error,
  ...props
}: { label: React.ReactNode; error?: string } & React.InputHTMLAttributes<HTMLInputElement> & { ref?: React.Ref<HTMLInputElement> }) => (
  <div>
    <label className={cn("flex cursor-pointer items-start gap-3 rounded-lg border bg-white p-3.5 text-sm has-[:checked]:border-success has-[:checked]:bg-success-soft/50", error ? "border-danger" : "border-line")}>
      <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--color-success)]" {...props} />
      <span>{label} <span className="text-danger">*</span></span>
    </label>
    {error && <p className="mt-1 text-xs text-danger">{error}</p>}
  </div>
);

function ReviewBlock({ title, rows, onEdit }: { title: string; rows: [string, string][]; onEdit: () => void }) {
  return (
    <div className="rounded-xl border border-line">
      <div className="flex items-center justify-between border-b border-line bg-canvas px-4 py-2.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
          <Pencil className="size-3.5" /> Edit
        </button>
      </div>
      <dl className="grid gap-x-6 gap-y-3 p-4 sm:grid-cols-2">
        {rows.map(([k, val]) => (
          <div key={k}>
            <dt className="text-xs text-muted">{k}</dt>
            <dd className={cn("text-sm font-medium break-words", val.startsWith("✓") && "text-success", val === "Not uploaded" && "text-danger")}>{val || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Success({ id, mobile, password }: { id: string; mobile: string; password: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`NASOI Registration ID: ${id}\nMobile: ${mobile}\nPassword: ${password}`);
      toast.success("Login details copied.");
    } catch {
      toast.error("Copy not available – please note the details.");
    }
  };
  return (
    <Card className="mx-auto max-w-lg p-6 text-center sm:p-8">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-success-soft text-success">
        <CircleCheck className="size-9" />
      </span>
      <h2 className="mt-4 text-2xl font-bold">Registration successful</h2>
      <p className="mt-1 text-sm text-muted">Your Data Entry Operator account has been created. Please note your login details.</p>
      <div className="mt-5 space-y-2 rounded-xl border border-success/30 bg-success-soft/60 p-4 text-left">
        {[["Employee / Registration ID", id], ["Mobile No.", mobile], ["Password", password]].map(([k, val]) => (
          <div key={k} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted">{k}</span>
            <b className="font-mono text-base text-navy">{val}</b>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">Log in with the Registration ID, mobile number or email ID. The Super Admin will assign your work area shortly.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button variant="light" onClick={copy}><Copy /> Copy details</Button>
        <Button asChild><Link href={`/login?role=deo&id=${encodeURIComponent(id)}`}><LogIn /> Go to Login</Link></Button>
      </div>
    </Card>
  );
}
