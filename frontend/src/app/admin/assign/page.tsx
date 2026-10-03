"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Send, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { DistrictOptions, StateOptions } from "@/components/ui/location-options";
import { Alert, PageHeader, Skeleton } from "@/components/ui/misc";
import { useAppSettings } from "@/features/verification/hooks";
import { useCreateWork, useOperators, useVerifiers } from "@/features/work/hooks";
import { AuthError } from "@/lib/api/auth";
import type { OperatorRow } from "@/lib/api/work";
import { ACTIVE_TASK_TYPES, TASK_TYPES } from "@/lib/constants";

function todayIST() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}
function in30Days() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
}

const schema = z.object({
  deoId: z.string().min(1, "Select an operator"),
  taskType: z.string().min(1, "Select the service"),
  recordType: z.enum(["school", "college"], { error: "Choose School or College" }),
  verifierId: z.string().min(1, "Select a Verifier for this area"),
  verifierRate: z.coerce.number({ error: "Enter the verifier amount" }).int("Enter a whole number").min(0, "Amount cannot be negative").max(1000, "Amount is too high"),
  target: z.coerce.number({ error: "Enter the number of entries" }).int("Enter a whole number").min(1, "Target must be at least 1").max(100000, "Target is too large"),
  state: z.string().min(1, "Select state"),
  district: z.string().min(1, "Select district"),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code"),
  ratePerEntry: z.coerce.number({ error: "Enter the DEO amount" }).int("Enter a whole number").min(1, "Amount must be at least ₹1").max(1000, "Amount is too high"),
  deadline: z.string().min(1, "Select a deadline").refine((d) => d >= todayIST(), "Deadline cannot be in the past"),
  instructions: z.string().trim().max(1000, "Keep instructions under 1000 characters").optional(),
});
type FormIn = z.input<typeof schema>;
type FormOut = z.output<typeof schema>;

const label = (u: OperatorRow) =>
  `${u.id} – ${u.name}${u.location ? ` (${u.location.district}, ${u.location.pincode})` : ""}` +
  (u.status !== "active" ? ` · ${u.status === "pending" ? "Pending approval" : u.status[0].toUpperCase() + u.status.slice(1)}` : u.currentAssignment ? ` · Busy: ${u.currentAssignment.id}` : "");

