"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ReceiptIndianRupee } from "lucide-react";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { Alert } from "@/components/ui/misc";
import { useRecordPayment } from "@/features/work/hooks";
import { AuthError } from "@/lib/api/auth";
import { PAYMENT_MODES, type PayoutRow } from "@/lib/api/work";
import { money } from "@/lib/utils";

const todayIST = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

const schema = z
  .object({
    userId: z.string().min(1, "Select the employee"),
    amount: z.coerce.number({ error: "Enter the amount" }).int("Enter whole rupees").min(1, "Amount must be at least ₹1").max(10_000_000, "Amount is too high"),
    transactionId: z.string().trim().min(3, "Enter the transaction / UTR / cheque number").max(60).regex(/^[A-Za-z0-9][A-Za-z0-9\-/_. ]*$/, "Use letters, numbers, - / _ . only"),
    payeeName: z.string().trim().max(80).optional(),
    mode: z.string().min(1, "Select the payment mode"),
    paidOn: z.string().min(1, "Choose the payment date").refine((d) => d <= todayIST(), "Payment date cannot be in the future"),
    entriesCount: z.string().regex(/^\d*$/, "Whole number").optional(),
    periodFrom: z.string().optional(),
    periodTo: z.string().optional(),
    notes: z.string().trim().max(300).optional(),
  })
  .refine((v) => !v.periodFrom || !v.periodTo || v.periodFrom <= v.periodTo, { path: ["periodTo"], message: "End date cannot be before start date" });
type FormIn = z.input<typeof schema>;
type FormOut = z.output<typeof schema>;

/**
 * Header "Add Receipt" dialog: record a payment made to a DEO / verifier
 * (amount, transaction ID, name, mode, date, entries covered). The employee is
 * notified and sees it in their Payments list.
 */
export function AddReceiptDialog({
  open,
  onOpenChange,
  employees,
  preselect,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  employees: PayoutRow[];
  preselect?: PayoutRow | null;
}) {
  const record = useRecordPayment();
  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema),
    defaultValues: { userId: "", amount: "" as unknown as number, transactionId: "", payeeName: "", mode: "UPI", paidOn: todayIST(), entriesCount: "", periodFrom: "", periodTo: "", notes: "" },
  });
  const e = form.formState.errors;
  const userId = useWatch({ control: form.control, name: "userId" });
  const who = employees.find((x) => x.id === userId);

  // Opening for one employee: fill their details and the balance due.
  useEffect(() => {
    if (!open) return;
    form.reset({
      userId: preselect?.id ?? "",
      amount: (preselect && preselect.balance > 0 ? preselect.balance : "") as unknown as number,
      transactionId: "",
      payeeName: preselect ? preselect.bank?.accountHolder || preselect.name : "",
      mode: "UPI",
      paidOn: todayIST(),
      entriesCount: "",
      periodFrom: "",
      periodTo: "",
      notes: "",
    });
  }, [open, preselect, form]);

  const onSubmit = form.handleSubmit(async (v) => {
    try {
      const p = await record.mutateAsync({ ...v, entriesCount: v.entriesCount || undefined, periodFrom: v.periodFrom || undefined, periodTo: v.periodTo || undefined });
      toast.success(`${p.id}: ${money(p.amount)} recorded for ${p.user?.name ?? p.userId}.`, { description: "The employee has been notified." });
      onOpenChange(false);
    } catch (err) {
      if (err instanceof AuthError && err.fields?.length) err.fields.forEach((f) => form.setError(f.path as keyof FormIn, { message: f.message }));
      else toast.error((err as Error).message);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Add receipt"
        description="Record a payment made to a Data Entry Operator or Verifier."
        className="w-[min(720px,calc(100%-24px))]"
        footer={
          <>
            <DialogClose asChild><Button variant="light">Cancel</Button></DialogClose>
            <Button onClick={onSubmit} disabled={record.isPending}><ReceiptIndianRupee /> {record.isPending ? "Saving…" : "Save receipt"}</Button>
          </>
        }
      >
        <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2" label="Employee" htmlFor="userId" required error={e.userId?.message}>
            <Select
              id="userId"
              aria-invalid={!!e.userId}
              {...form.register("userId", {
                onChange: (ev) => {
                  const x = employees.find((y) => y.id === ev.target.value);
                  form.setValue("payeeName", x ? x.bank?.accountHolder || x.name : "");
                  if (x && x.balance > 0) form.setValue("amount", x.balance);
                },
              })}
            >
              <option value="">-- Select employee --</option>
              {employees.map((x) => (
                <option key={x.id} value={x.id}>{x.id} – {x.name} · balance {money(x.balance)}</option>
              ))}
            </Select>
          </Field>
          {who && (
            <Alert tone="blue" className="sm:col-span-2">
              Earned <b>{money(who.earned)}</b> · paid <b>{money(who.paid)}</b> · balance <b>{money(who.balance)}</b>
              {who.bank && <> · {who.bank.bankName}, {who.bank.account}, IFSC {who.bank.ifsc}</>}
            </Alert>
          )}
          <Field label="Amount paid (₹)" htmlFor="amount" required error={e.amount?.message}>
            <Input id="amount" type="number" min={1} inputMode="numeric" aria-invalid={!!e.amount} {...form.register("amount")} />
          </Field>
          <Field label="Transaction ID / UTR / Cheque no." htmlFor="transactionId" required error={e.transactionId?.message}>
            <Input id="transactionId" maxLength={60} aria-invalid={!!e.transactionId} {...form.register("transactionId")} />
          </Field>
          <Field label="Paid to (name)" htmlFor="payeeName" error={e.payeeName?.message} hint="Account holder name (or employee name); filled automatically">
            <Input id="payeeName" maxLength={80} {...form.register("payeeName")} />
          </Field>
          <Field label="Payment mode" htmlFor="mode" required error={e.mode?.message}>
            <Select id="mode" {...form.register("mode")}>
              {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
            </Select>
          </Field>
          <Field label="Paid on" htmlFor="paidOn" required error={e.paidOn?.message}>
            <Input id="paidOn" type="date" max={todayIST()} {...form.register("paidOn")} />
          </Field>
          <Field label="Entries covered" htmlFor="entriesCount" error={e.entriesCount?.message} hint="How many entries this payment is for">
            <Input id="entriesCount" inputMode="numeric" maxLength={7} {...form.register("entriesCount")} />
          </Field>
          <Field label="Period from" htmlFor="periodFrom" error={e.periodFrom?.message}>
            <Input id="periodFrom" type="date" {...form.register("periodFrom")} />
          </Field>
          <Field label="Period to" htmlFor="periodTo" error={e.periodTo?.message}>
            <Input id="periodTo" type="date" {...form.register("periodTo")} />
          </Field>
          <Field className="sm:col-span-2" label="Notes" htmlFor="notes" error={e.notes?.message}>
            <Textarea id="notes" maxLength={300} placeholder="e.g. October 2026 payment" {...form.register("notes")} />
          </Field>
        </form>
      </DialogContent>
    </Dialog>
  );
}
