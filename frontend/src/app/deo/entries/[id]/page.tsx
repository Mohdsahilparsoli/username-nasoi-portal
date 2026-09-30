"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Send, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useMe } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, PageHeader, Skeleton } from "@/components/ui/misc";
import { useAssignments } from "@/features/assignments/hooks";
import { EntryDetail, EntryFields } from "@/features/entries/components";
import { useEntries, useResubmitEntry } from "@/features/entries/hooks";
import { entrySchema, type EntryForm } from "@/lib/validation";
import type { Entry } from "@/types";

export default function EntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  const entries = useEntries(me.id);
  const asg = useAssignments(me.id);
  const entry = entries.data?.find((e) => e.id === id);

  if (entries.isLoading) return <Skeleton className="h-96" />;
  if (!entry) {
    return (
      <Alert tone="red" icon={TriangleAlert}>
        Entry not found. <Link href="/deo/entries">Back to My Entries</Link>
      </Alert>
    );
  }

  return (
    <>
      <PageHeader
        title={entry.status === "rejected" ? `Correct & resubmit ${entry.id}` : `Entry ${entry.id}`}
        action={<Button asChild variant="light"><Link href="/deo/entries"><ArrowLeft /> Back to entries</Link></Button>}
      />
      {entry.status === "rejected" ? (
        <ResubmitForm entry={entry} deoId={me.id} />
      ) : (
        <Card><CardBody><EntryDetail entry={entry} assignment={asg.data?.find((a) => a.id === entry.assignmentId)} /></CardBody></Card>
      )}
    </>
  );
}

function ResubmitForm({ entry, deoId }: { entry: Entry; deoId: string }) {
  const router = useRouter();
  const resubmit = useResubmitEntry(deoId);
  const form = useForm<EntryForm>({ resolver: zodResolver(entrySchema), defaultValues: { ...entry.data, mobile: entry.data.mobile ?? "" } });

  const onSubmit = form.handleSubmit((data) =>
    resubmit.mutate(
      { id: entry.id, data },
      {
        onSuccess: () => {
          toast.success(`Entry ${entry.id} resubmitted for verification.`);
          router.push("/deo/entries?status=pending");
        },
        onError: (e) => toast.error(e.message),
      },
    ),
  );

  return (
    <Card>
      <CardHeader title="Record details" />
      <form onSubmit={onSubmit} noValidate className="space-y-5 p-5">
        <Alert tone="red" icon={TriangleAlert}><b>Rejection reason:</b> {entry.reason}</Alert>
        <EntryFields register={form.register} errors={form.formState.errors} />
        <div className="flex gap-2">
          <Button type="submit" disabled={resubmit.isPending}><Send /> {resubmit.isPending ? "Submitting…" : "Resubmit for verification"}</Button>
          <Button asChild variant="light"><Link href="/deo/entries">Cancel</Link></Button>
        </div>
      </form>
    </Card>
  );
}