function AssignInner() {
  const params = useSearchParams();
  const router = useRouter();
  const deos = useOperators(undefined, "deo");
  const create = useCreateWork();
  const settings = useAppSettings();
  const verifiers = useVerifiers();
  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema),
    defaultValues: {
      deoId: "", taskType: "Data Entry Services", recordType: "school", verifierId: "", verifierRate: 2, target: 50, state: "", district: "", pincode: "",
      ratePerEntry: 10, deadline: in30Days(), instructions: "",
    },
  });
  const { register, setValue, setError, formState: { errors: e } } = form;
  const state = useWatch({ control: form.control, name: "state" });
  const deoId = useWatch({ control: form.control, name: "deoId" });
  const selected = deos.data?.find((u) => u.id === deoId);
  const eligibleCount = deos.data?.filter((u) => u.eligible).length ?? 0;

  /** Fill state / district / PIN from the operator's registered address (admin can change them). */
  const fillArea = (u?: OperatorRow) => {
    if (!u?.location) return;
    setValue("state", u.location.state);
    setValue("district", u.location.district);
    setValue("pincode", u.location.pincode);
  };

  // Default rate from Settings (admin can still change it for this work).
  useEffect(() => {
    if (settings.data && !form.formState.dirtyFields.ratePerEntry) setValue("ratePerEntry", settings.data.defaultDeoRate);
    if (settings.data && !form.formState.dirtyFields.verifierRate) setValue("verifierRate", settings.data.verifierRate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.data]);

  const preDeo = params.get("deo");
  useEffect(() => {
    const u = deos.data?.find((x) => x.id === preDeo);
    if (u?.eligible) {
      setValue("deoId", u.id);
      fillArea(u);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deos.data, preDeo]);

  const onSubmit = form.handleSubmit((v) =>
    create.mutate(
      { ...v, instructions: v.instructions || undefined },
      {
        onSuccess: ({ assignment: a, emailed }) => {
          toast.success(`${a.id} assigned to ${a.deoId} (verifier ${a.verifierId}) for PIN ${a.area.pincode}.`, {
            description: emailed ? "The operator and the verifier have been notified on the portal and by e-mail." : "The operator and the verifier have been notified on the portal.",
          });
          router.push("/admin/assignments");
        },
        onError: (err) => {
          if (!(err instanceof AuthError)) return toast.error("Could not assign work. Please try again.");
          if (err.code === "PIN_BUSY") return setError("pincode", { message: err.message }, { shouldFocus: true });
          if (err.code === "DEO_BUSY" || err.code === "DEO_BLOCKED" || err.code === "DEO_NOT_FOUND")
            return setError("deoId", { message: err.message }, { shouldFocus: true });
          if (err.fields?.length) {
            err.fields.forEach((f, i) => setError(f.path as keyof FormIn, { message: f.message }, { shouldFocus: i === 0 }));
            return;
          }
          toast.error(err.message);
        },
      },
    ),
  );

  if (deos.isLoading) return <Skeleton className="h-96" />;
  if (deos.isError) return <Alert tone="red" icon={TriangleAlert}>Could not load operators. Please refresh the page.</Alert>;

  return (
    <>
      <PageHeader title="Assign Work" description="Assign a PIN code area to a Data Entry Operator and a Verifier." />
      {deos.data?.length === 0 ? (
        <Alert tone="amber" icon={TriangleAlert}>No Data Entry Operator has registered yet.</Alert>
      ) : (
        <Card>
          <CardHeader title="New assignment" action={<span className="text-xs text-muted">{eligibleCount} of {deos.data?.length} operators eligible</span>} />
          <form onSubmit={onSubmit} noValidate className="grid gap-5 p-5 sm:grid-cols-2">
            <Field className="sm:col-span-2" label="Data Entry Operator" htmlFor="deoId" required error={e.deoId?.message}>
              <Select
                id="deoId"
                aria-invalid={!!e.deoId}
                {...register("deoId", { onChange: (ev) => fillArea(deos.data?.find((x) => x.id === ev.target.value)) })}
              >
                <option value="">-- Select operator --</option>
                {deos.data?.map((u) => (
                  <option key={u.id} value={u.id} disabled={!u.eligible}>{label(u)}</option>
                ))}
              </Select>
            </Field>
            {selected && (
              <p className="-mt-3 text-xs text-muted sm:col-span-2">
                {selected.mobile} · {selected.email} · {selected.assignments.completed} of {selected.assignments.total} past assignment(s) completed ·{" "}
                <Link href={`/admin/operators/${selected.id}`} className="text-primary hover:underline">View profile</Link>
              </p>
            )}
            <Field label="Service" htmlFor="taskType" required error={e.taskType?.message}>
              <Select id="taskType" aria-invalid={!!e.taskType} {...register("taskType")}>
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t} disabled={!ACTIVE_TASK_TYPES.includes(t)}>{t}{ACTIVE_TASK_TYPES.includes(t) ? "" : " (Coming Soon)"}</option>
                ))}
              </Select>
            </Field>
            <Field label="Data entry for" htmlFor="recordType" required error={e.recordType?.message} hint="Decides the form the operator fills">
              <div id="recordType" role="radiogroup" className="grid grid-cols-2 gap-2">
                {(["school", "college"] as const).map((t) => (
                  <label key={t} className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:checked]:font-semibold has-[:checked]:text-primary">
                    <input type="radio" value={t} className="accent-primary" {...register("recordType")} />
                    {t === "school" ? "School" : "College"}
                  </label>
                ))}
              </div>
            </Field>
            <Field
              className="sm:col-span-2"
              label="Verifier for this area"
              htmlFor="verifierId"
              required
              error={e.verifierId?.message}
              hint={
                verifiers.data && !verifiers.data.some((v) => v.eligible)
                  ? "No verifier is free right now – complete a verifier's current area first."
                  : "Like an operator, a verifier gets one area at a time – busy verifiers cannot be chosen."
              }
            >
              <Select id="verifierId" aria-invalid={!!e.verifierId} disabled={verifiers.isLoading} {...register("verifierId")}>
                <option value="">{verifiers.isLoading ? "Loading verifiers…" : verifiers.data?.length ? "-- Select verifier --" : "No verifier has registered yet"}</option>
                {verifiers.data?.map((v) => (
                  <option key={v.id} value={v.id} disabled={!v.eligible}>
                    {v.id} – {v.name}
                    {v.status !== "active"
                      ? ` · ${v.status === "pending" ? "Pending approval" : v.status}`
                      : v.currentAssignment
                        ? ` · Busy – verifying ${v.currentAssignment.id} (PIN ${v.currentAssignment.pincode})`
                        : " · Free"}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Target (no. of entries)" htmlFor="target" required error={e.target?.message}>
              <Input id="target" type="number" min={1} inputMode="numeric" aria-invalid={!!e.target} {...register("target")} />
            </Field>
            <Field label="PIN code" htmlFor="pincode" required error={e.pincode?.message} hint="Work is assigned per PIN code">
              <Input id="pincode" inputMode="numeric" maxLength={6} placeholder="e.g. 250401" aria-invalid={!!e.pincode} {...register("pincode", {
                onChange: (ev) => setValue("pincode", ev.target.value.replace(/\D/g, "").slice(0, 6)),
              })} />
            </Field>
            <Field label="State / UT" htmlFor="state" required error={e.state?.message}>
              <Select id="state" aria-invalid={!!e.state} {...register("state", { onChange: () => setValue("district", "") })}>
                <StateOptions />
              </Select>
            </Field>
            <Field label="District" htmlFor="district" required error={e.district?.message}>
              <Select id="district" aria-invalid={!!e.district} disabled={!state} {...register("district")}>
                <DistrictOptions state={state} />
              </Select>
            </Field>
            <Field label="DEO amount per approved entry (₹)" htmlFor="ratePerEntry" required error={e.ratePerEntry?.message} hint="Paid to the operator">
              <Input id="ratePerEntry" type="number" min={1} inputMode="numeric" aria-invalid={!!e.ratePerEntry} {...register("ratePerEntry")} />
            </Field>
            <Field label="Verifier amount per verified entry (₹)" htmlFor="verifierRate" required error={e.verifierRate?.message} hint="Paid to the verifier only when an entry is finally approved">
              <Input id="verifierRate" type="number" min={0} inputMode="numeric" aria-invalid={!!e.verifierRate} {...register("verifierRate")} />
            </Field>
            <Field label="Deadline" htmlFor="deadline" required error={e.deadline?.message}>
              <Input id="deadline" type="date" min={todayIST()} aria-invalid={!!e.deadline} {...register("deadline")} />
            </Field>
            <Field className="sm:col-span-2" label="Instructions for the operator" htmlFor="instructions" error={e.instructions?.message}>
              <Textarea id="instructions" maxLength={1000} placeholder="e.g. Enter Class 10 records from the school register" {...register("instructions")} />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={create.isPending}><Send /> {create.isPending ? "Assigning…" : "Assign work"}</Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}

export default function AssignPage() {
  return (
    <Suspense>
      <AssignInner />
    </Suspense>
  );
}
