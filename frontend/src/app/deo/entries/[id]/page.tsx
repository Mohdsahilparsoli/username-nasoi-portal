"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save, Send, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, PageHeader, Skeleton, StatusBadge } from "@/components/ui/misc";
import {
  AreaStrip, SchoolEntryDetail, SchoolFields, fromEntry, schoolSchema, showServerError, toInput, type SchoolForm,
} from "@/features/school-entries/school-form";
import { useMyEntry, useMyWork, useUpdateEntry } from "@/features/work/hooks";
import type { SchoolEntry } from "@/lib/api/work";

export default function EntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const entry = useMyEntry(id);
  const work = useMyWork();

  if (entry.isLoading || work.isLoading) return <Skeleton className="h-96" />;
  const e = entry.data;
  if (!e) {
    return (
      <Alert tone="red" icon={TriangleAlert}>
        {entry.error instanceof Error ? entry.error.message : "Entry not found."} <Link href="/deo/entries">Back to My Entries</Link>
      </Alert>
    );
  }
  // Pending / rejected entries of the current (active) work can be corrected.
  const editable = e.status !== "approved" && e.assignmentId === work.data?.current?.id;

  return (
    <>
      <PageHeader
        title={e.status === "rejected" && editable ? `Fix & resubmit ${e.id}` : `Entry ${e.id}`}
        description={e.school.schoolName}
        action={<Button asChild variant="light"><Link href="/deo/entries"><ArrowLeft /> Back to entries</Link></Button>}
      />
      {editable ? (
        <EditForm entry={e} />
      ) : (
        <Card><CardBody><SchoolEntryDetail entry={e} /></CardBody></Card>
      )}
    </>
  );
}

function EditForm({ entry }: { entry: SchoolEntry }) {
  const router = useRouter();
  const update = useUpdateEntry();
  const form = useForm<SchoolForm, unknown, z.output<typeof schoolSchema>>({ resolver: zodResolver(schoolSchema), defaultValues: fromEntry(entry) });
  const rejected = entry.status === "rejected";

  // mutateAsync: the result is handled even if the refreshed entry re-renders this form.
  const onSubmit = form.handleSubmit(async (v) => {
    try {
      const e = await update.mutateAsync({ id: entry.id, data: toInput(v) });
      toast.success(rejected ? `${e.id} resubmitted for verification.` : `${e.id} updated.`);
      router.push(rejected ? "/deo/entries?status=pending" : "/deo/entries");
    } catch (err) {
      showServerError(err, form.setError);
    }
  });

  return (
    <Card>
      <CardHeader title={`${entry.assignmentId}`} action={<StatusBadge status={entry.status} />} />
      <form onSubmit={onSubmit} noValidate className="space-y-5 p-5">
        {rejected ? (
          <Alert tone="red" icon={TriangleAlert}><b>Rejection reason:</b> {entry.rejectReason || "—"}. Correct the details and resubmit.</Alert>
        ) : (
          <Alert tone="blue">This entry is waiting for verification. You can still correct it.</Alert>
        )}
        <AreaStrip area={entry.area} />
        <h3 className="text-base font-bold text-navy">1 – School</h3>
        <SchoolFields register={form.register} errors={form.formState.errors} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={update.isPending}>
            {rejected ? <Send /> : <Save />} {update.isPending ? "Saving…" : rejected ? "Resubmit for verification" : "Save changes"}
          </Button>
          <Button asChild variant="light"><Link href="/deo/entries">Cancel</Link></Button>
        </div>
      </form>
    </Card>
  );
}
