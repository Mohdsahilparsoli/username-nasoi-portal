"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { PageHeader, Skeleton } from "@/components/ui/misc";
import { useCreateAssignment } from "@/features/assignments/hooks";
import { useSettings } from "@/features/settings/hooks";
import { useUsers } from "@/features/users/hooks";
import { DistrictOptions, StateOptions } from "@/components/ui/location-options";
import { TASK_TYPES } from "@/lib/constants";

const schema = z.object({
  deoId: z.string().min(1, "Select an operator"),
  taskType: z.string().min(1, "Select the type of data entry"),
  target: z.coerce.number().int().min(1, "Target must be at least 1").max(10000),
  state: z.string().min(1, "Select state"),
  district: z.string().min(1, "Select district"),
  block: z.string().trim().min(1, "Enter block / tehsil"),
  village: z.string().trim().min(1, "Enter village / ward"),
  rate: z.coerce.number().min(1, "Rate must be above 0").max(1000),
  deadline: z.string().min(1, "Select a deadline"),
  note: z.string().max(300).optional(),
});
type FormIn = z.input<typeof schema>;
type FormOut = z.output<typeof schema>;

function in30Days() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

function AssignInner() {
  const params = useSearchParams();
  const router = useRouter();
  const deos = useUsers("deo");
  const settings = useSettings();
  const create = useCreateAssignment();
  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema),
    defaultValues: { deoId: "", taskType: "", target: 50, state: "", district: "", block: "", village: "", rate: 10, deadline: in30Days(), note: "" },
  });
  const { register, setValue, formState: { errors: e } } = form;
  const state = useWatch({ control: form.control, name: "state" });

  // Pre-select operator from ?deo= and fill their area.
  const preDeo = params.get("deo");
  useEffect(() => {
    const u = deos.data?.find((x) => x.id === preDeo);
    if (u) {
      setValue("deoId", u.id);
      setValue("state", u.state ?? "");
      setValue("district", u.district ?? "");
      setValue("block", u.tehsil ?? "");
    }
  }, [deos.data, preDeo, setValue]);

  useEffect(() => {
    if (settings.data) setValue("rate", settings.data.rate);
  }, [settings.data, setValue]);

  const onSubmit = form.handleSubmit((v) =>
    create.mutate(
      {
        deoId: v.deoId, taskType: v.taskType, target: v.target, rate: v.rate, deadline: v.deadline, note: v.note,
        area: { state: v.state, district: v.district, block: v.block, village: v.village },
      },
      {
        onSuccess: (a) => {
          toast.success(`${a.id} assigned to ${deos.data?.find((u) => u.id === v.deoId)?.name}.`);
          router.push("/admin/assignments");
        },
      },
    ),
  );

  if (deos.isLoading) return <Skeleton className="h-96" />;

  return (
    <>
      <PageHeader title="Assign Work" description="Choose an operator and assign the area and type of data entry." />
      <Card>
        <CardHeader title="New assignment" />
        <form onSubmit={onSubmit} noValidate className="grid gap-5 p-5 sm:grid-cols-2">
          <Field className="sm:col-span-2" label="Data Entry Operator" htmlFor="deoId" required error={e.deoId?.message}>
            <Select
              id="deoId"
              aria-invalid={!!e.deoId}
              {...register("deoId", {
                onChange: (ev) => {
                  const u = deos.data?.find((x) => x.id === ev.target.value);
                  if (u) { setValue("state", u.state ?? ""); setValue("district", u.district ?? ""); setValue("block", u.tehsil ?? ""); }
                },
              })}
            >
              <option value="">-- Select operator --</option>
              {deos.data?.filter((u) => u.status !== "blocked").map((u) => (
                <option key={u.id} value={u.id}>{u.id} – {u.name} ({u.district}, {u.state})</option>
              ))}
            </Select>
          </Field>
          <Field label="Type of data entry" htmlFor="taskType" required error={e.taskType?.message}>
            <Select id="taskType" aria-invalid={!!e.taskType} {...register("taskType")}>
              <option value="">-- Select --</option>
              {TASK_TYPES.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Target (no. of entries)" htmlFor="target" required error={e.target?.message}>
            <Input id="target" type="number" min={1} aria-invalid={!!e.target} {...register("target")} />
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
            <Input id="block" maxLength={40} aria-invalid={!!e.block} {...register("block")} />
          </Field>
          <Field label="Village / Ward" htmlFor="village" required error={e.village?.message}>
            <Input id="village" maxLength={40} aria-invalid={!!e.village} {...register("village")} />
          </Field>
          <Field label="Rate per approved entry (₹)" htmlFor="rate" required error={e.rate?.message}>
            <Input id="rate" type="number" min={1} aria-invalid={!!e.rate} {...register("rate")} />
          </Field>
          <Field label="Deadline" htmlFor="deadline" required error={e.deadline?.message}>
            <Input id="deadline" type="date" aria-invalid={!!e.deadline} {...register("deadline")} />
          </Field>
          <Field className="sm:col-span-2" label="Instructions for the operator" htmlFor="note">
            <Textarea id="note" maxLength={300} placeholder="e.g. Enter Class 10 records from the school register" {...register("note")} />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={create.isPending}><Send /> {create.isPending ? "Assigning…" : "Assign work"}</Button>
          </div>
        </form>
      </Card>
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
