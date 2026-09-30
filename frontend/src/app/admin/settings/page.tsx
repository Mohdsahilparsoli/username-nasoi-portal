"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { RefreshCw, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useMe } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form-controls";
import { PageHeader, Skeleton } from "@/components/ui/misc";
import { useResetDemo, useSettings, useUpdateSettings } from "@/features/settings/hooks";
import { PasswordCard } from "@/features/users/profile-view";
import { useSessionStore } from "@/stores/session-store";

const schema = z.object({
  rate: z.coerce.number().min(1, "Enter a rate above 0").max(1000),
  payoutWindow: z.string().trim().min(3, "Required"),
});

export default function SettingsPage() {
  const me = useMe();
  const settings = useSettings();
  const update = useUpdateSettings();
  const reset = useResetDemo();
  const signOutAll = useSessionStore((s) => s.signOutAll);
  const signIn = useSessionStore((s) => s.signIn);
  const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    values: settings.data ? { rate: settings.data.rate, payoutWindow: settings.data.payoutWindow } : undefined,
  });
  const e = form.formState.errors;

  if (settings.isLoading) return <Skeleton className="h-72" />;

  return (
    <>
      <PageHeader title="Settings" />
      <div className="space-y-6">
        <PasswordCard />
        <Card>
          <CardHeader title="Payment settings" />
          <form
            noValidate
            className="grid gap-5 p-5 sm:grid-cols-2"
            onSubmit={form.handleSubmit((v) => update.mutate(v, { onSuccess: () => toast.success("Settings saved.") }))}
          >
            <Field label="Default rate per approved entry (₹)" htmlFor="rate" error={e.rate?.message} hint="Used as the default for new assignments.">
              <Input id="rate" type="number" min={1} {...form.register("rate")} />
            </Field>
            <Field label="Payout window" htmlFor="payoutWindow" error={e.payoutWindow?.message}>
              <Input id="payoutWindow" {...form.register("payoutWindow")} />
            </Field>
            <div className="sm:col-span-2"><Button type="submit" disabled={update.isPending}><Save /> Save settings</Button></div>
          </form>
        </Card>
        <Card>
          <CardHeader title="Demo data" />
          <CardBody>
            <p className="mb-4 text-sm text-muted">
              Until the backend is connected, all data lives in this browser. Reset to restore the original sample operators, assignments and entries.
            </p>
            <Button
              variant="danger"
              disabled={reset.isPending}
              onClick={() => {
                if (!confirm("Reset all demo data? New registrations and entries will be removed.")) return;
                reset.mutate(undefined, {
                  onSuccess: () => {
                    signOutAll();
                    signIn("admin", { id: me.id, name: me.name });
                    toast.success("Demo data reset.");
                  },
                });
              }}
            >
              <RefreshCw /> Reset demo data
            </Button>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
