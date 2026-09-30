"use client";

import { CircleCheck, CircleX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/form-controls";
import { useAssignments } from "@/features/assignments/hooks";
import { useUsers } from "@/features/users/hooks";
import { REJECT_REASONS } from "@/lib/constants";
import type { Entry } from "@/types";
import { EntryDetail } from "./components";
import { useVerifyEntry } from "./hooks";

/** View an entry; if it is pending and a verifier is given, approve or reject it. */
export function VerifyDialog({
  entry,
  verifierId,
  startReject,
  onClose,
}: {
  entry: Entry | null;
  verifierId?: string;
  startReject?: boolean;
  onClose: () => void;
}) {
  const deos = useUsers("deo");
  const verifiers = useUsers("verifier");
  const asg = useAssignments();
  const verify = useVerifyEntry(verifierId ?? "");
  const [rejecting, setRejecting] = useState(!!startReject);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const [lastId, setLastId] = useState<string | null>(null);
  if (entry && entry.id !== lastId) {
    setLastId(entry.id);
    setRejecting(!!startReject);
    setReason("");
    setError("");
  }

  const canAct = !!verifierId && entry?.status === "pending";

  const approve = () =>
    verify.mutate({ id: entry!.id, approve: true }, {
      onSuccess: () => { toast.success(`Entry ${entry!.id} approved.`); onClose(); },
      onError: (e) => toast.error(e.message),
    });

  const reject = () => {
    if (!rejecting) return setRejecting(true);
    if (reason.trim().length < 5) return setError("Please write a clear reason (at least 5 characters).");
    verify.mutate({ id: entry!.id, approve: false, reason }, {
      onSuccess: () => { toast.success(`Entry ${entry!.id} rejected.`); onClose(); },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <Dialog open={!!entry} onOpenChange={(o) => !o && onClose()}>
      {entry && (
        <DialogContent
          title={canAct ? "Verify entry" : "Entry details"}
          footer={
            canAct ? (
              <>
                <Button variant="danger" onClick={reject} disabled={verify.isPending}><CircleX /> {rejecting ? "Confirm Reject" : "Reject"}</Button>
                <Button variant="success" onClick={approve} disabled={verify.isPending}><CircleCheck /> Approve</Button>
              </>
            ) : undefined
          }
        >
          <EntryDetail
            entry={entry}
            assignment={asg.data?.find((a) => a.id === entry.assignmentId)}
            operator={deos.data?.find((u) => u.id === entry.deoId)}
            verifier={verifiers.data?.find((u) => u.id === entry.verifierId)}
          />
          {canAct && rejecting && (
            <div className="mt-5 space-y-2 rounded-xl border border-danger/30 bg-danger-soft/40 p-4">
              <Field label="Reason for rejection" htmlFor="reason" required error={error}>
                <Select value="" onChange={(e) => { if (e.target.value) { setReason(e.target.value); setError(""); } }}>
                  <option value="">-- Pick a common reason --</option>
                  {REJECT_REASONS.map((r) => <option key={r}>{r}</option>)}
                </Select>
                <Textarea id="reason" autoFocus value={reason} onChange={(e) => { setReason(e.target.value); setError(""); }} placeholder="Write the reason the operator will see" />
              </Field>
            </div>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}
