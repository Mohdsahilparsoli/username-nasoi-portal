"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, ListChecks, MapPin, Send, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Alert, PageHeader, Progress, Skeleton } from "@/components/ui/misc";
import { AreaStrip, EMPTY_SCHOOL, SchoolFields, schoolSchema, showServerError, toInput, type SchoolForm } from "@/features/school-entries/school-form";
import { useCreateEntry, useMyWork } from "@/features/work/hooks";
import type { z } from "zod";
import { fmtDate } from "@/lib/utils";

export default function NewEntryPage() {
  const work = useMyWork();
  const create = useCreateEntry();
  const form = useForm<SchoolForm, unknown, z.output<typeof schoolSchema>>({ resolver: zodResolver(schoolSchema), defaultValues: EMPTY_SCHOOL });
  const a = work.data?.current;
  const done = a?.progress?.submitted ?? 0;
  const full = !!a && done >= a.target;

  const onSubmit = form.handleSubmit((v) =>
    create.mutate(toInput(v), {
      onSuccess: (e) => {
        toast.success(`Entry ${e.id} submitted – pending verification.`, { description: e.school.schoolName });
        form.reset(EMPTY_SCHOOL);
        document.getElementById("udiseCode")?.focus();
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
      onError: (err) => showServerError(err, form.setError),
    }),
  );

  if (work.isLoading) return <Skeleton className="h-96" />;
  if (work.isError) return <Alert tone="red" icon={TriangleAlert}>Could not load your work. Please refresh the page.</Alert>;

  return (
    <>
      <PageHeader
        title="New Add Entry"
        description="Enter one school exactly as it appears in the source record."
        action={<Button asChild variant="light"><Link href="/deo/entries"><ListChecks /> My Entries</Link></Button>}
      />
      {!a ? (
        <Alert tone="amber" icon={TriangleAlert}>
          You have no active work. Entries can be added once the Super Admin assigns a PIN code area to you. <Link href="/deo/work">Work Status</Link>
        </Alert>
      ) : (
        <Card>
          <CardHeader
            title={`${a.id} · ${a.taskType}`}
            action={<span className="text-sm text-muted">Target <b className="text-navy">{a.target}</b> entries</span>}
          />
          <div className="space-y-3 border-b border-line p-5">
            <AreaStrip area={a.area} />
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <MapPin className="size-3.5" /> {a.area.village}, {a.area.block} · deadline {fmtDate(a.deadline)}
            </p>
            <div className="max-w-md">
              <Progress value={done} max={a.target} />
            </div>
          </div>
          {full ? (
            <div className="p-5">
              <Alert tone="green" icon={CircleCheck}>
                Target reached – you have submitted {done} of {a.target} entries. You can still correct pending or rejected entries in{" "}
                <Link href="/deo/entries">My Entries</Link>.
              </Alert>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="space-y-5 p-5">
              <h3 className="text-base font-bold text-navy">1 – School</h3>
              <SchoolFields register={form.register} errors={form.formState.errors} control={form.control} />
              <div className="flex flex-wrap gap-2 pt-2">
                <Button type="submit" disabled={create.isPending}><Send /> {create.isPending ? "Submitting…" : "Submit Entry"}</Button>
                <Button type="button" variant="light" onClick={() => form.reset(EMPTY_SCHOOL)}>Clear</Button>
              </div>
            </form>
          )}
        </Card>
      )}
    </>
  );
}
