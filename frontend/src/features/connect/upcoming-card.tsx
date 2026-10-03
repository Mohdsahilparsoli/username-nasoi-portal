"use client";

import { CalendarClock, Inbox } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { useMe } from "@/components/layout/dashboard-shell";
import { useConnectSummary } from "./hooks";
import { JoinMeetingButton, MeetingStateBadge, PlatformMark, istDay, istTime, relativeTime } from "./meeting-ui";

/** Dashboard card: next meetings (with Join button) and requests waiting for me. */
export function UpcomingMeetingsCard({ className }: { className?: string }) {
  const { role } = useMe();
  const s = useConnectSummary(role);
  const href = `/${role}/connect`;
  const next = s.data?.next ?? [];
  return (
    <Card className={className}>
      <CardHeader
        title="Meetings & Requests"
        action={
          <Link href={href} className="text-sm text-primary hover:underline">
            Open →
          </Link>
        }
      />
      <div className="divide-y divide-line">
        {s.data && s.data.openInbox > 0 && (
          <Link href={`${href}?tab=requests`} className="flex items-center gap-3 bg-saffron-soft/50 px-5 py-3 text-sm hover:bg-saffron-soft">
            <Inbox className="size-5 text-saffron-dark" />
            <span>
              <b>{s.data.openInbox}</b> request{s.data.openInbox > 1 ? "s" : ""} waiting for your answer
            </span>
          </Link>
        )}
        {s.isLoading && <p className="px-5 py-4 text-sm text-muted">Loading…</p>}
        {!s.isLoading && !next.length && (
          <p className="flex items-center gap-2 px-5 py-4 text-sm text-muted">
            <CalendarClock className="size-4" /> No upcoming meeting.
          </p>
        )}
        {next.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <PlatformMark platform={m.platform} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-navy">{m.title}</p>
              <p className="text-xs text-muted">
                {istDay(m.startsAt)}, {istTime(m.startsAt)} IST · {relativeTime(m.startsAt)} <MeetingStateBadge state={m.state} />
              </p>
            </div>
            <JoinMeetingButton link={m.link} platform={m.platform} size="sm" />
          </div>
        ))}
      </div>
    </Card>
  );
}
