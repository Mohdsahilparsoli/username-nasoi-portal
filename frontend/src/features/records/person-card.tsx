"use client";

import { MessageSquarePlus, Phone } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { JoinMeetingButton } from "@/features/connect/meeting-ui";
import { NewRequestDialog } from "@/features/connect/request-dialog";
import { useMe } from "@/components/layout/dashboard-shell";
import { useUserPhoto } from "@/features/work/hooks";
import type { PersonCard as Person } from "@/lib/api/work";
import { cn, initials } from "@/lib/utils";

/** Round photo of a user (falls back to initials). */
export function Avatar({ person, size = "md" }: { person: Pick<Person, "id" | "name" | "hasPhoto">; size?: "sm" | "md" | "lg" }) {
  const { role } = useMe();
  const photo = useUserPhoto(role, person.id, person.hasPhoto !== false);
  const cls = { sm: "size-9 text-sm", md: "size-12 text-base", lg: "size-16 text-lg" }[size];
  return photo.data ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photo.data} alt={person.name} className={cn("shrink-0 rounded-full border border-line object-cover", cls)} />
  ) : (
    <span className={cn("grid shrink-0 place-items-center rounded-full bg-primary-soft font-bold text-primary", cls)}>{initials(person.name)}</span>
  );
}

/**
 * Basic information of the DEO / verifier who works on the same area, with
 * their photo, a "Join Zoom / Google Meet" button (their saved meeting room)
 * and a "Request" button.
 */
export function PersonCard({ title, person, className, entryId }: { title: string; person: Person | null | undefined; className?: string; entryId?: string }) {
  const [asking, setAsking] = useState(false);
  if (!person) {
    return (
      <div className={cn("rounded-xl border border-dashed border-line bg-white p-4 text-sm text-muted", className)}>
        <p className="text-xs font-semibold uppercase tracking-wide">{title}</p>
        <p className="mt-1">Not assigned yet.</p>
      </div>
    );
  }
  return (
    <div className={cn("flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white p-4", className)}>
      <Avatar person={person} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</p>
        <p className="truncate font-semibold text-navy">{person.name}</p>
        <p className="text-xs text-muted">
          {person.id}
          {person.mobile && (
            <>
              {" · "}
              <a href={`tel:${person.mobile}`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                <Phone className="size-3" /> {person.mobile}
              </a>
            </>
          )}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {person.meetingLink && <JoinMeetingButton link={person.meetingLink} platform={person.platform} size="sm" />}
          <Button size="sm" variant="light" onClick={() => setAsking(true)}><MessageSquarePlus /> Request</Button>
        </div>
      </div>
      <NewRequestDialog open={asking} onOpenChange={setAsking} preset={{ toId: person.id, entryId, kind: entryId ? "entry" : "meeting" }} />
    </div>
  );
}
