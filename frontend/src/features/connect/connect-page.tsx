"use client";

import { CalendarClock, CalendarPlus, Check, Copy, Inbox, MessageSquarePlus, Send, Video, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterTabs } from "@/components/ui/data-table";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/form-controls";
import { Alert, Badge, EmptyState, PageHeader, Skeleton } from "@/components/ui/misc";
import { useMe } from "@/components/layout/dashboard-shell";
import { Avatar } from "@/features/records/person-card";
import { useMyProfile } from "@/features/users/hooks";
import { AuthError } from "@/lib/api/auth";
import type { ConnectRequest, Meeting } from "@/lib/api/connect";
import { fmtDateTime } from "@/lib/utils";
import { useCancelMeeting, useConnectSummary, useMeetings, useRequests, useRespondRequest } from "./hooks";
import { JoinMeetingButton, MeetingStateBadge, PLATFORM, PlatformMark, meetingWhen, relativeTime } from "./meeting-ui";
import { NewRequestDialog, type RequestPreset } from "./request-dialog";
import { ScheduleMeetingDialog, type MeetingPreset } from "./schedule-dialog";

type Tab = "meetings" | "requests";
const KIND: Record<string, string> = {
  meeting: "Meeting request",
  entry: "Entry request",
  general: "Request",
};
const STATUS_TONE = {
  open: "amber",
  accepted: "green",
  declined: "red",
  closed: "grey",
} as const;

/** Meetings & Requests – same page for the admin, DEOs and verifiers. */
export function ConnectPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <ConnectInner />
    </Suspense>
  );
}

function ConnectInner() {
  const { role } = useMe();
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const tab: Tab = params.get("tab") === "requests" ? "requests" : "meetings";
  const summary = useConnectSummary(role);
  const profile = useMyProfile();
  const [schedule, setSchedule] = useState<{
    open: boolean;
    preset?: MeetingPreset;
  }>({ open: false });
  const [request, setRequest] = useState<{
    open: boolean;
    preset?: RequestPreset;
  }>({ open: false });

  const setTab = (t: Tab) =>
    router.replace(t === "requests" ? `${path}?tab=requests` : path, {
      scroll: false,
    });
  const profileHref = role === "admin" ? "/admin/settings" : `/${role}/profile`;

  return (
    <>
      <PageHeader
        title="Meetings & Requests"
        description="Zoom / Google Meet meetings and requests between you, your DEO / Verifier and the NASOI admin."
        action={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setSchedule({ open: true })}>
              <CalendarPlus /> Schedule meeting
            </Button>
            <Button variant="light" onClick={() => setRequest({ open: true })}>
              <MessageSquarePlus /> New request
            </Button>
          </div>
        }
      />
      {profile.data && !profile.data.meetingLink && (
        <Alert tone="blue" icon={Video} className="mb-4">
          Save your own Zoom / Google Meet room link in{" "}
          <Link href={profileHref} className="font-semibold underline">
            {role === "admin" ? "Settings" : "Profile"}
          </Link>{" "}
          – it is filled in automatically when you schedule a meeting, and others see a “Join” button on your card.
        </Alert>
      )}
      <div className="mb-4">
        <FilterTabs<Tab>
          value={tab}
          onChange={setTab}
          options={[
            {
              value: "meetings",
              label: "Meetings",
              count: summary.data?.upcoming,
            },
            {
              value: "requests",
              label: "Requests",
              count: summary.data?.openInbox,
            },
          ]}
        />
      </div>
      {tab === "meetings" ? (
        <MeetingsTab onAnswer={() => setSchedule({ open: true })} />
      ) : (
        <RequestsTab
          onSchedule={(r) =>
            setSchedule({
              open: true,
              preset: {
                requestId: r.id,
                participantIds: r.from ? [r.from.id] : [],
                title: r.subject,
                entryId: r.entryId ?? undefined,
                startsAt: r.preferredAt ?? undefined,
                note: `Answering ${r.id} from ${r.from?.name ?? ""}${r.preferredAt ? ` – preferred time ${fmtDateTime(r.preferredAt)}` : ""}.`,
              },
            })
          }
          onNew={() => setRequest({ open: true })}
        />
      )}
      <ScheduleMeetingDialog open={schedule.open} onOpenChange={(o) => setSchedule((s) => ({ ...s, open: o }))} preset={schedule.preset} />
      <NewRequestDialog open={request.open} onOpenChange={(o) => setRequest((s) => ({ ...s, open: o }))} preset={request.preset} />
    </>
  );
}

