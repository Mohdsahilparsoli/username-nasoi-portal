"use client";

import { CircleCheck, CircleX, History, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/form-controls";
import { Alert, Skeleton } from "@/components/ui/misc";
import { PersonCard } from "@/features/records/person-card";
import { RecordDetail } from "@/features/records/record-form";
import { placeText } from "@/features/work/ui";
import { useEntryForms } from "@/features/work/hooks";
import { AuthError } from "@/lib/api/auth";
import { fmtDateTime } from "@/lib/utils";
import { useDecide, useVerifierEntry } from "./hooks";

const REJECT_REASONS = {
  school: [
    "UDISE code does not match the school.",
    "School name spelling does not match the record.",
    "Educational block / cluster is incorrect.",
    "LGD / Urban local body / ward details are incorrect.",
    "School category or management is incorrect.",
    "Class range, medium or pre-primary details are incorrect.",
    "Year of establishment / recognition is incorrect.",
    "Building or facility details are incorrect.",
    "School is outside the assigned PIN code area.",
  ],
  college: [
    "AISHE code does not match the college.",
    "College name spelling does not match the record.",
    "Affiliating university is incorrect.",
    "College type or management is incorrect.",
    "Address / block details are incorrect.",
    "Course or accreditation details are incorrect.",
    "College is outside the assigned PIN code area.",
  ],
} as const;

/** Opens an entry; when it is pending (and assigned to me) it can be approved or rejected. */
export function VerifyDialog({ id, startReject, onClose }: { id: string | null; startReject?: boolean; onClose: () => void }) {
  const q = useVerifierEntry(id);
  const forms = useEntryForms("verifier");
  const decide = useDecide();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  // Reset the form whenever another entry is opened.
  const [lastId, setLastId] = useState<string | null>(null);
  if (id !== lastId) {
    setLastId(id);
    setRejecting(!!startReject);
    setReason("");
    setError("");
  }

  const e = q.data;
  const canAct = e?.status === "pending";

  const run = async (decision: "approved" | "rejected") => {
    if (decision === "rejected") {
      if (!rejecting) return setRejecting(true);
      if (reason.trim().length < 5) return setError("Write a clear reason for rejection (at least 5 characters).");
    }
    try {
      await decide.mutateAsync({ id: id!, decision, reason: decision === "rejected" ? reason.trim() : undefined });
      toast.success(decision === "approved" ? `${id} approved.` : `${id} rejected – the operator has been notified.`);
      onClose();
    } catch (err) {
      if (err instanceof AuthError && err.fields?.length) setError(err.fields[0].message);
      else toast.error((err as Error).message);
    }
  };

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      {id && (
        <DialogContent
          title={canAct ? `Verify ${id}` : `Entry ${id}`}
          description={e ? `${e.deo.name} (${e.deo.id}) · ${e.assignment.id} – ${e.assignment.taskType}` : undefined}
          className="w-[min(760px,calc(100%-24px))]"
          footer={
            canAct ? (
              <>
                <Button variant="danger" onClick={() => run("rejected")} disabled={decide.isPending}><CircleX /> {rejecting ? "Confirm Reject" : "Reject"}</Button>
                <Button variant="success" onClick={() => run("approved")} disabled={decide.isPending}><CircleCheck /> Approve</Button>
              </>
            ) : undefined
          }
        >
          {q.isLoading ? (
            <Skeleton className="h-80" />
          ) : !e ? (
            <Alert tone="red" icon={TriangleAlert}>{q.error instanceof Error ? q.error.message : "Entry not found."}</Alert>
          ) : (
            <div className="space-y-5">
              {!!e.history?.length && (
                <Alert tone="blue" icon={History}>
                  <b>Earlier decisions:</b>{" "}
                  {e.history.map((h, i) => (
                    <span key={i} className="block">
                      {fmtDateTime(h.createdAt)} – {h.decision === "approved" ? "Approved" : `Rejected: ${h.reason}`}
                    </span>
                  ))}
                  {e.status === "pending" && e.resubmitCount > 0 && <span className="block font-semibold">The operator corrected and resubmitted this entry.</span>}
                </Alert>
              )}
              <PersonCard title={["Entered by", placeText({ village: e.assignment.village, block: e.assignment.block })].filter(Boolean).join(" · ")} person={e.deo} />
              <RecordDetail def={forms.data?.[e.recordType]} entry={e} />
              {canAct && rejecting && (
                <div className="space-y-2 rounded-xl border border-danger/30 bg-danger-soft/40 p-4">
                  <Field label="Reason for rejection (the operator will see this)" htmlFor="reason" required error={error}>
                    <Select value="" onChange={(ev) => { if (ev.target.value) { setReason(ev.target.value); setError(""); } }} aria-label="Common reasons">
                      <option value="">-- Pick a common reason --</option>
                      {REJECT_REASONS[e.recordType].map((r) => <option key={r}>{r}</option>)}
                    </Select>
                    <Textarea id="reason" autoFocus maxLength={300} value={reason} onChange={(ev) => { setReason(ev.target.value); setError(""); }} placeholder="Write what is wrong so the operator can correct it" />
                  </Field>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}
