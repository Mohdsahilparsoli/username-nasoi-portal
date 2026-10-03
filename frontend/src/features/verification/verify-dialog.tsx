"use client";

import { CircleCheck, CircleX, History, ListChecks, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/form-controls";
import { Alert, Skeleton } from "@/components/ui/misc";
import { PersonCard } from "@/features/records/person-card";
import { RecordDetail, isVisible, shownValue } from "@/features/records/record-form";
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
  const [marked, setMarked] = useState<string[]>([]);
  const [error, setError] = useState("");

  // Reset the form whenever another entry is opened.
  const [lastId, setLastId] = useState<string | null>(null);
  if (id !== lastId) {
    setLastId(id);
    setRejecting(!!startReject);
    setReason("");
    setMarked([]);
    setError("");
  }

  const e = q.data;
  const canAct = e?.status === "pending";
  const def = e ? forms.data?.[e.recordType] : undefined;
  const visible = def && e ? def.fields.filter((f) => isVisible(f, e.data)) : [];

  // Each ticked field adds one line to the reason ("• School Name: GPS … – incorrect");
  // un-ticking removes that line. The verifier can still type anything else.
  const lineOf = (key: string) => {
    const f = def?.fields.find((x) => x.key === key);
    return f && e ? `• ${f.label}: ${shownValue(e.data[key])} – incorrect` : "";
  };
  const withLines = (text: string, add: string[], remove: string[]) => {
    const drop = new Set(remove.map(lineOf));
    const lines = text.split("\n").filter((l) => !drop.has(l));
    const have = new Set(lines);
    const extra = add.map(lineOf).filter((l) => l && !have.has(l));
    return [...lines, ...extra].join("\n").replace(/^\n+/, "").slice(0, 3000);
  };
  const toggle = (key: string) => {
    const on = !marked.includes(key);
    setMarked((m) => (on ? [...m, key] : m.filter((k) => k !== key)));
    setReason((r) => withLines(r, on ? [key] : [], on ? [] : [key]));
    setError("");
  };
  const selectAll = () => {
    const keys = visible.map((f) => f.key);
    setReason((r) => withLines(r, keys.filter((k) => !marked.includes(k)), []));
    setMarked(keys);
    setError("");
  };
  const clearAll = () => {
    setReason((r) => withLines(r, [], marked));
    setMarked([]);
  };

  const run = async (decision: "approved" | "rejected") => {
    if (decision === "rejected") {
      if (!rejecting) return setRejecting(true);
      if (reason.trim().length < 5) return setError("Tick the wrong fields or write a clear reason (at least 5 characters).");
    }
    try {
      await decide.mutateAsync({ id: id!, decision, reason: decision === "rejected" ? reason.trim() : undefined, fields: decision === "rejected" ? marked : undefined });
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
                {rejecting && <Button variant="light" onClick={() => { clearAll(); setRejecting(false); setError(""); }} disabled={decide.isPending}>Back</Button>}
                <Button variant="danger" onClick={() => run("rejected")} disabled={decide.isPending}><CircleX /> {rejecting ? `Confirm Reject${marked.length ? ` (${marked.length} field${marked.length > 1 ? "s" : ""})` : ""}` : "Reject"}</Button>
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
                      {h.fields?.length ? ` (${h.fields.length} field${h.fields.length > 1 ? "s" : ""} marked)` : ""}
                    </span>
                  ))}
                  {e.status === "pending" && e.resubmitCount > 0 && <span className="block font-semibold">The operator corrected and resubmitted this entry.</span>}
                </Alert>
              )}
              <PersonCard title={["Entered by", placeText({ village: e.assignment.village, block: e.assignment.block })].filter(Boolean).join(" · ")} person={e.deo} entryId={e.id} />
              {canAct && rejecting && (
                <Alert tone="red" icon={ListChecks}>
                  <b>Tick every wrong value below</b> (one by one, or all). Each ticked value is added to the reason box at the bottom – you can also write your own message there.
                </Alert>
              )}
              <RecordDetail def={def} entry={e} selectable={canAct && rejecting ? { selected: marked, onToggle: toggle } : undefined} />
              {canAct && rejecting && (
                <div className="sticky bottom-0 space-y-2 rounded-xl border border-danger/30 bg-[#fff7f6] p-3 shadow-[0_-6px_16px_rgba(0,0,0,0.06)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-auto text-sm font-semibold text-danger">{marked.length} of {visible.length} values marked wrong</span>
                    <Select
                      value=""
                      className="h-8 w-auto max-w-56 text-xs"
                      onChange={(ev) => { if (ev.target.value) { const v = ev.target.value; setReason((r) => (r.trim() ? `${r}\n${v}` : v)); setError(""); } }}
                      aria-label="Add a common reason"
                    >
                      <option value="">+ Common reason</option>
                      {REJECT_REASONS[e.recordType].map((r) => <option key={r}>{r}</option>)}
                    </Select>
                    <Button size="sm" variant="light" onClick={selectAll} disabled={marked.length === visible.length}><ListChecks /> Select all</Button>
                    <Button size="sm" variant="ghost" onClick={clearAll} disabled={!marked.length}>Clear</Button>
                  </div>
                  <Field label="Reason for rejection (the operator will see this)" htmlFor="reason" required error={error}>
                    <Textarea id="reason" rows={Math.min(5, Math.max(3, reason.split("\n").length + 1))} maxLength={3000} value={reason} onChange={(ev) => { setReason(ev.target.value); setError(""); }} placeholder="Tick the wrong values above, or write what is wrong so the operator can correct it" />
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
