"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save, TriangleAlert } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form-controls";
import { Alert, PageHeader, Skeleton } from "@/components/ui/misc";
import { PasswordCard } from "@/features/users/profile-view";
import { useAppSettings, useSaveSettings } from "@/features/verification/hooks";
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
                hint="Paid to the verifier for every entry approved or rejected. Applies to new verifications."
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
      </div>
    </>
  );
}