/* ---------------- Meetings ---------------- */

function MeetingsTab({ onAnswer }: { onAnswer: () => void }) {
  const { role } = useMe();
  const [view, setView] = useState<"upcoming" | "past" | "all">("upcoming");
  const list = useMeetings(role, view);
  return (
    <>
      <div className="mb-4">
        <FilterTabs<"upcoming" | "past" | "all">
          value={view}
          onChange={setView}
          options={[
            { value: "upcoming", label: "Upcoming" },
            { value: "past", label: "Past / cancelled" },
            ...(role === "admin" ? [{ value: "all" as const, label: "All meetings" }] : []),
          ]}
        />
      </div>
      {list.isLoading ? (
        <Skeleton className="h-48" />
      ) : !list.data?.length ? (
        <Card className="p-6">
          <EmptyState icon={CalendarClock} text={view === "upcoming" ? "No upcoming meeting." : "No meeting here yet."} />
          {view === "upcoming" && (
            <div className="mt-3 text-center">
              <Button size="sm" onClick={onAnswer}>
                <CalendarPlus /> Schedule a meeting
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {list.data.map((m) => (
            <MeetingCard key={m.id} m={m} />
          ))}
        </div>
      )}
    </>
  );
}

export function MeetingCard({ m, compact }: { m: Meeting; compact?: boolean }) {
  const { role, id: myId } = useMe();
  const cancel = useCancelMeeting(role);
  const [confirm, setConfirm] = useState(false);
  const p = PLATFORM[m.platform] ?? PLATFORM.other;
  const open = m.state === "upcoming" || m.state === "live";
  const others = m.participants.filter((x) => x.id !== myId);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(m.link);
      toast.success("Meeting link copied");
    } catch {
      toast.error("Could not copy. Select the link and copy it.");
    }
  };
  return (
    <Card className={`overflow-hidden ${m.state === "live" ? "ring-2 ring-success" : ""}`}>
      <div className={`flex flex-wrap items-start gap-4 p-4 ${m.state === "cancelled" ? "opacity-70" : ""}`}>
        <PlatformMark platform={m.platform} className="size-11" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-navy">{m.title}</h3>
            <MeetingStateBadge state={m.state} />
            <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${p.soft} ${p.text}`}>{p.label}</span>
          </div>
          <p className="mt-1 text-sm text-navy">
            <CalendarClock className="mr-1 inline size-4 text-muted" />
            <b>{meetingWhen(m.startsAt, m.durationMin)}</b>{" "}
            <span className="text-muted">
              IST · {m.durationMin} min
              {open ? ` · ${relativeTime(m.startsAt)}` : ""}
            </span>
          </p>
          {!compact && (
            <>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>
                  By <b className="text-navy">{m.createdBy?.name ?? "—"}</b> ({m.createdBy?.id})
                </span>
                <span>·</span>
                <span className="flex items-center -space-x-2">
                  {others.slice(0, 6).map((x) => (
                    <span key={x.id} title={`${x.name} (${x.id})`} className="rounded-full ring-2 ring-white">
                      <Avatar person={x} size="sm" />
                    </span>
                  ))}
                </span>
                <span>
                  {others
                    .map((x) => x.name)
                    .slice(0, 3)
                    .join(", ")}
                  {others.length > 3 ? ` +${others.length - 3}` : ""}
                </span>
                {m.entryId && <Badge tone="primary">Entry {m.entryId}</Badge>}
                <span className="font-mono">{m.id}</span>
              </div>
              {m.notes && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-canvas px-3 py-2 text-sm">{m.notes}</p>}
            </>
          )}
        </div>
        {open && (
          <div className="flex flex-wrap items-center gap-2">
            <JoinMeetingButton link={m.link} platform={m.platform} size={compact ? "sm" : "md"} />
            {!compact && (
              <Button size="sm" variant="light" onClick={copy} aria-label="Copy meeting link">
                <Copy /> Copy link
              </Button>
            )}
            {!compact && (m.mine || role === "admin") && (
              <Button size="sm" variant="ghost" onClick={() => setConfirm(true)}>
                <X /> Cancel
              </Button>
            )}
          </div>
        )}
      </div>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent
          title={`Cancel ${m.title}?`}
          description="Everyone invited gets a notification and an e-mail that the meeting is cancelled."
          footer={
            <>
              <DialogClose asChild>
                <Button variant="light">Keep it</Button>
              </DialogClose>
              <Button
                variant="danger"
                disabled={cancel.isPending}
                onClick={() =>
                  cancel.mutate(m.id, {
                    onSuccess: () => {
                      toast.success(`${m.id} cancelled`);
                      setConfirm(false);
                    },
                    onError: (e) => toast.error(e.message),
                  })
                }
              >
                {cancel.isPending ? "Cancelling…" : "Cancel meeting"}
              </Button>
            </>
          }
        >
          <p className="text-sm">{meetingWhen(m.startsAt, m.durationMin)} IST</p>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ---------------- Requests ---------------- */

function RequestsTab({ onSchedule, onNew }: { onSchedule: (r: ConnectRequest) => void; onNew: () => void }) {
  const { role } = useMe();
  const [box, setBox] = useState<"inbox" | "sent">("inbox");
  const list = useRequests(role, box);
  const [answer, setAnswer] = useState<{
    r: ConnectRequest;
    action: "accept" | "decline" | "close";
  } | null>(null);
  const open = (list.data ?? []).filter((r) => r.status === "open").length;
  return (
    <>
      <div className="mb-4">
        <FilterTabs<"inbox" | "sent">
          value={box}
          onChange={setBox}
          options={[
            { value: "inbox", label: "Received" },
            { value: "sent", label: "Sent" },
          ]}
        />
      </div>
      {list.isLoading ? (
        <Skeleton className="h-48" />
      ) : !list.data?.length ? (
        <Card className="p-6">
          <EmptyState icon={Inbox} text={box === "inbox" ? "No request received yet." : "You have not sent any request."} />
          <div className="mt-3 text-center">
            <Button size="sm" onClick={onNew}>
              <MessageSquarePlus /> New request
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {box === "inbox" && open > 0 && (
            <Alert tone="amber">
              {open} request{open > 1 ? "s are" : " is"} waiting for your answer.
            </Alert>
          )}
          {list.data.map((r) => {
            const who = r.incoming ? r.from : r.to;
            return (
              <Card key={r.id} className={r.status === "open" && r.incoming ? "border-l-4 border-l-saffron" : ""}>
                <div className="flex flex-wrap items-start gap-4 p-4">
                  {who && <Avatar person={who} />}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={r.kind === "meeting" ? "blue" : r.kind === "entry" ? "primary" : "grey"}>{KIND[r.kind]}</Badge>
                      <Badge tone={STATUS_TONE[r.status]}>{r.status === "open" ? "Waiting" : r.status.charAt(0).toUpperCase() + r.status.slice(1)}</Badge>
                      <span className="font-mono text-xs text-muted">{r.id}</span>
                    </div>
                    <h3 className="mt-1 font-semibold text-navy">{r.subject}</h3>
                    <p className="text-xs text-muted">
                      {r.incoming ? "From" : "To"} <b className="text-navy">{who?.name}</b> ({who?.id}) · {fmtDateTime(r.createdAt)}
                      {r.entryId && (
                        <>
                          {" "}
                          · Entry <b className="text-navy">{r.entryId}</b>
                        </>
                      )}
                      {r.preferredAt && (
                        <>
                          {" "}
                          · Preferred <b className="text-navy">{fmtDateTime(r.preferredAt)}</b>
                        </>
                      )}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap rounded-lg bg-canvas px-3 py-2 text-sm">{r.message}</p>
                    {r.reply && (
                      <p className="mt-2 whitespace-pre-wrap rounded-lg border-l-4 border-saffron bg-saffron-soft/40 px-3 py-2 text-sm">
                        <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">
                          Reply
                          {r.respondedAt ? ` · ${fmtDateTime(r.respondedAt)}` : ""}
                        </span>
                        {r.reply}
                      </p>
                    )}
                  </div>
                  {r.status === "open" && (
                    <div className="flex flex-wrap gap-2">
                      {r.incoming ? (
                        <>
                          {r.kind === "meeting" && (
                            <Button size="sm" onClick={() => onSchedule(r)}>
                              <CalendarPlus /> Schedule meeting
                            </Button>
                          )}
                          <Button size="sm" variant={r.kind === "meeting" ? "light" : "success"} onClick={() => setAnswer({ r, action: "accept" })}>
                            <Check /> {r.kind === "meeting" ? "Reply" : "Accept & reply"}
                          </Button>
                          <Button size="sm" variant="light" onClick={() => setAnswer({ r, action: "decline" })}>
                            <X /> Decline
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="light" onClick={() => setAnswer({ r, action: "close" })}>
                          Close request
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <RespondDialog value={answer} onClose={() => setAnswer(null)} />
    </>
  );
}

function RespondDialog({ value, onClose }: { value: { r: ConnectRequest; action: "accept" | "decline" | "close" } | null; onClose: () => void }) {
  const { role } = useMe();
  const respond = useRespondRequest(role);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const title = value
    ? {
        accept: "Accept & reply",
        decline: "Decline request",
        close: "Close request",
      }[value.action]
    : "";
  const submit = async () => {
    if (!value) return;
    if (value.action === "decline" && reply.trim().length < 3) return setError("Write why you are declining.");
    try {
      await respond.mutateAsync({
        id: value.r.id,
        action: value.action,
        reply: reply.trim() || undefined,
      });
      toast.success(`${value.r.id}: ${value.action === "accept" ? "accepted" : value.action === "decline" ? "declined" : "closed"}`, {
        description: value.action === "close" ? undefined : `${value.r.from?.name} has been notified.`,
      });
      setReply("");
      onClose();
    } catch (e) {
      if (e instanceof AuthError && e.fields?.length) setError(e.fields[0]!.message);
      else toast.error((e as Error).message);
    }
  };
  return (
    <Dialog
      open={!!value}
      onOpenChange={(o) => {
        if (!o) {
          setReply("");
          setError("");
          onClose();
        }
      }}
    >
      {value && (
        <DialogContent
          title={title}
          description={`${value.r.id} · ${value.r.subject}`}
          footer={
            <>
              <DialogClose asChild>
                <Button variant="light">Back</Button>
              </DialogClose>
              <Button variant={value.action === "decline" ? "danger" : "primary"} onClick={submit} disabled={respond.isPending}>
                <Send /> {respond.isPending ? "Sending…" : title}
              </Button>
            </>
          }
        >
          <Field label={value.action === "decline" ? "Reason" : "Reply (optional)"} htmlFor="reply" required={value.action === "decline"} error={error}>
            <Textarea
              id="reply"
              rows={4}
              maxLength={1000}
              autoFocus
              value={reply}
              onChange={(e) => {
                setReply(e.target.value);
                setError("");
              }}
            />
          </Field>
        </DialogContent>
      )}
    </Dialog>
  );
}
