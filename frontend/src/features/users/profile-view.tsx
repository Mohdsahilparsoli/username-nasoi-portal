"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Landmark, Pencil, Save, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { Badge, DetailGrid, PageHeader, Skeleton } from "@/components/ui/misc";
import { RX, zMobile, zOptionalMobile } from "@/lib/validation";
import { maskAadhaar } from "@/features/registration/schema";
import { fmtDate, initials, maskAccount } from "@/lib/utils";
import type { User } from "@/types";
import { useChangePassword, useUpdateUser, useUser } from "./hooks";

const contactSchema = z.object({
  mobile: zMobile,
  altMobile: zOptionalMobile,
  email: z.string().trim().email("Enter a valid email"),
  address: z.string().trim().min(10, "Enter full address"),
});
const bankSchema = z
  .object({
    bankName: z.string().trim().min(3, "Required"),
    holder: z.string().trim().min(3, "Required"),
    account: z.string().regex(RX.account, "9–18 digit account number"),
    account2: z.string(),
    ifsc: z.string().trim().toUpperCase().regex(RX.ifsc, "Invalid IFSC code"),
  })
  .refine((v) => v.account === v.account2, { path: ["account2"], message: "Account numbers do not match" });
const pwSchema = z
  .object({
    old: z.string().min(1, "Required"),
    pw: z.string().regex(RX.password, "Min 6 characters, letters + numbers"),
    pw2: z.string(),
  })
  .refine((v) => v.pw === v.pw2, { path: ["pw2"], message: "Passwords do not match" });

const digits = { onChange: (e: React.ChangeEvent<HTMLInputElement>) => (e.target.value = e.target.value.replace(/\D/g, "")) };

export function ProfileView({ userId, withBank }: { userId: string; withBank?: boolean }) {
  const { data: u, isLoading } = useUser(userId);
  if (isLoading || !u) return <Skeleton className="h-96" />;

  return (
    <>
      <PageHeader title="Profile" description={withBank ? "Your personal and banking details." : "Your account details."} />
      <div className="space-y-6">
        <Card>
          <CardHeader title="Personal details" action={<Badge tone={u.status === "active" ? "green" : "red"}>{u.status === "active" ? "Active" : "Blocked"}</Badge>} />
          <CardBody className="flex flex-col gap-6 sm:flex-row">
            {u.photo ? (
              <div className="flex shrink-0 flex-col gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u.photo} alt="" className="h-32 w-26 rounded-lg border border-line object-cover" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {u.signature && <img src={u.signature} alt="Signature" className="h-10 w-26 rounded border border-line bg-white object-contain p-0.5" />}
              </div>
            ) : (
              <span className="grid size-24 shrink-0 place-items-center rounded-full bg-primary-soft text-2xl font-bold text-primary">{initials(u.name)}</span>
            )}
            <DetailGrid
              className="flex-1"
              items={[
                ["Registration ID", u.id], ["Name", u.name], ["Father's Name", u.fatherName], ["Mother's Name", u.motherName],
                ["Date of Birth", fmtDate(u.dob)], ["Gender", u.gender], ["Category", u.category], ["Qualification", u.qualification],
                ["Religion", u.religion], ["Aadhaar Number", maskAadhaar(u.aadhaar)], ["Registered on", fmtDate(u.joinedAt)],
              ]}
            />
          </CardBody>
        </Card>
        <ContactCard u={u} />
        {withBank && <BankCard u={u} />}
        <PasswordCard userId={u.id} />
      </div>
    </>
  );
}

function ContactCard({ u }: { u: User }) {
  const [editing, setEditing] = useState(false);
  const update = useUpdateUser(u.id);
  const form = useForm<z.input<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    values: { mobile: u.mobile, altMobile: u.altMobile ?? "", email: u.email, address: u.address ?? "" },
  });
  const e = form.formState.errors;
  const save = form.handleSubmit((v) =>
    update.mutate(v, {
      onSuccess: () => { toast.success("Contact details updated."); setEditing(false); },
      onError: (err) => form.setError("mobile", { message: err.message }),
    }),
  );
  return (
    <Card>
      <CardHeader title="Contact details" action={!editing && <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil /> Edit</Button>} />
      <CardBody>
        {!editing ? (
          <DetailGrid
            items={[
              ["Mobile Number", u.mobile], ["Alternate Mobile", u.altMobile], ["Email ID", u.email],
              ["State / District", [u.state, u.district].filter(Boolean).join(" / ")], ["Sub District", u.tehsil],
              ["Post Office / PIN", [u.postOffice, u.pincode].filter(Boolean).join(" / ")], ["Police Station", u.policeStation],
              ["Full Address", u.address],
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

function BankCard({ u }: { u: User }) {
  const [editing, setEditing] = useState(false);
  const update = useUpdateUser(u.id);
  const form = useForm<z.input<typeof bankSchema>>({
    resolver: zodResolver(bankSchema),
    defaultValues: { bankName: u.bank?.bankName ?? "", holder: u.bank?.holder ?? "", account: "", account2: "", ifsc: u.bank?.ifsc ?? "" },
  });
  const e = form.formState.errors;
  const save = form.handleSubmit((v) =>
    update.mutate(
      { bank: { bankName: v.bankName, holder: v.holder.toUpperCase(), account: v.account, ifsc: v.ifsc.toUpperCase() } },
      { onSuccess: () => { toast.success("Bank details updated."); setEditing(false); form.reset({ ...v, account: "", account2: "" }); } },
    ),
  );
  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><Landmark className="size-4 text-primary" /> Banking details</span>} action={!editing && <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil /> Update</Button>} />
      <CardBody>
        {!editing ? (
          <DetailGrid items={[["Bank Name", u.bank?.bankName], ["Account Holder Name", u.bank?.holder], ["Account Number", maskAccount(u.bank?.account)], ["IFSC Code", u.bank?.ifsc], ...(u.bankDocName ? ([[`Bank Proof (${u.bankDocType})`, u.bankDocName]] as [string, string][]) : [])]} />
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

function PasswordCard({ userId }: { userId: string }) {
  const change = useChangePassword(userId);
  const form = useForm<z.input<typeof pwSchema>>({ resolver: zodResolver(pwSchema), defaultValues: { old: "", pw: "", pw2: "" } });
  const e = form.formState.errors;
  const save = form.handleSubmit((v) =>
    change.mutate(
      { old: v.old, pw: v.pw },
      {
        onSuccess: () => { toast.success("Password changed successfully."); form.reset(); },
        onError: (err) => form.setError("old", { message: err.message }),
      },
    ),
  );
  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><KeyRound className="size-4 text-primary" /> Change password</span>} />
      <form onSubmit={save} noValidate className="grid gap-4 p-5 sm:grid-cols-3">
        <Field label="Current password" htmlFor="pw-old" error={e.old?.message}><Input id="pw-old" type="password" {...form.register("old")} /></Field>
        <Field label="New password" htmlFor="pw-new" error={e.pw?.message}><Input id="pw-new" type="password" {...form.register("pw")} /></Field>
        <Field label="Confirm new password" htmlFor="pw-new2" error={e.pw2?.message}><Input id="pw-new2" type="password" {...form.register("pw2")} /></Field>
        <div className="sm:col-span-3"><Button type="submit" disabled={change.isPending}>Change password</Button></div>
      </form>
    </Card>
  );
}
