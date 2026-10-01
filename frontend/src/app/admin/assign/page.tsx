"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Send, TriangleAlert } from "lucide-react";
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
import { useCreateWork, useOperators } from "@/features/work/hooks";
import { AuthError } from "@/lib/api/auth";
import type { OperatorRow } from "@/lib/api/work";
import { TASK_TYPES } from "@/lib/constants";

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
  taskType: z.string().min(1, "Select the type of data entry"),
  target: z.coerce.number({ error: "Enter the number of entries" }).int("Enter a whole number").min(1, "Target must be at least 1").max(100000, "Target is too large"),
  state: z.string().min(1, "Select state"),
  district: z.string().min(1, "Select district"),
  block: z.string().trim().min(2, "Enter block / tehsil").max(60),
  village: z.string().trim().min(2, "Enter village / ward").max(60),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code"),
  ratePerEntry: z.coerce.number({ error: "Enter the rate" }).int("Enter a whole number").min(1, "Rate must be at least ₹1").max(1000, "Rate is too high"),
  deadline: z.string().min(1, "Select a deadline").refine((d) => d >= todayIST(), "Deadline cannot be in the past"),
  instructions: z.string().trim().max(1000, "Keep instructions under 1000 characters").optional(),
});
type FormIn = z.input<typeof schema>;
type FormOut = z.output<typeof schema>;

const label = (u: OperatorRow) =>
  `${u.id} – ${u.name}${u.location ? ` (${u.location.district}, ${u.location.pincode})` : ""}` +
  (u.status === "blocked" ? " · Blocked" : u.currentAssignment ? ` · Busy: ${u.currentAssignment.id}` : "");

function AssignInner() {
  const params = useSearchParams();
  const router = useRouter();
  const deos = useOperators();
  const create = useCreateWork();
  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema),
    defaultValues: {
      deoId: "", taskType: "", target: 50, state: "", district: "", block: "", village: "", pincode: "",
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
          toast.success(`${a.id} assigned to ${a.deoId} for PIN ${a.area.pincode}.`, {
            description: emailed ? "The operator has been notified on the portal and by e-mail." : "The operator has been notified on the portal.",
          });
          router.push("/admin/assignments");
        },
        onError: (err) => {
          if (!(err instanceof AuthError)) return toast.error("Could not assign work. Please try again.");
          if (err.code === "PIN_BUSY") return setError("pincode", { message: err.message }, { shouldFocus: true });
          if (err.code === "DEO_BUSY" || err.code === "DEO_BLOCKED" || err.code === "DEO_NOT_FOUND")
            return setError("deoId", { message: err.message }, { shouldFocus: true });
          if (err.fields) {
            for (const [k, msg] of Object.entries(err.fields)) setError(k as keyof FormIn, { message: String(msg) });
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
      <PageHeader title="Assign Work" description="Assign a PIN code area and type of data entry to a Data Entry Operator." />
      <Alert tone="blue" icon={Info} className="mb-5">
        One operator gets <b>one assignment at a time</b> and one PIN code can be with <b>only one operator</b> at a time.
        An operator becomes eligible for new work after the current one is marked completed.
      </Alert>
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
            <Field label="Type of data entry" htmlFor="taskType" required error={e.taskType?.message}>
              <Select id="taskType" aria-invalid={!!e.taskType} {...register("taskType")}>
                <option value="">-- Select --</option>
                {TASK_TYPES.map((t) => <option key={t}>{t}</option>)}
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
            <Field label="Block / Tehsil" htmlFor="block" required error={e.block?.message}>
              <Input id="block" maxLength={60} aria-invalid={!!e.block} {...register("block")} />
            </Field>
            <Field label="Village / Ward" htmlFor="village" required error={e.village?.message}>
              <Input id="village" maxLength={60} aria-invalid={!!e.village} {...register("village")} />
            </Field>
            <Field label="Rate per approved entry (₹)" htmlFor="ratePerEntry" required error={e.ratePerEntry?.message}>
              <Input id="ratePerEntry" type="number" min={1} inputMode="numeric" aria-invalid={!!e.ratePerEntry} {...register("ratePerEntry")} />
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
