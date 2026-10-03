"use client";

import { Ban, CircleCheck, PauseCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form-controls";
import { Badge } from "@/components/ui/misc";
import type { EmployeeStatus } from "@/lib/api/work";
import { useSetOperatorStatus } from "./hooks";
import { ConfirmButton } from "./ui";

const LABEL: Record<EmployeeStatus, { text: string; tone: "green" | "amber" | "red" | "blue" }> = {
  active: { text: "Active", tone: "green" },
  pending: { text: "Pending approval", tone: "blue" },
  inactive: { text: "Inactive", tone: "amber" },
  rejected: { text: "Rejected", tone: "red" },
  blocked: { text: "Blocked", tone: "red" },
};

export function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) {
  const l = LABEL[status] ?? LABEL.inactive;
  return <Badge tone={l.tone}>{l.text}</Badge>;
}

/**
 * Activate / Deactivate / Reject buttons for one employee. Only active employees
 * get work; rejected employees cannot log in. Rejecting needs a reason.
 */
export function EmployeeStatusActions({ u, size = "sm" }: { u: { id: string; name: string; status: EmployeeStatus }; size?: "sm" | "md" }) {
  const set = useSetOperatorStatus();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const run = (status: "active" | "inactive" | "rejected", close: () => void) => {
    if (status === "rejected" && reason.trim().length < 5) return setError("Write the reason for rejection (at least 5 characters).");
    set.mutate(
      { id: u.id, status, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(`${u.name} (${u.id}) is now ${status}.`);
          setReason("");
          setError("");
          close();
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const reasonBox = (required: boolean) => (
    <Field label={required ? "Reason (shown to the employee)" : "Reason (optional, shown to the employee)"} htmlFor={`reason-${u.id}`} required={required} error={error}>
      <Textarea id={`reason-${u.id}`} maxLength={300} value={reason} onChange={(e) => { setReason(e.target.value); setError(""); }} />
    </Field>
  );

  const canActivate = u.status !== "active";
  const canDeactivate = u.status === "active";
  const canReject = u.status === "pending" || u.status === "inactive";

  return (
    <div className="flex flex-wrap gap-1.5">
      {canActivate && (
        <ConfirmButton
          trigger={<Button size={size} variant="success"><CircleCheck /> Activate</Button>}
          title={`Activate ${u.name} (${u.id})?`}
          description="The employee can then be assigned work. They are notified on the portal and by e-mail."
          confirmLabel="Activate"
          variant="success"
          pending={set.isPending}
          onConfirm={(close) => run("active", close)}
        />
      )}
      {canDeactivate && (
        <ConfirmButton
          trigger={<Button size={size} variant="light"><PauseCircle /> Deactivate</Button>}
          title={`Make ${u.name} (${u.id}) inactive?`}
          description={<div className="space-y-3"><p>They can still log in and see their entries and payments, but will not get new work. Current work is not changed.</p>{reasonBox(false)}</div>}
          confirmLabel="Make inactive"
          pending={set.isPending}
          onConfirm={(close) => run("inactive", close)}
        />
      )}
      {canReject && (
        <ConfirmButton
          trigger={<Button size={size} variant="danger"><Ban /> Reject</Button>}
          title={`Reject ${u.name} (${u.id})?`}
          description={<div className="space-y-3"><p>The employee is logged out and cannot log in. They are told the reason by e-mail.</p>{reasonBox(true)}</div>}
          confirmLabel="Reject"
          variant="danger"
          pending={set.isPending}
          onConfirm={(close) => run("rejected", close)}
        />
      )}
    </div>
  );
}
