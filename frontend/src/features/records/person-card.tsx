"use client";

import { Phone } from "lucide-react";
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

/** Basic information of the DEO / verifier who works on the same area. */
export function PersonCard({ title, person, className }: { title: string; person: Person | null | undefined; className?: string }) {
  if (!person) {
    return (
      <div className={cn("rounded-xl border border-dashed border-line bg-white p-4 text-sm text-muted", className)}>
        <p className="text-xs font-semibold uppercase tracking-wide">{title}</p>
        <p className="mt-1">Not assigned yet.</p>
      </div>
    );
  }
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border border-line bg-white p-4", className)}>
      <Avatar person={person} />
      <div className="min-w-0">
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
      </div>
    </div>
  );
}
