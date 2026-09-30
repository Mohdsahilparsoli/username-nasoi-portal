"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, CircleCheck, ClipboardList, Copy, ExternalLink, FileText, ImageIcon, Info, KeyRound, LogIn, Pencil, Send, ShieldCheck, UserCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileUpload } from "@/components/ui/file-upload";
import { ChoiceGroup, Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { DistrictOptions, StateOptions } from "@/components/ui/location-options";
import { Alert } from "@/components/ui/misc";
import { AuthError } from "@/lib/api/auth";
import { submitRegistration, uploadDocument, type DocumentKind, type RegistrationPayload, type UploadRef } from "@/lib/api/registration";
import { CATEGORIES, COUNTRIES, GENDERS, QUALIFICATIONS, RELIGIONS } from "@/lib/constants";
import { cn, fmtDate, maskAccount } from "@/lib/utils";
import { BANK_DOC_TYPES, EMPTY_FORM, maskAadhaar, PASSWORD_HINT, REGISTER_AS, STEP_SCHEMAS, STEPS, type RegistrationForm } from "./schema";

const DRAFT_KEY = "nasoi_registration_draft_v5";

/** Uploaded files: sent to the server as soon as they are chosen; kept in memory for "View". */
type DocKey = "aadhaarDocName" | "panDocName" | "bankDocName" | "photoName" | "signatureName";
const DOC_KIND: Record<DocKey, DocumentKind> = {
  aadhaarDocName: "aadhaar",
  panDocName: "pan",
  bankDocName: "bank_proof",
  photoName: "photo",
  signatureName: "signature",
};
/** Longest side (px) images are reduced to before upload. */
const MAX_SIDE: Record<DocKey, number> = { aadhaarDocName: 1800, panDocName: 1800, bankDocName: 1800, photoName: 600, signatureName: 800 };
const IMG = "image/png,image/jpeg,.png,.jpg,.jpeg";
const DOC = ".pdf,application/pdf,image/png,image/jpeg,.png,.jpg,.jpeg";
const MAX_BYTES = 2 * 1024 * 1024;

/** Where each server field lives in the form: [step, form field]. */
const SERVER_FIELD: Record<string, [number, keyof RegistrationForm]> = {
  role: [0, "role"], name: [0, "name"], fatherName: [0, "fatherName"], motherName: [0, "motherName"], dob: [0, "dob"],
  email: [0, "email"], mobile: [0, "mobile"], gender: [0, "gender"], category: [0, "category"], religion: [0, "religion"],
  country: [1, "country"], state: [1, "state"], district: [1, "district"], subDistrict: [1, "tehsil"], postOffice: [1, "postOffice"],
  pincode: [1, "pincode"], policeStation: [1, "policeStation"], address: [1, "address"],
  bankName: [2, "bankName"], accountHolder: [2, "holder"], accountNumber: [2, "account"], ifsc: [2, "ifsc"],
  qualification: [3, "qualification"], aadhaar: [3, "aadhaar"], pan: [3, "pan"], bankProofType: [3, "bankDocType"],
  "documents.aadhaar": [3, "aadhaarDocName"], "documents.pan": [3, "panDocName"], "documents.bank_proof": [3, "bankDocName"],
  "documents.photo": [3, "photoName"], "documents.signature": [3, "signatureName"],
  password: [4, "password"], declaration: [4, "declare"], terms: [4, "terms"],
};
const CODE_FIELD: Record<string, string> = { DUPLICATE_MOBILE: "mobile", DUPLICATE_EMAIL: "email", DUPLICATE_AADHAAR: "aadhaar" };

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("This image could not be read. Please choose another file."));
    img.src = URL.createObjectURL(file);
  });
}

/** Draws an image on white, scaled so its longest side is at most `side` px. */
function draw(img: HTMLImageElement, side: number) {
  const scale = Math.min(1, side / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.width * scale));
  c.height = Math.max(1, Math.round(img.height * scale));
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

