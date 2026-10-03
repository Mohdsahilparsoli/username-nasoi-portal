"use client";

import { ArrowLeft, Save, Send, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, PageHeader, Skeleton, StatusBadge } from "@/components/ui/misc";
import { PersonCard } from "@/features/records/person-card";
import { AreaStrip, RecordDetail, RecordFields, fromEntry, recordResolver, showServerError, toInput, type RecordValues } from "@/features/records/record-form";
import { useEntryForms, useMyEntry, useMyWork, useUpdateEntry } from "@/features/work/hooks";
import type { FormDef, RecordEntry } from "@/lib/api/work";

export default function EntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const entry = useMyEntry(id);
  const work = useMyWork();
  const forms = useEntryForms("deo");

  if (entry.isLoading || work.isLoading || forms.isLoading) return <Skeleton className="h-96" />;
  const e = entry.data;
  if (!e) {
    return (
      <Alert tone="red" icon={TriangleAlert}>
        {entry.error instanceof Error ? entry.error.message : "Entry not found."} <Link href="/deo/entries">Back to My Entries</Link>
      </Alert>
    );
  }
  const def = forms.data?.[e.recordType];
  // Pending / rejected entries of the current (active) work can be corrected.
  const editable = !!def && e.status !== "approved" && e.assignmentId === work.data?.current?.id;

  return (
    <>
      <PageHeader
        title={e.status === "rejected" && editable ? `Fix & resubmit ${e.id}` : `Entry ${e.id}`}
        description={e.name}
        action={<Button asChild variant="light"><Link href="/deo/entries"><ArrowLeft /> Back to entries</Link></Button>}
      />
      {e.status !== "approved" && work.data?.current?.verifier && e.assignmentId === work.data.current.id && (
        <PersonCard title="Verifier – ask about this entry" person={work.data.current.verifier} entryId={e.id} className="mb-5" />
      )}
      {editable ? <EditForm entry={e} def={def} /> : <Card><CardBody><RecordDetail def={def} entry={e} /></CardBody></Card>}
    </>
  );
}

function EditForm({ entry, def }: { entry: RecordEntry; def: FormDef }) {
  const router = useRouter();
  const update = useUpdateEntry();
  const form = useForm<RecordValues>({ resolver: recordResolver(def), defaultValues: fromEntry(def, entry) });
  const rejected = entry.status === "rejected";

  // mutateAsync: the result is handled even if the refreshed entry re-renders this form.
  const onSubmit = form.handleSubmit(async (v) => {
    try {
      const e = await update.mutateAsync({ id: entry.id, data: toInput(def, v) });
      toast.success(rejected ? `${e.id} resubmitted for verification.` : `${e.id} updated.`);
      router.push(rejected ? "/deo/entries?status=pending" : "/deo/entries");
    } catch (err) {
      showServerError(err, form.setError);
    }
  });

  return (
    <Card>
      <CardHeader title={entry.assignmentId} action={<StatusBadge status={entry.status} />} />
      <form onSubmit={onSubmit} noValidate className="space-y-6 p-5">
        {rejected ? (
          <Alert tone="red" icon={TriangleAlert}>
            <b>Rejection reason:</b> <span className="whitespace-pre-wrap">{entry.rejectReason || "—"}</span>
            {!!entry.rejectFields?.length && (
              <span className="mt-1 block">
                <b>Fields to correct ({entry.rejectFields.length}):</b> {def.fields.filter((f) => entry.rejectFields!.includes(f.key)).map((f) => f.label).join(", ")} – shown in red below.
              </span>
            )}
            <span className="mt-1 block">Correct the details and resubmit.</span>
          </Alert>
        ) : (
          <Alert tone="blue">This entry is waiting for verification. You can still correct it.</Alert>
        )}
        <AreaStrip area={entry.area} />
        <RecordFields def={def} control={form.control} errors={form.formState.errors} marked={rejected ? entry.rejectFields : undefined} />
        <div className="flex flex-wrap gap-2 border-t border-line pt-5">
          <Button type="submit" disabled={update.isPending}>
            {rejected ? <Send /> : <Save />} {update.isPending ? "Saving…" : rejected ? "Resubmit for verification" : "Save changes"}
          </Button>
          <Button asChild variant="light"><Link href="/deo/entries">Cancel</Link></Button>
        </div>
      </form>
    </Card>
  );
}
