"use client";

import { CalendarPlus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { Alert, Badge } from "@/components/ui/misc";
import { useMe } from "@/components/layout/dashboard-shell";
import { Avatar } from "@/features/records/person-card";
import { useMyProfile } from "@/features/users/hooks";
import { AuthError } from "@/lib/api/auth";
import { useContacts, useCreateMeeting } from "./hooks";
import { PLATFORM, PlatformMark, platformOf, toLocalInput } from "./meeting-ui";
import { cn } from "@/lib/utils";

export interface MeetingPreset {
  participantIds?: string[];
  entryId?: string;
  requestId?: string;
  title?: string;
  startsAt?: string;
  /** Shown above the form, e.g. "Answering REQ000004 from Rahul Kumar". */
  note?: string;
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  verifier: "Verifier",
  deo: "DEO",
};
const DURATIONS = [15, 30, 45, 60, 90, 120];

type Errors = Partial<Record<"title" | "link" | "startsAt" | "durationMin" | "participantIds" | "entryId" | "notes", string>>;

/**
 * Schedule a Zoom / Google Meet meeting: title, link, date & time (IST),
 * duration, who joins. Everyone gets a notification and an e-mail with the link.
 */
export function ScheduleMeetingDialog({ open, onOpenChange, preset }: { open: boolean; onOpenChange: (o: boolean) => void; preset?: MeetingPreset }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <ScheduleForm preset={preset} onDone={() => onOpenChange(false)} />}
    </Dialog>
  );
}

/** Next half hour, at least an hour from now. */
function defaultStart() {
  const start = new Date(Date.now() + 60 * 60_000);
  start.setMinutes(start.getMinutes() < 30 ? 30 : 60, 0, 0);
  return start;
}