/** Images are resized and saved as JPEG (small, fast upload); PDFs are sent as they are. */
async function prepareFile(file: File, key: DocKey): Promise<{ blob: Blob; name: string; thumb?: string }> {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (isPdf) {
    if (file.size > MAX_BYTES) throw new Error("PDF must be under 2 MB.");
    return { blob: file, name: file.name };
  }
  const img = await loadImage(file);
  try {
    const canvas = draw(img, MAX_SIDE[key]);
    let blob: Blob | null = null;
    for (const q of [0.85, 0.7, 0.55]) {
      blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
      if (blob && blob.size <= MAX_BYTES) break;
    }
    if (!blob || blob.size > MAX_BYTES) throw new Error("Image is too large. Please choose a smaller file.");
    const thumb = key === "photoName" || key === "signatureName" ? draw(img, key === "photoName" ? 240 : 360).toDataURL("image/jpeg", 0.82) : undefined;
    return { blob, name: file.name.replace(/\.[^.]*$/, "") + ".jpg", thumb };
  } finally {
    URL.revokeObjectURL(img.src);
  }
}

export function RegisterWizard() {
  const params = useSearchParams();
  const [step, setStep] = useState(0);
  const stepRef = useRef(0);
  stepRef.current = step;
  const [done, setDone] = useState<{ id: string; role: "deo" | "verifier"; name: string } | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [fileUrls, setFileUrls] = useState<Partial<Record<DocKey, string>>>({});
  const [uploads, setUploads] = useState<Partial<Record<DocKey, UploadRef>>>({});
  const topRef = useRef<HTMLDivElement>(null);

  // Validate only the current step's schema.
  const resolver: Resolver<RegistrationForm> = (values, ctx, opts) =>
    zodResolver(STEP_SCHEMAS[stepRef.current] as never)(values, ctx, opts as never) as never;

  // Errors appear when "Next" is pressed, then update live while the user fixes them.
  const form = useForm<RegistrationForm>({ resolver, defaultValues: EMPTY_FORM, mode: "onSubmit", reValidateMode: "onChange" });
  const { register, formState: { errors }, watch, setValue, getValues, reset, setError } = form;
  const v = watch();

  // Restore draft once (or pre-select the role from ?as=verifier), then keep saving while the user types.
  useEffect(() => {
    const as = params.get("as");
    const preset = as === "verifier" || as === "deo" ? as : undefined;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as { values: RegistrationForm; step: number };
        // Files, passwords, Aadhaar and account numbers are never kept in a draft.
        reset({
          ...EMPTY_FORM, ...d.values, ...(preset ? { role: preset } : {}),
          account: "", account2: "", aadhaar: "", password: "", password2: "",
          aadhaarDocName: "", panDocName: "", bankDocName: "", photoName: "", photo: "", signatureName: "", signature: "",
        });
        setStep(Math.min(d.step, STEPS.length - 1));
        setDraftLoaded(true);
        return;
      }
    } catch { /* ignore broken draft */ }
    if (preset) setValue("role", preset);
  }, [reset, setValue, params]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/incompatible-library
    const sub = watch((values) => {
      const { account: _a, account2: _b, aadhaar: _c, password: _d, password2: _e, ...safe } = values as RegistrationForm;
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

  /** Compress (images), upload to the server, and keep a local copy for "View". */
  const attach = async (key: DocKey, file: File) => {
    try {
      const prepared = await prepareFile(file, key);
      const ref = await uploadDocument(DOC_KIND[key], prepared.blob, prepared.name);
      setUploads((prev) => ({ ...prev, [key]: ref }));
      setFileUrls((prev) => {
        if (prev[key]) URL.revokeObjectURL(prev[key]!);
        return { ...prev, [key]: URL.createObjectURL(prepared.blob) };
      });
      if (key === "photoName") setValue("photo", prepared.thumb ?? "");
      if (key === "signatureName") setValue("signature", prepared.thumb ?? "");
      setValue(key, file.name, { shouldValidate: true });
    } catch (e) {
      toast.error((e as Error).message || "Upload failed. Please try again.");
    }
  };
  const detach = (key: DocKey) => {
    setFileUrls((prev) => {
      if (prev[key]) URL.revokeObjectURL(prev[key]!);
      const nextUrls = { ...prev };
      delete nextUrls[key];
      return nextUrls;
    });
    setUploads((prev) => {
      const nextRefs = { ...prev };
      delete nextRefs[key];
      return nextRefs;
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

  /** Show a server-side problem on the right field and open its step. */
  const showServerError = (e: unknown) => {
    const err = e instanceof AuthError ? e : null;
    const path = err?.fields?.[0]?.path ?? (err ? CODE_FIELD[err.code] : undefined);
    const target = path ? SERVER_FIELD[path] : undefined;
    if (err?.code === "BAD_DOCUMENT") {
      // An upload expired or was already used: ask for all documents again.
      (Object.keys(DOC_KIND) as DocKey[]).forEach(detach);
      goTo(3);
    } else if (target) {
      goTo(target[0]);
      setTimeout(() => setError(target[1], { message: err!.fields?.[0]?.message ?? err!.message }), 50);
    }
    toast.error(err?.message ?? (e as Error).message ?? "Registration failed. Please try again.");
  };

  const submit = useMutation({
    mutationFn: async (values: RegistrationForm) => {
      // Final safety check: every step must be valid.
      for (let i = 0; i < STEP_SCHEMAS.length; i++) {
        if (!STEP_SCHEMAS[i].safeParse(values).success) {
          goTo(i);
          throw new Error(`Please complete "${STEPS[i].title}".`);
        }
      }
      const need: DocKey[] = ["aadhaarDocName", "bankDocName", "photoName", "signatureName", ...(values.pan ? (["panDocName"] as DocKey[]) : [])];
      const missing = need.find((k) => !uploads[k]);
      if (missing) {
        goTo(3);
        detach(missing);
        throw new Error("Please upload the highlighted document again.");
      }
      const payload: RegistrationPayload = {
        role: values.role,
        name: values.name.trim(), fatherName: values.fatherName.trim(), motherName: values.motherName.trim(),
        dob: values.dob, email: values.email.trim(), mobile: values.mobile,
        gender: values.gender, category: values.category, religion: values.religion,
        country: values.country, state: values.state, district: values.district, subDistrict: values.tehsil.trim(),
        postOffice: values.postOffice.trim(), pincode: values.pincode, policeStation: values.policeStation.trim(), address: values.address.trim(),
        bankName: values.bankName.trim(), accountHolder: values.holder.trim(), accountNumber: values.account, ifsc: values.ifsc.trim().toUpperCase(),
        qualification: values.qualification, aadhaar: values.aadhaar, pan: values.pan ? values.pan.toUpperCase() : undefined,
        bankProofType: values.bankDocType,
        documents: {
          aadhaar: uploads.aadhaarDocName!,
          ...(values.pan ? { pan: uploads.panDocName! } : {}),
          bank_proof: uploads.bankDocName!,
          photo: uploads.photoName!,
          signature: uploads.signatureName!,
        },
        password: values.password, declaration: true, terms: true,
      };
      return submitRegistration(payload);
    },
    onSuccess: ({ user }) => {
      localStorage.removeItem(DRAFT_KEY);
      setDone({ id: user.id, role: user.role, name: user.name });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: showServerError,
  });

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
          {v.role && (
            <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
              Registering as {v.role === "deo" ? "Data Entry Operator" : "Verifier"}
            </span>
          )}
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
              <Alert tone="blue" icon={Info}>Your saved draft has been restored. Bank account and Aadhaar numbers, password and uploaded documents are not saved – please enter / upload them again.</Alert>
            )}

            {/* STEP 1 – Personal */}
            {step === 0 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <fieldset className="sm:col-span-2">
                  <legend className="mb-2 text-sm font-semibold text-navy">Register as <span className="text-danger">*</span></legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {REGISTER_AS.map((r) => {
                      const Icon = r.value === "deo" ? ClipboardList : UserCheck;
                      return (
                        <label
                          key={r.value}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-xl border-2 bg-white p-4 transition hover:border-primary/60 has-[:checked]:border-primary has-[:checked]:bg-primary-soft/50",
                            err("role") ? "border-danger" : "border-line",
                          )}
                        >
                          <input type="radio" value={r.value} className="mt-1 size-4 shrink-0 accent-[var(--color-primary)]" {...register("role")} />
                          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><Icon className="size-5" /></span>
                          <span>
                            <b className="block text-sm text-navy">{r.label}</b>
                            <span className="text-xs text-muted">{r.hint}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {err("role") && <p className="mt-1 text-xs text-danger">{err("role")}</p>}
                </fieldset>
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
                      hint="Front and back in one file · JPG, PNG or PDF (PDF max 2 MB)"
                      maxMb={10}
                      maxPdfMb={2}
                      invalid={!!err("aadhaarDocName")}
                      viewUrl={fileUrls.aadhaarDocName}
                      onFile={(f) => attach("aadhaarDocName", f)}
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
                      hint="Front side · JPG, PNG or PDF (PDF max 2 MB)"
                      maxMb={10}
                      maxPdfMb={2}
                      invalid={!!err("panDocName")}
                      viewUrl={fileUrls.panDocName}
                      onFile={(f) => attach("panDocName", f)}
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
                      hint={`${v.bankDocType === "Cancelled Cheque" ? "Cancelled cheque with your name printed" : "First page showing name & account number"} · JPG, PNG or PDF (PDF max 2 MB)`}
                      maxMb={10}
                      maxPdfMb={2}
                      invalid={!!err("bankDocName")}
                      viewUrl={fileUrls.bankDocName}
                      onFile={(f) => attach("bankDocName", f)}
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
                      hint="Recent colour photo, plain background · JPG or PNG"
                      maxMb={10}
                      invalid={!!err("photoName")}
                      viewUrl={fileUrls.photoName}
                      onFile={(f) => attach("photoName", f)}
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
                      hint="Sign in black/blue ink on white paper · JPG or PNG"
                      maxMb={10}
                      invalid={!!err("signatureName")}
                      viewUrl={fileUrls.signatureName}
                      onFile={(f) => attach("signatureName", f)}
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
                    ["Registering as", v.role === "verifier" ? "Verifier (VR)" : "Data Entry Operator (DEO)"],
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
                <div className="space-y-4 rounded-xl border border-line p-4">
                  <h3 className="flex items-center gap-2 font-semibold"><KeyRound className="size-4 text-primary" /> Create Password</h3>
                  <p className="-mt-2 text-xs text-muted">You will log in with your Registration ID, mobile number or email ID and this password.</p>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Password" htmlFor="password" required error={err("password")} hint={PASSWORD_HINT}>
                      <Input id="password" type="password" autoComplete="new-password" maxLength={72} aria-invalid={!!err("password")} {...register("password")} />
                    </Field>
                    <Field label="Confirm Password" htmlFor="password2" required error={err("password2")}>
                      <Input id="password2" type="password" autoComplete="new-password" maxLength={72} aria-invalid={!!err("password2")} {...register("password2")} />
                    </Field>
                  </div>
                </div>
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
            <span className="hidden items-center gap-1.5 text-xs text-muted sm:flex"><ShieldCheck className="size-3.5" /> Progress is saved on this device (except account &amp; Aadhaar numbers and password).</span>
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

function Success({ id, role, name }: { id: string; role: "deo" | "verifier"; name: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      toast.success("Registration ID copied.");
    } catch {
      toast.error("Copy not available – please note the ID.");
    }
  };
  const roleLabel = role === "verifier" ? "Verifier (VR)" : "Data Entry Operator (DEO)";
  return (
    <Card className="mx-auto max-w-lg p-6 text-center sm:p-8">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-success-soft text-success">
        <CircleCheck className="size-9" />
      </span>
      <h2 className="mt-4 text-2xl font-bold">Registration successful</h2>
      <p className="mt-1 text-sm text-muted">Your {roleLabel} account has been created.</p>
      <div className="mt-5 space-y-2 rounded-xl border border-success/30 bg-success-soft/60 p-4 text-left">
        {[["Registration ID", id], ["Name", name], ["Registered as", roleLabel]].map(([k, val]) => (
          <div key={k} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted">{k}</span>
            <b className={cn("text-navy", k === "Registration ID" && "font-mono text-lg")}>{val}</b>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">
        Please note your Registration ID. Log in with the Registration ID, mobile number or email ID and the password you created.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button variant="light" onClick={copy}><Copy /> Copy ID</Button>
        <Button asChild><Link href={`/login?id=${encodeURIComponent(id)}`}><LogIn /> Go to Login</Link></Button>
      </div>
    </Card>
  );
}
