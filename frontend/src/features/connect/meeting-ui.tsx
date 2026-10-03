"use client";

import { ExternalLink, Video } from "lucide-react";
import { Badge } from "@/components/ui/misc";
import type { MeetingState } from "@/lib/api/connect";
import type { MeetingPlatform } from "@/lib/api/work";
import { cn } from "@/lib/utils";

/** Name and brand colour of each meeting app, so people see at once where to connect. */
export const PLATFORM: Record<MeetingPlatform, { label: string; short: string; bg: string; soft: string; text: string }> = {
  zoom: {
    label: "Zoom",
    short: "Zoom",
    bg: "bg-[#0b5cff] hover:bg-[#0848c8]",
    soft: "bg-[#e8efff]",
    text: "text-[#0b5cff]",
  },
  google_meet: {
    label: "Google Meet",
    short: "Meet",
    bg: "bg-[#00897b] hover:bg-[#00695c]",
    soft: "bg-[#e0f2f1]",
    text: "text-[#00796b]",
  },
  teams: {
    label: "Microsoft Teams",
    short: "Teams",
    bg: "bg-[#5b5fc7] hover:bg-[#4a4eb0]",
    soft: "bg-[#ecebfa]",
    text: "text-[#5b5fc7]",
  },
  other: {
    label: "Online meeting",
    short: "Meeting",
    bg: "bg-primary hover:bg-primary-dark",
    soft: "bg-primary-soft",
    text: "text-primary",
  },
};

/** Same rule as the server: which app a link belongs to (null = not allowed). */
export function platformOf(link: string): MeetingPlatform | null {
  try {
    const u = new URL(link.trim());
    if (u.protocol !== "https:") return null;
    const h = u.hostname.toLowerCase();
    if (/(^|\.)zoom\.(us|com)$/.test(h)) return "zoom";
    if (h === "meet.google.com") return "google_meet";
    if (h === "teams.microsoft.com" || h === "teams.live.com") return "teams";
    return null;
  } catch {
    return null;
  }
}

/** Small coloured app logo mark. */
export function PlatformMark({ platform, className }: { platform: MeetingPlatform | null | undefined; className?: string }) {
  const p = PLATFORM[platform ?? "other"];
  return (
    <span className={cn("inline-grid size-9 shrink-0 place-items-center rounded-lg text-white", p.bg.split(" ")[0], className)} title={p.label}>
      <Video className="size-[18px]" />
    </span>
  );
}

/** "Join Zoom" / "Join Google Meet" – opens the meeting in a new tab. */
export function JoinMeetingButton({
  link,
  platform,
  size = "md",
  label,
  className,
}: {
  link: string;
  platform?: MeetingPlatform | null;
  size?: "sm" | "md";
  label?: string;
  className?: string;
}) {
  const p = PLATFORM[platform ?? platformOf(link) ?? "other"];
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-semibold text-white transition-colors",
        p.bg,
        size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
        className,
      )}
    >
      <Video className="size-4" /> {label ?? `Join ${p.label}`} <ExternalLink className="size-3 opacity-80" />
    </a>
  );
}

export function MeetingStateBadge({ state }: { state: MeetingState }) {
  if (state === "live")
    return (
      <Badge tone="green" className="animate-pulse">
        ● Live now
      </Badge>
    );
  if (state === "upcoming") return <Badge tone="blue">Upcoming</Badge>;
  if (state === "cancelled") return <Badge tone="red">Cancelled</Badge>;
  return <Badge tone="grey">Ended</Badge>;
}

const IST = "Asia/Kolkata";
/** "Sat, 04 Oct 2026" */
export const istDay = (v: string) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(v));
/** "11:30 am" */
export const istTime = (v: string) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(v));
/** "Sat, 04 Oct 2026, 11:30 am – 12:15 pm" */
export function meetingWhen(startsAt: string, durationMin: number) {
  const end = new Date(new Date(startsAt).getTime() + durationMin * 60_000).toISOString();
  return `${istDay(startsAt)}, ${istTime(startsAt)} – ${istTime(end)}`;
}

/** "in 2 h 5 min" / "in 3 days" / "started 10 min ago" */
export function relativeTime(v: string, now = Date.now()) {
  const diff = Math.round((new Date(v).getTime() - now) / 60_000);
  const abs = Math.abs(diff);
  const text = abs < 60 ? `${abs} min` : abs < 48 * 60 ? `${Math.floor(abs / 60)} h${abs % 60 ? ` ${abs % 60} min` : ""}` : `${Math.round(abs / 1440)} days`;
  return diff >= 0 ? `in ${text}` : `${text} ago`;
}

/** Value for <input type="datetime-local"> in the browser's time (India). */
export function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
