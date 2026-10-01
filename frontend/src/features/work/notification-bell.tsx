"use client";

import { Bell, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMarkNotificationsRead, useNotifications } from "@/features/work/hooks";
import type { AppNotification } from "@/lib/api/work";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

function ago(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(iso));
}

/** Bell with unread count; the list refreshes every minute and when the tab gets focus. */
export function NotificationBell({ role }: { role: Role }) {
  const router = useRouter();
  const { data } = useNotifications(role);
  const mark = useMarkNotificationsRead(role);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const unread = data?.unread ?? 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openItem = (n: AppNotification) => {
    if (!n.readAt) mark.mutate({ ids: [n.id] });
    setOpen(false);
    if (n.link?.startsWith("/")) router.push(n.link);
  };

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative grid size-9 place-items-center rounded-full border border-line text-navy hover:bg-canvas"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
      >
        <Bell className="size-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-xl border border-line bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <b className="text-sm text-navy">Notifications</b>
            {unread > 0 && (
              <button type="button" onClick={() => mark.mutate({ all: true })} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                <CheckCheck className="size-3.5" /> Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-96 divide-y divide-line overflow-y-auto">
            {!data?.notifications.length ? (
              <li className="px-4 py-6 text-center text-sm text-muted">No notifications yet.</li>
            ) : (
              data.notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    className={cn("flex w-full gap-3 px-4 py-3 text-left hover:bg-canvas", !n.readAt && "bg-primary-soft/50")}
                  >
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-primary")} />
                    <span className="min-w-0">
                      <b className="block text-sm text-navy">{n.title}</b>
                      <span className="block text-xs text-muted">{n.body}</span>
                      <span className="mt-1 block text-[11px] text-muted">{ago(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
