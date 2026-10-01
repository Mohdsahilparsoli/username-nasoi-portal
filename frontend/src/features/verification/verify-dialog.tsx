"use client";

import { CircleCheck, CircleX, History, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/form-controls";
import { Alert, DetailGrid, Skeleton } from "@/components/ui/misc";
import { SchoolEntryDetail } from "@/features/school-entries/school-form";
import { AuthError } from "@/lib/api/auth";
import { fmtDateTime, money } from "@/lib/utils";
import { useDecide, useVerifierEntry } from "./hooks";

export const SCHOOL_REJECT_REASONS = [
  "UDISE code does not match the school.",
  "School name spelling does not match the record.",
  "Educational block / cluster is incorrect.",
  "LGD block, panchayat or village is incorrect.",
  "School category or management is incorrect.",
  "Year of establishment / recognition is incorrect.",
  "School type is incorrect.",
  "School is outside the assigned PIN code area.",
];

/** Opens an entry; when it is pending (and assigned to me) it can be approved or rejected. */
export function VerifyDialog({ id, startReject, rate, onClose }: { id: string | null; startReject?: boolean; rate?: number; onClose: () => void }) {
  const q = useVerifierEntry(id);
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
      toast.success(decision === "approved" ? `${id} approved.` : `${id} rejected – the operator has been notified.`, {
        description: rate ? `+${money(rate)} added to your income.` : undefined,
      });
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
              <DetailGrid items={[["Operator", `${e.deo.name} (${e.deo.id})`], ["Work area", `${e.assignment.village}, ${e.assignment.block}`]]} />
              <SchoolEntryDetail entry={e} />
              {canAct && rejecting && (
                <div className="space-y-2 rounded-xl border border-danger/30 bg-danger-soft/40 p-4">
                  <Field label="Reason for rejection (the operator will see this)" htmlFor="reason" required error={error}>
                    <Select value="" onChange={(ev) => { if (ev.target.value) { setReason(ev.target.value); setError(""); } }} aria-label="Common reasons">
                      <option value="">-- Pick a common reason --</option>
                      {SCHOOL_REJECT_REASONS.map((r) => <option key={r}>{r}</option>)}
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