/** Mounted each time the dialog opens, so it always starts fresh. */
function ScheduleForm({ preset, onDone }: { preset?: MeetingPreset; onDone: () => void }) {
  const { role, id: myId } = useMe();
  const contacts = useContacts(role);
  const profile = useMyProfile();
  const create = useCreateMeeting(role);
  const [title, setTitle] = useState(preset?.title ?? "");
  const [link, setLink] = useState(profile.data?.meetingLink ?? "");
  const [startsAt, setStartsAt] = useState(() => toLocalInput(preset?.startsAt ? new Date(preset.startsAt) : defaultStart()));
  const [durationMin, setDuration] = useState(30);
  const [notes, setNotes] = useState("");
  const [entryId, setEntryId] = useState(preset?.entryId ?? "");
  const [people, setPeople] = useState<string[]>(preset?.participantIds ?? []);
  const [q, setQ] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  const platform = platformOf(link);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (contacts.data ?? []).filter((c) => c.id !== myId && (!s || `${c.id} ${c.name}`.toLowerCase().includes(s)));
  }, [contacts.data, q, myId]);
  const toggle = (id: string) => {
    setPeople((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    setErrors((e) => ({ ...e, participantIds: undefined }));
  };

  const submit = async () => {
    const err: Errors = {};
    if (title.trim().length < 3) err.title = "Enter the meeting title";
    if (!link.trim()) err.link = "Paste the Zoom or Google Meet link";
    else if (!platform) err.link = "Use a Zoom, Google Meet or Microsoft Teams link starting with https://";
    const when = startsAt ? new Date(startsAt) : null;
    if (!when || Number.isNaN(when.getTime())) err.startsAt = "Choose the date and time";
    else if (when.getTime() < Date.now() - 5 * 60_000) err.startsAt = "The meeting time is in the past";
    if (!people.length && !preset?.requestId) err.participantIds = "Choose who should join";
    if (entryId && !/^ENT\d{6,}$/i.test(entryId.trim())) err.entryId = "Enter a valid entry ID (e.g. ENT000123)";
    if (Object.keys(err).length) return setErrors(err);
    try {
      const m = await create.mutateAsync({
        title: title.trim(),
        link: link.trim(),
        startsAt: when!.toISOString(),
        durationMin,
        notes: notes.trim() || undefined,
        participantIds: people,
        entryId: entryId.trim().toUpperCase() || undefined,
        requestId: preset?.requestId,
      });
      toast.success(`${m.id} scheduled`, {
        description: `${m.participants.length - 1} people invited – they get a notification and an e-mail.`,
      });
      onDone();
    } catch (e) {
      if (e instanceof AuthError && e.fields?.length) {
        const fe: Errors = {};
        for (const f of e.fields) fe[(f.path.split(".")[0] || "link") as keyof Errors] ??= f.message;
        setErrors(fe);
      } else toast.error((e as Error).message);
    }
  };

  return (
    <DialogContent
      title="Schedule a meeting"
      description="Zoom or Google Meet. Everyone you invite gets a notification and an e-mail with the link and time."
      className="w-[min(760px,calc(100%-24px))]"
      footer={
        <>
          <DialogClose asChild>
            <Button variant="light">Cancel</Button>
          </DialogClose>
          <Button onClick={submit} disabled={create.isPending}>
            <CalendarPlus /> {create.isPending ? "Scheduling…" : "Schedule & send invite"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {preset?.note && (
          <Alert tone="blue" className="sm:col-span-2">
            {preset.note}
          </Alert>
        )}
        <Field className="sm:col-span-2" label="Meeting title" htmlFor="m-title" required error={errors.title}>
          <Input
            id="m-title"
            maxLength={120}
            value={title}
            placeholder="e.g. Corrections in rejected entries"
            onChange={(e) => {
              setTitle(e.target.value);
              setErrors((x) => ({ ...x, title: undefined }));
            }}
          />
        </Field>
        <Field
          className="sm:col-span-2"
          label="Zoom / Google Meet link"
          htmlFor="m-link"
          required
          error={errors.link}
          hint={
            profile.data?.meetingLink && link === profile.data.meetingLink
              ? "Your saved meeting room (Profile). You can paste a different link."
              : "Create the meeting in Zoom or Google Meet and paste its link here."
          }
        >
          <div className="flex items-center gap-2">
            <PlatformMark platform={platform} className={cn(!platform && "opacity-40")} />
            <Input
              id="m-link"
              value={link}
              placeholder="https://zoom.us/j/… or https://meet.google.com/…"
              onChange={(e) => {
                setLink(e.target.value);
                setErrors((x) => ({ ...x, link: undefined }));
              }}
            />
          </div>
          {platform && <span className={cn("mt-1 text-xs font-semibold", PLATFORM[platform].text)}>✓ {PLATFORM[platform].label} meeting</span>}
        </Field>
        <Field label="Date & time (IST)" htmlFor="m-start" required error={errors.startsAt}>
          <Input
            id="m-start"
            type="datetime-local"
            value={startsAt}
            min={toLocalInput(new Date())}
            onChange={(e) => {
              setStartsAt(e.target.value);
              setErrors((x) => ({ ...x, startsAt: undefined }));
            }}
          />
        </Field>
        <Field label="Duration" htmlFor="m-duration">
          <Select id="m-duration" value={durationMin} onChange={(e) => setDuration(Number(e.target.value))}>
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d < 60 ? `${d} minutes` : `${d / 60} hour${d > 60 ? "s" : ""}`}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          className="sm:col-span-2"
          label={`Who should join${people.length ? ` (${people.length})` : ""}`}
          required={!preset?.requestId}
          error={errors.participantIds}
        >
          <div className="rounded-lg border border-line">
            <div className="relative border-b border-line">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name or ID"
                className="h-10 w-full rounded-t-lg bg-transparent pl-9 pr-3 text-sm outline-none"
                aria-label="Search people"
              />
            </div>
            <ul className="max-h-52 divide-y divide-line overflow-y-auto">
              {contacts.isLoading && <li className="p-3 text-sm text-muted">Loading…</li>}
              {!contacts.isLoading && !list.length && <li className="p-3 text-sm text-muted">Nobody found. You can invite the people you work with.</li>}
              {list.map((c) => (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-canvas">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={people.includes(c.id)}
                      onChange={() => toggle(c.id)}
                      aria-label={`Invite ${c.name}`}
                    />
                    <Avatar person={c} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-navy">{c.name}</span>
                      <span className="text-xs text-muted">{c.id}</span>
                    </span>
                    <Badge tone={c.role === "admin" ? "saffron" : c.role === "verifier" ? "blue" : "grey"}>{ROLE_LABEL[c.role] ?? c.role}</Badge>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </Field>
        <Field label="About entry (optional)" htmlFor="m-entry" error={errors.entryId}>
          <Input
            id="m-entry"
            value={entryId}
            placeholder="ENT000123"
            onChange={(e) => {
              setEntryId(e.target.value);
              setErrors((x) => ({ ...x, entryId: undefined }));
            }}
          />
        </Field>
        <Field className="sm:col-span-2" label="Notes / agenda (optional)" htmlFor="m-notes" error={errors.notes}>
          <Textarea id="m-notes" rows={3} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What will be discussed" />
        </Field>
      </div>
    </DialogContent>
  );
}
