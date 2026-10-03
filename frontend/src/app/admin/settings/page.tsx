"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, RotateCcw, Save, TriangleAlert } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { Alert, Badge, PageHeader, Skeleton } from "@/components/ui/misc";
import { MAIL_PLACEHOLDERS } from "@/features/files/email-dialog";
import { MeetingLinkCard } from "@/features/connect/meeting-link-card";
import { PasswordCard } from "@/features/users/profile-view";
import { useAppSettings, useSaveMailTemplate, useSaveSettings } from "@/features/verification/hooks";
import { fmtDateTime } from "@/lib/utils";

const schema = z.object({
  verifierRate: z.coerce.number({ error: "Enter the verifier rate" }).int("Enter a whole number").min(0, "Rate cannot be negative").max(1000, "Rate is too high"),
  defaultDeoRate: z.coerce.number({ error: "Enter the DEO rate" }).int("Enter a whole number").min(1, "Rate must be at least ₹1").max(1000, "Rate is too high"),
  payoutWindow: z.string().trim().min(3, "Enter the payout window").max(80, "Too long"),
});

export default function SettingsPage() {
  const settings = useAppSettings();
  const save = useSaveSettings();
  const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    values: settings.data ? { verifierRate: settings.data.verifierRate, defaultDeoRate: settings.data.defaultDeoRate, payoutWindow: settings.data.payoutWindow } : undefined,
  });
  const e = form.formState.errors;

  return (
    <>
      <PageHeader title="Settings" />
      <div className="space-y-6">
        <PasswordCard />
        <Card>
          <CardHeader
            title="Payment settings"
            action={settings.data?.updatedAt ? <span className="text-xs text-muted">Last changed {fmtDateTime(settings.data.updatedAt)}</span> : undefined}
          />
          {settings.isLoading ? (
            <div className="p-5"><Skeleton className="h-40" /></div>
          ) : settings.isError ? (
            <div className="p-5"><Alert tone="red" icon={TriangleAlert}>Could not load settings. Please refresh the page.</Alert></div>
          ) : (
            <form
              noValidate
              className="grid gap-5 p-5 sm:grid-cols-2"
              onSubmit={form.handleSubmit((v) =>
                save.mutate(v, { onSuccess: () => toast.success("Settings saved."), onError: (err) => toast.error(err.message) }),
              )}
            >
              <Field
                label="Verifier rate per verified entry (₹)"
                htmlFor="verifierRate"
                error={e.verifierRate?.message}
                hint="Paid to the verifier only when an entry is finally approved (a rejection earns nothing). Applies to new approvals."
              >
                <Input id="verifierRate" type="number" min={0} inputMode="numeric" {...form.register("verifierRate")} />
              </Field>
              <Field
                label="Default DEO rate per approved entry (₹)"
                htmlFor="defaultDeoRate"
                error={e.defaultDeoRate?.message}
                hint="Filled in when you assign new work (can be changed per assignment)."
              >
                <Input id="defaultDeoRate" type="number" min={1} inputMode="numeric" {...form.register("defaultDeoRate")} />
              </Field>
              <Field className="sm:col-span-2" label="Payout window" htmlFor="payoutWindow" error={e.payoutWindow?.message}>
                <Input id="payoutWindow" maxLength={80} {...form.register("payoutWindow")} />
              </Field>
              <div className="sm:col-span-2"><Button type="submit" disabled={save.isPending}><Save /> {save.isPending ? "Saving…" : "Save settings"}</Button></div>
            </form>
          )}
        </Card>
        <MeetingLinkCard />
        <MailTemplateCard />
      </div>
    </>
  );
}

const tplSchema = z.object({
  subject: z.string().trim().min(3, "Enter the subject").max(200, "Subject is too long (max 200)"),
  message: z.string().trim().min(10, "Enter the message").max(3000, "Message is too long (max 3000)"),
});

/** Default subject / message for every file sent on e-mail from the admin panel. */
function MailTemplateCard() {
  const settings = useAppSettings();
  const save = useSaveMailTemplate();
  const t = settings.data?.mailTemplate;
  const form = useForm<z.input<typeof tplSchema>, unknown, z.output<typeof tplSchema>>({
    resolver: zodResolver(tplSchema),
    values: t ? { subject: t.subject, message: t.message } : undefined,
  });
  const e = form.formState.errors;
  const onError = (err: Error) => toast.error(err.message);

  return (
    <Card>
      <CardHeader title="E-mail template" action={t && (t.isDefault ? <Badge tone="blue">Built-in default</Badge> : <Badge tone="green">Custom</Badge>)} />
      {!t ? (
        <div className="p-5"><Skeleton className="h-56" /></div>
      ) : (
        <form noValidate className="space-y-5 p-5" onSubmit={form.handleSubmit((v) => save.mutate(v, { onSuccess: () => toast.success("E-mail template saved."), onError }))}>
          <p className="text-sm text-muted">
            Used by default for every file sent on e-mail (All Entries, Payouts). It can still be changed in the e-mail window before sending.
          </p>
          <Field label="Subject" htmlFor="tpl-subject" required error={e.subject?.message}>
            <Input id="tpl-subject" maxLength={200} {...form.register("subject")} />
          </Field>
          <Field label="Message" htmlFor="tpl-message" required error={e.message?.message}>
            <Textarea id="tpl-message" rows={11} maxLength={3000} {...form.register("message")} />
          </Field>
          <Alert tone="blue" icon={Mail}>
            <span className="text-xs">
              Filled in automatically: {MAIL_PLACEHOLDERS.map(([k, v], i) => <span key={k}>{i ? " · " : ""}<code className="font-semibold">{k}</code> = {v}</span>)}
            </span>
          </Alert>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={save.isPending}><Save /> {save.isPending ? "Saving…" : "Save template"}</Button>
            <Button
              type="button"
              variant="light"
              disabled={save.isPending || t.isDefault}
              onClick={() => save.mutate({ reset: true }, { onSuccess: () => toast.success("Built-in template restored."), onError })}
            >
              <RotateCcw /> Restore default
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
