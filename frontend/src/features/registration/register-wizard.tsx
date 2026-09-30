"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, CircleCheck, Copy, ExternalLink, FileText, ImageIcon, Info, LogIn, Pencil, Send, ShieldCheck, TriangleAlert, Wand2 } from "lucide-react";
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
import { CATEGORIES, COUNTRIES, GENDERS, QUALIFICATIONS, RELIGIONS } from "@/lib/constants";
import { cn, fmtDate, maskAccount } from "@/lib/utils";
import { BANK_DOC_TYPES, EMPTY_FORM, maskAadhaar, STEP_SCHEMAS, STEPS, type RegistrationForm } from "./schema";

const DRAFT_KEY = "nasoi_registration_draft_v4";

/** Uploaded files, kept in memory so they can be opened in a new tab from the preview. */
type DocKey = "aadhaarDocName" | "panDocName" | "bankDocName" | "photoName" | "signatureName";
const IMG = "image/png,image/jpeg,.png,.jpg,.jpeg";
const DOC = ".pdf,image/png,image/jpeg,.png,.jpg,.jpeg";

/** Resize an image to a small JPEG (kept for the final preview and profile). */
function toThumbnail(file: File, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, size / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL("image/jpeg", 0.82));
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
  const [fileUrls, setFileUrls] = useState<Partial<Record<DocKey, string>>>({});
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
        // Files cannot be kept in a draft, so uploads must be done again.
        reset({
          ...EMPTY_FORM, ...d.values, account: "", account2: "", aadhaar: "",
          aadhaarDocName: "", panDocName: "", bankDocName: "", photoName: "", photo: "", signatureName: "", signature: "",
        });
        setStep(Math.min(d.step, STEPS.length - 1));
        setDraftLoaded(true);
      }
    } catch { /* ignore broken draft */ }
  }, [reset]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/incompatible-library
    const sub = watch((values) => {
      // Bank account and Aadhaar numbers are never kept in the draft.
      const { account: _a, account2: _b, aadhaar: _c, ...safe } = values as RegistrationForm;
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

  /** Keep the chosen file (for "View") and put its name in the form. */
  const attach = (key: DocKey, file: File | Blob, name: string) => {
    setFileUrls((prev) => {
      if (prev[key]) URL.revokeObjectURL(prev[key]!);
      return { ...prev, [key]: URL.createObjectURL(file) };
    });
    setValue(key, name, { shouldValidate: true });
  };
  const detach = (key: DocKey) => {
    setFileUrls((prev) => {
      if (prev[key]) URL.revokeObjectURL(prev[key]!);
      const nextUrls = { ...prev };
      delete nextUrls[key];
      return nextUrls;
    });
    setValue(key, "", { shouldValidate: true });
    if (key === "photoName") setValue("photo", "");
    if (key === "signatureName") setValue("signature", "");
  };

  // Free memory used by file previews when leaving the page.
  const urlsRef = useRef(fileUrls);
  urlsRef.current = fileUrls;
  useEffect(() => () => Object.values(urlsRef.current).forEach((u) => u && URL.revokeObjectURL(u)), []);

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
        mobile: values.mobile, email: values.email.trim(),
        country: values.country, state: values.state, district: values.district, tehsil: values.tehsil,
        postOffice: values.postOffice, pincode: values.pincode, policeStation: values.policeStation, address: values.address,
        bank: { bankName: values.bankName, holder: values.holder.toUpperCase(), account: values.account, ifsc: values.ifsc.toUpperCase() },
        qualification: values.qualification,
        aadhaar: values.aadhaar, aadhaarDocName: values.aadhaarDocName,
        pan: values.pan ? values.pan.toUpperCase() : undefined, panDocName: values.panDocName || undefined,
        bankDocType: values.bankDocType, bankDocName: values.bankDocName,
        photo: values.photo, photoName: values.photoName, signature: values.signature, signatureName: values.signatureName,
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
    const g0 = getValues();
    const samples: [DocKey, string, string][] = [
      ["aadhaarDocName", "aadhaar-card.svg", "Sample Aadhaar Card"],
      ["panDocName", "pan-card.svg", "Sample PAN Card"],
      ["bankDocName", "passbook-first-page.svg", "Sample Bank Passbook"],
    ];
    for (const [k, name, title] of samples) if (!g0[k]) attach(k, sampleDoc(title), name);
    if (!g0.photoName) attach("photoName", svgBlob(samplePhotoSvg()), "passport-photo.svg");
    if (!g0.signatureName) attach("signatureName", svgBlob(sampleSignatureSvg()), "signature.svg");
    const rnd = String(Math.floor(10000000 + Math.random() * 89999999));
    const acc = "1234567890" + rnd.slice(0, 2);
    const g = getValues();
    reset({
      name: "AMIT SINGH", fatherName: "RAJENDRA SINGH", motherName: "MEENA DEVI", dob: "2000-08-15",
      email: `amit${rnd.slice(0, 4)}@example.com`, mobile: "98" + rnd, gender: "Male", category: "GEN", religion: "Hindu",
      country: "India", state: "Uttar Pradesh", district: "Meerut", tehsil: "Mawana", postOffice: "Kithore", pincode: "250401",
      policeStation: "Kithore", address: "House No. 12, Village Kithore, Tehsil Mawana, District Meerut",
      bankName: "Bank of Baroda", holder: "AMIT SINGH", account: acc, account2: acc, ifsc: "BARB0MAWANA",
      qualification: "Class 12", aadhaar: "234123412346", aadhaarDocName: g.aadhaarDocName || "aadhaar-card.svg",
      pan: "ABCDE1234F", panDocName: g.panDocName || "pan-card.svg",
      bankDocType: "Bank Passbook", bankDocName: g.bankDocName || "passbook-first-page.svg",
      photo: g.photo || svgDataUrl(samplePhotoSvg()), photoName: g.photoName || "passport-photo.svg",
      signature: g.signature || svgDataUrl(sampleSignatureSvg()), signatureName: g.signatureName || "signature.svg",
      declare: false, terms: false,
    });
    toast.success("Sample data filled in all steps. Go to Preview to submit.");
  };

  if (done) return <Success {...done} />;

  const err = (k: keyof RegistrationForm) => errors[k]?.message as string | undefined;
  const last = STEPS.length - 1;
  const digits = { onChange: digitsOnly };

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
              <Alert tone="blue" icon={Info}>Your saved draft has been restored. Bank account and Aadhaar numbers, and uploaded documents, are not saved – please enter / upload them again.</Alert>
            )}

            {/* STEP 1 – Personal */}
            {step === 0 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field className="sm:col-span-2" label="Candidate Full Name" htmlFor="name" required error={err("name")} hint="As written on your Aadhaar card">
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
                <Field label="Email ID" htmlFor="email" required error={err("email")}>
                  <Input id="email" type="email" maxLength={80} aria-invalid={!!err("email")} {...register("email")} />
                </Field>
                <Field label="Mobile Number" htmlFor="mobile" required error={err("mobile")}>
                  <Input id="mobile" inputMode="numeric" maxLength={10} aria-invalid={!!err("mobile")} {...register("mobile", digits)} />
                </Field>
                <Field label="Religion" htmlFor="religion" required error={err("religion")}>
                  <Select id="religion" aria-invalid={!!err("religion")} {...register("religion")}>
                    <option value="">-- Select Religion --</option>
                    {RELIGIONS.map((r) => <option key={r}>{r}</option>)}
                  </Select>
                </Field>
                <Field label="Gender" required error={err("gender")}>
                  <ChoiceGroup name="gender" options={GENDERS} register={register as never} invalid={!!err("gender")} />
                </Field>
                <Field label="Category" required error={err("category")}>
                  <ChoiceGroup name="category" options={CATEGORIES} register={register as never} invalid={!!err("category")} />
                </Field>
              </div>
            )}

            {/* STEP 2 – Address */}
            {step === 1 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Country" htmlFor="country" required error={err("country")}>
                  <Select id="country" aria-invalid={!!err("country")} {...register("country")}>
                    {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                  </Select>
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
                <Field label="Post Office Name" htmlFor="postOffice" required error={err("postOffice")}>
                  <Input id="postOffice" maxLength={40} aria-invalid={!!err("postOffice")} {...register("postOffice")} />
                </Field>
                <Field label="PIN Code" htmlFor="pincode" required error={err("pincode")}>
                  <Input id="pincode" inputMode="numeric" maxLength={6} aria-invalid={!!err("pincode")} {...register("pincode", digits)} />
                </Field>
                <Field className="sm:col-span-2" label="Police Station Name" htmlFor="policeStation" required error={err("policeStation")}>
                  <Input id="policeStation" maxLength={60} aria-invalid={!!err("policeStation")} {...register("policeStation")} />
                </Field>
                <Field className="sm:col-span-2" label="Full Address" htmlFor="address" required error={err("address")} hint="House no., street / village, landmark">
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
                    <Input id="account" type="password" inputMode="numeric" autoComplete="off" maxLength={18} aria-invalid={!!err("account")} {...register("account", digits)} />
                  </Field>
                  <Field label="Confirm Account Number" htmlFor="account2" required error={err("account2")}>
                    <Input id="account2" inputMode="numeric" autoComplete="off" maxLength={18} aria-invalid={!!err("account2")} {...register("account2", digits)} />
                  </Field>
                  <Field label="IFSC Code" htmlFor="ifsc" required error={err("ifsc")} hint="e.g. SBIN0001234">
                    <Input id="ifsc" className="uppercase" maxLength={11} aria-invalid={!!err("ifsc")} {...register("ifsc")} />
                  </Field>
                </div>
              </>
            )}

            {/* STEP 4 – Documents & Qualification: one item per row */}
            {step === 3 && (
              <div className="space-y-6">
                <Field label="Education Qualification" required error={err("qualification")}>
                  <ChoiceGroup name="qualification" options={QUALIFICATIONS} register={register as never} invalid={!!err("qualification")} />
                </Field>

                <Section title="Aadhaar Card">
                  <Field label="Aadhaar Card Number" htmlFor="aadhaar" required error={err("aadhaar")} hint="12 digits, without spaces">
                    <Input id="aadhaar" inputMode="numeric" autoComplete="off" maxLength={12} className="sm:max-w-xs" aria-invalid={!!err("aadhaar")} {...register("aadhaar", digits)} />
                  </Field>
                  <Field label="Upload Aadhaar Card" required error={err("aadhaarDocName")}>
                    <FileUpload
                      fileName={v.aadhaarDocName}
                      accept={DOC}
                      hint="Front and back in one file · PDF, JPG or PNG, max 2 MB"
                      invalid={!!err("aadhaarDocName")}
                      viewUrl={fileUrls.aadhaarDocName}
                      onFile={(f) => attach("aadhaarDocName", f, f.name)}
                      onClear={() => detach("aadhaarDocName")}
                    />
                  </Field>
                </Section>

                <Section title="PAN Card" optional>
                  <Field label="PAN Number" htmlFor="pan" error={err("pan")} hint="10 characters, e.g. ABCDE1234F">
                    <Input id="pan" autoComplete="off" maxLength={10} className="uppercase sm:max-w-xs" aria-invalid={!!err("pan")} {...register("pan", { onChange: (e) => (e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")) })} />
                  </Field>
                  <Field label="Upload PAN Card" error={err("panDocName")}>
                    <FileUpload
                      fileName={v.panDocName}
                      accept={DOC}
                      hint="Front side · PDF, JPG or PNG, max 2 MB"
                      invalid={!!err("panDocName")}
                      viewUrl={fileUrls.panDocName}
                      onFile={(f) => attach("panDocName", f, f.name)}
                      onClear={() => detach("panDocName")}
                    />
                  </Field>
                </Section>

                <Section title="Bank Passbook / Cancelled Cheque">
                  <Field label="Document type" required error={err("bankDocType")}>
                    <ChoiceGroup name="bankDocType" options={[...BANK_DOC_TYPES]} register={register as never} invalid={!!err("bankDocType")} />
                  </Field>
                  <Field label={`Upload ${v.bankDocType || "Bank Passbook / Cancelled Cheque"}`} required error={err("bankDocName")}>
                    <FileUpload
                      fileName={v.bankDocName}
                      accept={DOC}
                      hint={`${v.bankDocType === "Cancelled Cheque" ? "Cancelled cheque with your name printed" : "First page showing name & account number"} · PDF, JPG or PNG, max 2 MB`}
                      invalid={!!err("bankDocName")}
                      viewUrl={fileUrls.bankDocName}
                      onFile={(f) => attach("bankDocName", f, f.name)}
                      onClear={() => detach("bankDocName")}
                    />
                  </Field>
                </Section>

                <Section title="Photo">
                  <Field label="Passport Size Photo" required error={err("photoName")}>
                    <FileUpload
                      kind="image"
                      fileName={v.photoName}
                      accept={IMG}
                      hint="Recent colour photo, plain background · JPG or PNG, max 2 MB"
                      invalid={!!err("photoName")}
                      viewUrl={fileUrls.photoName}
                      onFile={async (f) => {
                        setValue("photo", await toThumbnail(f, 240).catch(() => ""));
                        attach("photoName", f, f.name);
                      }}
                      onClear={() => detach("photoName")}
                    />
                  </Field>
                </Section>

                <Section title="Signature">
                  <Field label="Signature" required error={err("signatureName")}>
                    <FileUpload
                      kind="image"
                      fileName={v.signatureName}
                      accept={IMG}
                      hint="Sign in black/blue ink on white paper · JPG or PNG, max 1 MB"
                      maxMb={1}
                      invalid={!!err("signatureName")}
                      viewUrl={fileUrls.signatureName}
                      onFile={async (f) => {
                        setValue("signature", await toThumbnail(f, 360).catch(() => ""));
                        attach("signatureName", f, f.name);
                      }}
                      onClear={() => detach("signatureName")}
                    />
                  </Field>
                </Section>
              </div>
            )}

            {/* STEP 5 – Preview */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="flex flex-col gap-5 rounded-xl border border-line p-4 sm:flex-row">
                  <div className="flex shrink-0 gap-4 sm:flex-col">
                    <figure className="text-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {v.photo ? <img src={v.photo} alt="Candidate photo" className="h-40 w-32 rounded-lg border border-line object-cover" /> : <Missing label="Photo" className="h-40 w-32" />}
                      <figcaption className="mt-1 text-xs text-muted">Photo</figcaption>
                    </figure>
                    <figure className="text-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {v.signature ? <img src={v.signature} alt="Candidate signature" className="h-14 w-32 rounded-lg border border-line bg-white object-contain p-1" /> : <Missing label="Signature" className="h-14 w-32" />}
                      <figcaption className="mt-1 text-xs text-muted">Signature</figcaption>
                    </figure>
                  </div>
                  <ReviewBlock className="flex-1 border-0" title="Personal Details" onEdit={() => goTo(0)} rows={[
                    ["Candidate Full Name", v.name.toUpperCase()], ["Father's Name", v.fatherName.toUpperCase()], ["Mother's Name", v.motherName.toUpperCase()],
                    ["Date of Birth", fmtDate(v.dob)], ["Email ID", v.email], ["Mobile Number", v.mobile],
                    ["Gender", v.gender], ["Category", v.category], ["Religion", v.religion],
                  ]} />
                </div>
                <ReviewBlock title="Address Details" onEdit={() => goTo(1)} rows={[
                  ["Country", v.country], ["State / UT", v.state], ["District", v.district], ["Sub District", v.tehsil],
                  ["Post Office", v.postOffice], ["PIN Code", v.pincode], ["Police Station", v.policeStation], ["Full Address", v.address],
                ]} />
                <ReviewBlock title="Banking Details" onEdit={() => goTo(2)} rows={[
                  ["Bank Name", v.bankName], ["Account Holder Name", v.holder.toUpperCase()], ["Account Number", maskAccount(v.account)], ["IFSC Code", v.ifsc.toUpperCase()],
                ]} />
                <ReviewBlock title="Qualification & ID Details" onEdit={() => goTo(3)} rows={[
                  ["Education Qualification", v.qualification], ["Aadhaar Number", maskAadhaar(v.aadhaar)],
                  ["PAN Number", v.pan ? v.pan.toUpperCase() : "Not provided (optional)"],
                ]} />
                <UploadedDocs
                  onEdit={() => goTo(3)}
                  docs={[
                    { label: "Aadhaar Card", name: v.aadhaarDocName, url: fileUrls.aadhaarDocName, required: true },
                    { label: "PAN Card", name: v.panDocName, url: fileUrls.panDocName, required: false },
                    { label: v.bankDocType || "Bank Passbook / Cancelled Cheque", name: v.bankDocName, url: fileUrls.bankDocName, required: true },
                    { label: "Passport Size Photo", name: v.photoName, url: fileUrls.photoName, required: true, image: true },
                    { label: "Signature", name: v.signatureName, url: fileUrls.signatureName, required: true, image: true },
                  ]}
                />
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
            <span className="hidden items-center gap-1.5 text-xs text-muted sm:flex"><ShieldCheck className="size-3.5" /> Progress is saved on this device (except account &amp; Aadhaar numbers).</span>
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

function digitsOnly(e: React.ChangeEvent<HTMLInputElement>) {
  e.target.value = e.target.value.replace(/\D/g, "");
}

const samplePhotoSvg = () =>
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 150'><rect width='120' height='150' fill='#e9effb'/><circle cx='60' cy='58' r='26' fill='#1c3f94'/><rect x='22' y='94' width='76' height='60' rx='30' fill='#1c3f94'/></svg>`;
const sampleSignatureSvg = () =>
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 80'><rect width='240' height='80' fill='#fff'/><path d='M14 56c18-30 30-38 36-26s-10 30 4 22 22-40 30-30-6 28 8 24 18-26 28-20 2 20 14 18 20-14 30-12 20 8 60-6' fill='none' stroke='#1a2b6b' stroke-width='3' stroke-linecap='round'/></svg>`;
const svgDataUrl = (svg: string) => "data:image/svg+xml;base64," + btoa(svg);
const svgBlob = (svg: string) => new Blob([svg], { type: "image/svg+xml" });
/** Placeholder "document" used by Fill sample data, so View works in the demo. */
const sampleDoc = (title: string) =>
  svgBlob(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 260'><rect width='420' height='260' rx='16' fill='#f5f7fa' stroke='#1c3f94' stroke-width='3'/><rect width='420' height='54' rx='16' fill='#1c3f94'/><text x='24' y='36' font-family='Arial' font-size='20' fill='#fff' font-weight='bold'>${title}</text><text x='24' y='120' font-family='Arial' font-size='16' fill='#5d6b7a'>Demo placeholder – upload the real document</text><text x='24' y='150' font-family='Arial' font-size='16' fill='#5d6b7a'>when registering.</text></svg>`,
  );

function Section({ title, optional, children }: { title: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-xl border border-line p-4 sm:p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary">
        {title}
        {optional && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-muted">Optional</span>}
      </h3>
      {children}
    </div>
  );
}

function Missing({ label, className }: { label: string; className?: string }) {
  return <div className={cn("grid place-items-center rounded-lg border-2 border-dashed border-danger/50 bg-danger-soft/40 text-xs text-danger", className)}>No {label}</div>;
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

function UploadedDocs({
  docs,
  onEdit,
}: {
  docs: { label: string; name?: string; url?: string; required: boolean; image?: boolean }[];
  onEdit: () => void;
}) {
  return (
    <div className="rounded-xl border border-line">
      <div className="flex items-center justify-between rounded-t-xl border-b border-line bg-canvas px-4 py-2.5">
        <h3 className="text-sm font-semibold">Uploaded Documents</h3>
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
          <Pencil className="size-3.5" /> Edit
        </button>
      </div>
      <ul className="divide-y divide-line">
        {docs.map((d) => {
          const Icon = d.image ? ImageIcon : FileText;
          return (
            <li key={d.label} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", d.name ? "bg-success-soft text-success" : "bg-slate-100 text-muted")}>
                <Icon className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-navy">{d.label}</p>
                <p className={cn("truncate text-xs", d.name ? "text-success" : d.required ? "text-danger" : "text-muted")}>
                  {d.name ? `✓ ${d.name}` : d.required ? "Not uploaded" : "Not provided (optional)"}
                </p>
              </div>
              {d.url && (
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-soft"
                >
                  <ExternalLink className="size-3.5" /> View
                </a>
              )}
            </li>
          );
        })}
      </ul>
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

function ReviewBlock({ title, rows, onEdit, className }: { title: string; rows: [string, string][]; onEdit: () => void; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-line", className)}>
      <div className="flex items-center justify-between rounded-t-xl border-b border-line bg-canvas px-4 py-2.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
          <Pencil className="size-3.5" /> Edit
        </button>
      </div>
      <dl className="grid gap-x-6 gap-y-3 p-4 sm:grid-cols-2">
        {rows.map(([k, val]) => (
          <div key={k} className={k === "Full Address" ? "sm:col-span-2" : undefined}>
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
        <Button asChild><Link href={`/login?id=${encodeURIComponent(id)}`}><LogIn /> Go to Login</Link></Button>
      </div>
    </Card>
  );
}
