"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/misc";
import type { WorkAssignment } from "@/lib/api/work";

export function WorkStatusBadge({ a }: { a: Pick<WorkAssignment, "status" | "seenAt"> }) {
  if (a.status === "completed") return <Badge tone="green">Completed</Badge>;
  if (a.status === "cancelled") return <Badge tone="red">Cancelled</Badge>;
  return a.seenAt ? <Badge tone="amber">In progress</Badge> : <Badge tone="blue">New (unseen)</Badge>;
}

/** "Village, Block, District" – village and block are optional (not asked when assigning any more). */
export const placeText = (a: { village?: string | null; block?: string | null; district?: string; state?: string }) =>
  [a.village, a.block, a.district, a.state].filter((x) => x && x.trim()).join(", ");

export const areaText = (a: WorkAssignment["area"]) => `${placeText(a)} – ${a.pincode}`;

/** A button that asks "are you sure?" in a dialog before running the action. */
export function ConfirmButton({
  trigger,
  title,
  description,
  confirmLabel,
  variant = "primary",
  onConfirm,
  pending,
}: {
  trigger: React.ReactElement;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  variant?: "primary" | "danger" | "success";
  onConfirm: (close: () => void) => void;
  pending?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <span onClick={() => setOpen(true)} className="contents">{trigger}</span>
      <DialogContent
        title={title}
        footer={
          <>
            <DialogClose asChild><Button variant="light">Cancel</Button></DialogClose>
            <Button variant={variant} disabled={pending} onClick={() => onConfirm(() => setOpen(false))}>
              {pending ? "Please wait…" : confirmLabel}
            </Button>
          </>
        }
      >
        <div className="text-sm text-navy">{description}</div>
      </DialogContent>
    </Dialog>
  );
}
