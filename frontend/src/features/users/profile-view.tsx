"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, FileText, ImageIcon, KeyRound, Landmark, Pencil, Save, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useMe } from "@/components/layout/dashboard-shell";
import { ChangePhotoButton } from "@/features/records/photo-upload";
import { useUserPhoto } from "@/features/work/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { Alert, Badge, DetailGrid, PageHeader, Skeleton } from "@/components/ui/misc";
import { authRaw } from "@/lib/api/auth";
import { openDocument, type MyProfile } from "@/lib/api/registration";
import { fmtDate, initials } from "@/lib/utils";
import { RX, zMobile, zOptionalMobile } from "@/lib/validation";
import { useChangePassword, useMyProfile, useUpdateBank, useUpdateContact } from "./hooks";

const contactSchema = z.object({
  mobile: zMobile,
  altMobile: zOptionalMobile,
  email: z.string().trim().max(80).email("Enter a valid email ID"),
  address: z.string().trim().min(10, "Enter full address").max(200),
});
const bankSchema = z
  .object({
    bankName: z.string().trim().min(3, "Required").max(60),
    holder: z.string().trim().min(3, "Required").max(60).regex(/^[A-Za-z][A-Za-z .'-]*$/, "Only letters and spaces"),
    account: z.string().regex(RX.account, "9–18 digit account number"),
    account2: z.string(),
    ifsc: z.string().trim().toUpperCase().regex(RX.ifsc, "Invalid IFSC code"),
  })
  .refine((v) => v.account === v.account2, { path: ["account2"], message: "Account numbers do not match" });
const pwSchema = z
  .object({
    old: z.string().min(1, "Required"),
    pw: z
      .string()
      .min(8, "At least 8 characters")
      .max(72, "At most 72 characters")
      .regex(/[A-Za-z]/, "Must contain a letter")
      .regex(/\d/, "Must contain a number"),
    pw2: z.string(),
  })
  .refine((v) => v.pw === v.pw2, { path: ["pw2"], message: "Passwords do not match" });

const digits = { onChange: (e: React.ChangeEvent<HTMLInputElement>) => (e.target.value = e.target.value.replace(/\D/g, "")) };

const DOC_LABEL: Record<string, string> = {
  aadhaar: "Aadhaar Card",
  aadhaar_front: "Aadhaar Card – Front",
  aadhaar_back: "Aadhaar Card – Back",
  pan: "PAN Card",
  bank_proof: "Bank Passbook / Cancelled Cheque",
  photo: "Passport Size Photo",
  signature: "Signature",
};
const ROLE_LABEL = { deo: "Data Entry Operator", verifier: "Verifier", admin: "Super Admin" } as const;

export function ProfileView({ withBank }: { withBank?: boolean }) {
  const { data: u, isLoading, error } = useMyProfile();
  if (isLoading) return <Skeleton className="h-96" />;
  if (error || !u) return <Alert tone="red">{(error as Error)?.message ?? "Could not load your profile."}</Alert>;
  const p = u.profile;

  return (
    <>
      <PageHeader title="Profile" description={withBank ? "Your personal and banking details." : "Your account details."} />
      <div className="space-y-6">
        <Card>
          <CardHeader title="Personal details" action={<Badge tone={u.status === "active" ? "green" : "red"}>{u.status === "active" ? "Active" : "Blocked"}</Badge>} />
          <CardBody className="flex flex-col gap-6 sm:flex-row">
            <PhotoBlock u={u} />
            <DetailGrid
              className="flex-1"
              items={[
                ["Registration ID", u.id], ["Name", u.name], ["Role", ROLE_LABEL[u.role]], ["Registered on", fmtDate(u.joinedAt)],
                ...(p
                  ? ([
                      ["Father's Name", p.fatherName], ["Mother's Name", p.motherName], ["Date of Birth", fmtDate(p.dob)],
                      ["Gender", p.gender], ["Category", p.category], ["Religion", p.religion], ["Qualification", p.qualification],
                      ["Aadhaar Number", p.aadhaar], ["PAN Number", p.pan ?? "—"],
                    ] as [string, string][])
                  : []),
              ]}
            />
          </CardBody>
        </Card>
        <ContactCard u={u} />
        {withBank && p && <BankCard u={u} />}
        {u.documents.length > 0 && <DocumentsCard u={u} />}
        <PasswordCard />
      </div>
    </>
  );
}

/** Profile photo (can be changed) and signature, fetched with the access token. */
function PhotoBlock({ u }: { u: MyProfile }) {
  const { role } = useMe();
  const photo = useUserPhoto(role, u.id);
  const sign = u.documents.find((d) => d.kind === "signature");
  const { data: signUrl } = useQuery({
    queryKey: ["my-signature", sign?.id],
    enabled: !!sign,
    staleTime: Infinity,
    queryFn: async () => URL.createObjectURL(await (await authRaw(role, `/documents/${sign!.id}`)).blob()),
  });
  return (
    <div className="flex shrink-0 flex-col items-start gap-2">
      {photo.data ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo.data} alt="Photo" className="h-32 w-26 rounded-lg border border-line object-cover" />
      ) : (
        <span className="grid size-24 place-items-center rounded-full bg-primary-soft text-2xl font-bold text-primary">{initials(u.name)}</span>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {signUrl && <img src={signUrl} alt="Signature" className="h-10 w-26 rounded border border-line bg-white object-contain p-0.5" />}
      {role !== "admin" && <ChangePhotoButton />}
    </div>
  );
}

function ContactCard({ u }: { u: MyProfile }) {
  const [editing, setEditing] = useState(false);
  const update = useUpdateContact();
  const p = u.profile;
  const form = useForm<z.input<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    values: { mobile: u.mobile ?? "", altMobile: p?.altMobile ?? "", email: u.email ?? "", address: p?.address ?? "" },
  });
  const e = form.formState.errors;
  const save = form.handleSubmit((v) =>
    update.mutate(v, {
      onSuccess: () => { toast.success("Contact details updated."); setEditing(false); },
      onError: (err) => form.setError(/email/i.test(err.message) ? "email" : "mobile", { message: err.message }),
    }),
  );
  return (
    <Card>
      <CardHeader title="Contact details" action={!editing && p && <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil /> Edit</Button>} />
      <CardBody>
        {!editing ? (
          <DetailGrid
            items={[
              ["Mobile Number", u.mobile ?? "—"], ["Alternate Mobile", p?.altMobile ?? "—"], ["Email ID", u.email ?? "—"],
              ...(p
                ? ([
                    ["State / District", `${p.state} / ${p.district}`], ["Sub District", p.subDistrict],
                    ["Post Office / PIN", `${p.postOffice} / ${p.pincode}`], ["Police Station", p.policeStation], ["Full Address", p.address],
                  ] as [string, string][])
                : []),
            ]}
          />
        ) : (
          <form onSubmit={save} noValidate className="grid gap-4 sm:grid-cols-2">
            <Field label="Mobile Number" htmlFor="c-mobile" error={e.mobile?.message}><Input id="c-mobile" maxLength={10} {...form.register("mobile", digits)} /></Field>
            <Field label="Alternate Mobile" htmlFor="c-alt" error={e.altMobile?.message}><Input id="c-alt" maxLength={10} {...form.register("altMobile", digits)} /></Field>
            <Field className="sm:col-span-2" label="Email ID" htmlFor="c-email" error={e.email?.message}><Input id="c-email" type="email" {...form.register("email")} /></Field>
            <Field className="sm:col-span-2" label="Full Address" htmlFor="c-address" error={e.address?.message}><Textarea id="c-address" {...form.register("address")} /></Field>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={update.isPending}><Save /> Save</Button>
              <Button type="button" variant="light" onClick={() => { form.reset(); setEditing(false); }}><X /> Cancel</Button>
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  );
}

function BankCard({ u }: { u: MyProfile }) {
  const [editing, setEditing] = useState(false);
  const update = useUpdateBank();
  const b = u.profile!.bank;
  const form = useForm<z.input<typeof bankSchema>>({
    resolver: zodResolver(bankSchema),
    defaultValues: { bankName: b.bankName, holder: b.accountHolder, account: "", account2: "", ifsc: b.ifsc },
  });
  const e = form.formState.errors;
  const save = form.handleSubmit((v) =>
    update.mutate(
      { bankName: v.bankName, accountHolder: v.holder.toUpperCase(), accountNumber: v.account, ifsc: v.ifsc.toUpperCase() },
      {
        onSuccess: () => { toast.success("Bank details updated."); setEditing(false); form.reset({ ...v, account: "", account2: "" }); },
        onError: (err) => toast.error(err.message),
      },
    ),
  );
  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><Landmark className="size-4 text-primary" /> Banking details</span>} action={!editing && <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil /> Update</Button>} />
      <CardBody>
        {!editing ? (
          <DetailGrid items={[["Bank Name", b.bankName], ["Account Holder Name", b.accountHolder], ["Account Number", b.account], ["IFSC Code", b.ifsc], ["Bank Proof", b.proofType]]} />
        ) : (
          <form onSubmit={save} noValidate className="grid gap-4 sm:grid-cols-2">
            <Field label="Bank Name" htmlFor="b-bank" error={e.bankName?.message}><Input id="b-bank" {...form.register("bankName")} /></Field>
            <Field label="Account Holder Name" htmlFor="b-holder" error={e.holder?.message}><Input id="b-holder" className="uppercase" {...form.register("holder")} /></Field>
            <Field label="Account Number" htmlFor="b-acc" error={e.account?.message}><Input id="b-acc" type="password" inputMode="numeric" autoComplete="off" maxLength={18} {...form.register("account", digits)} /></Field>
            <Field label="Confirm Account Number" htmlFor="b-acc2" error={e.account2?.message}><Input id="b-acc2" inputMode="numeric" autoComplete="off" maxLength={18} {...form.register("account2", digits)} /></Field>
            <Field label="IFSC Code" htmlFor="b-ifsc" error={e.ifsc?.message}><Input id="b-ifsc" className="uppercase" maxLength={11} {...form.register("ifsc")} /></Field>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={update.isPending}><Save /> Save bank details</Button>
              <Button type="button" variant="light" onClick={() => setEditing(false)}><X /> Cancel</Button>
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  );
}

function DocumentsCard({ u }: { u: MyProfile }) {
  const { role } = useMe();
  const order = ["aadhaar", "aadhaar_front", "aadhaar_back", "pan", "bank_proof", "photo", "signature"];
  const docs = [...u.documents].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  return (
    <Card>
      <CardHeader title="Uploaded documents" />
      <ul className="divide-y divide-line">
        {docs.map((d) => {
          const Icon = d.mimeType.startsWith("image/") ? ImageIcon : FileText;
          return (
            <li key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-success-soft text-success"><Icon className="size-[18px]" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-navy">{DOC_LABEL[d.kind] ?? d.kind}</p>
                <p className="truncate text-xs text-muted">{d.fileName} · {(d.size / 1024).toFixed(0)} KB</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openDocument(role, d.id).catch((e) => toast.error((e as Error).message))}
              >
                <ExternalLink /> View
              </Button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function PasswordCard() {
  const { role } = useMe();
  const change = useChangePassword(role);
  const form = useForm<z.input<typeof pwSchema>>({ resolver: zodResolver(pwSchema), defaultValues: { old: "", pw: "", pw2: "" } });
  const e = form.formState.errors;
  const save = form.handleSubmit((v) =>
    change.mutate(
      { old: v.old, pw: v.pw },
      {
        onSuccess: () => { toast.success("Password changed. You have been logged out on all other devices."); form.reset(); },
        onError: (err) => form.setError("old", { message: err.message }),
      },
    ),
  );
  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><KeyRound className="size-4 text-primary" /> Change password</span>} />
      <form onSubmit={save} noValidate className="grid gap-4 p-5 sm:grid-cols-3">
        <Field label="Current password" htmlFor="pw-old" error={e.old?.message}><Input id="pw-old" type="password" autoComplete="current-password" {...form.register("old")} /></Field>
        <Field label="New password" htmlFor="pw-new" error={e.pw?.message}><Input id="pw-new" type="password" autoComplete="new-password" {...form.register("pw")} /></Field>
        <Field label="Confirm new password" htmlFor="pw-new2" error={e.pw2?.message}><Input id="pw-new2" type="password" autoComplete="new-password" {...form.register("pw2")} /></Field>
        <div className="sm:col-span-3"><Button type="submit" disabled={change.isPending}>Change password</Button></div>
      </form>
    </Card>
  );
}
