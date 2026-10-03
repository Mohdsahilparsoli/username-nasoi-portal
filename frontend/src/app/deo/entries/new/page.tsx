"use client";

import { CircleCheck, ListChecks, MapPin, Send, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Alert, Badge, PageHeader, Progress, Skeleton } from "@/components/ui/misc";
import { PersonCard } from "@/features/records/person-card";
import { AreaStrip, RecordFields, emptyValues, recordResolver, showServerError, toInput, type RecordValues } from "@/features/records/record-form";
import { useCreateEntry, useEntryForms, useMyWork } from "@/features/work/hooks";
import { placeText } from "@/features/work/ui";
import type { FormDef, WorkAssignment } from "@/lib/api/work";
import { fmtDate } from "@/lib/utils";

export default function NewEntryPage() {
  const work = useMyWork();
  const forms = useEntryForms("deo");
  const a = work.data?.current;

  if (work.isLoading || forms.isLoading) return <Skeleton className="h-96" />;
  if (work.isError || forms.isError) return <Alert tone="red" icon={TriangleAlert}>Could not load your work. Please refresh the page.</Alert>;

  return (
    <>
      <PageHeader
        title="New Add Entry"
        description={a ? `Enter one ${a.recordType === "college" ? "college" : "school"} exactly as it appears in the source record.` : undefined}
        action={<Button asChild variant="light"><Link href="/deo/entries"><ListChecks /> My Entries</Link></Button>}
      />
      {!a ? (
        <Alert tone="amber" icon={TriangleAlert}>
          You have no active work. Entries can be added once the Super Admin assigns an area to you. <Link href="/deo/work">Work Status</Link>
        </Alert>
      ) : (
        <EntryCard a={a} def={forms.data![a.recordType]} />
      )}
    </>
  );
}

function EntryCard({ a, def }: { a: WorkAssignment; def: FormDef }) {
  const create = useCreateEntry();
  const form = useForm<RecordValues>({ resolver: recordResolver(def), defaultValues: emptyValues(def) });
  const done = a.progress?.submitted ?? 0;
  const full = done >= a.target;

  // Reset if the form definition changes (e.g. work switched from school to college).
  useEffect(() => form.reset(emptyValues(def)), [def, form]);

  const onSubmit = form.handleSubmit(async (v) => {
    try {
      const e = await create.mutateAsync(toInput(def, v));
      toast.success(`Entry ${e.id} submitted – pending verification.`, { description: e.name });
      form.reset(emptyValues(def));
      window.scrollTo({ top: 0, behavior: "smooth" });
      document.getElementById(def.codeField)?.focus({ preventScroll: true });
    } catch (err) {
      showServerError(err, form.setError);
    }
  });

  return (
    <Card>
      <CardHeader
        title={`${a.id} · ${a.taskType}`}
        action={<Badge tone="blue">{a.recordType === "college" ? "College" : "School"} entries · Target {a.target}</Badge>}
      />
      <div className="grid gap-4 border-b border-line p-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <AreaStrip area={a.area} />
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <MapPin className="size-3.5" /> {placeText({ village: a.area.village, block: a.area.block, district: a.area.district }) } · deadline {fmtDate(a.deadline)}
          </p>
          <div className="max-w-md"><Progress value={done} max={a.target} /></div>
        </div>
        <PersonCard title="Your entries are verified by" person={a.verifier} />
      </div>
      {full ? (
        <div className="p-5">
          <Alert tone="green" icon={CircleCheck}>
            Target reached – you have submitted {done} of {a.target} entries. You can still correct pending or rejected entries in{" "}
            <Link href="/deo/entries">My Entries</Link>.
          </Alert>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-6 p-5">
          <RecordFields def={def} control={form.control} errors={form.formState.errors} />
          <div className="flex flex-wrap gap-2 border-t border-line pt-5">
            <Button type="submit" disabled={create.isPending}><Send /> {create.isPending ? "Submitting…" : "Submit Entry"}</Button>
            <Button type="button" variant="light" onClick={() => form.reset(emptyValues(def))}>Clear</Button>
          </div>
        </form>
      )}
    </Card>
  );
}
