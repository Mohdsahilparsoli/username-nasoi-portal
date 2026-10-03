"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { useMe } from "@/components/layout/dashboard-shell";
import { AuthError } from "@/lib/api/auth";
import type { RequestKind } from "@/lib/api/connect";
import { useContacts, useCreateRequest } from "./hooks";
import { toLocalInput } from "./meeting-ui";

export interface RequestPreset {
  kind?: RequestKind;
  toId?: string;
  entryId?: string;
  subject?: string;
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  verifier: "Verifier",
  deo: "DEO",
};
type Errors = Partial<Record<"kind" | "toId" | "entryId" | "subject" | "message" | "preferredAt", string>>;

/** Send a request: "please set up a meeting", a question about an entry, or anything else. */
export function NewRequestDialog({ open, onOpenChange, preset }: { open: boolean; onOpenChange: (o: boolean) => void; preset?: RequestPreset }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <RequestForm preset={preset} onDone={() => onOpenChange(false)} />}
    </Dialog>
  );
}

/** Mounted each time the dialog opens, so it always starts fresh. */
function RequestForm({ preset, onDone }: { preset?: RequestPreset; onDone: () => void }) {
  const { role } = useMe();
  const contacts = useContacts(role);
  const create = useCreateRequest(role);
  const [kind, setKind] = useState<RequestKind>(preset?.kind ?? (preset?.entryId ? "entry" : "meeting"));
  const [chosen, setToId] = useState(preset?.toId ?? "");
  const [entryId, setEntryId] = useState(preset?.entryId ?? "");
  const [subject, setSubject] = useState(preset?.subject ?? "");
  const [message, setMessage] = useState("");
  const [preferredAt, setPreferredAt] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  const list = contacts.data ?? [];
  // Only one person to send to: choose them automatically.
  const toId = chosen || (list.length === 1 ? list[0]!.id : "");

  const clear = (k: keyof Errors) => setErrors((e) => ({ ...e, [k]: undefined }));
  const submit = async () => {
    const err: Errors = {};
    if (!toId) err.toId = "Choose who to send it to";
    if (kind === "entry" && !/^ENT\d{6,}$/i.test(entryId.trim())) err.entryId = "Enter the entry ID this request is about (e.g. ENT000123)";
    if (message.trim().length < 5) err.message = "Write your message (at least 5 characters)";
    if (preferredAt && new Date(preferredAt).getTime() < Date.now() - 5 * 60_000) err.preferredAt = "The preferred time is in the past";
    if (Object.keys(err).length) return setErrors(err);
    try {
      const r = await create.mutateAsync({
        kind,
        toId,
        entryId: entryId.trim().toUpperCase() || undefined,
        subject: subject.trim() || undefined,
        message: message.trim(),
        preferredAt: kind === "meeting" && preferredAt ? new Date(preferredAt).toISOString() : undefined,
      });
      toast.success(`${r.id} sent to ${r.to?.name ?? toId}`, {
        description: "They get a notification and an e-mail.",
      });
      onDone();
    } catch (e) {
      if (e instanceof AuthError && e.fields?.length) {
        const fe: Errors = {};
        for (const f of e.fields) fe[(f.path.split(".")[0] || "message") as keyof Errors] ??= f.message;
        setErrors(fe);
      } else toast.error((e as Error).message);
    }
  };

  return (
    <DialogContent
      title="New request"
      description="Ask for a meeting, or about an entry. The other person gets a notification and an e-mail and can answer here."
      className="w-[min(640px,calc(100%-24px))]"
      footer={
        <>
          <DialogClose asChild>
            <Button variant="light">Cancel</Button>
          </DialogClose>
          <Button onClick={submit} disabled={create.isPending}>
            <Send /> {create.isPending ? "Sending…" : "Send request"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2" label="Type of request" required>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Type of request">
            {(
              [
                ["meeting", "Meeting request"],
                ["entry", "About an entry"],
                ["general", "Other"],
              ] as const
            ).map(([v, label]) => (
              <label
                key={v}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm transition has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:checked]:text-primary"
              >
                <input
                  type="radio"
                  name="req-kind"
                  value={v}
                  checked={kind === v}
                  onChange={() => {
                    setKind(v);
                    clear("entryId");
                  }}
                  className="accent-[var(--color-primary)]"
                />
                {label}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Send to" htmlFor="r-to" required error={errors.toId}>
          <Select
            id="r-to"
            value={toId}
            onChange={(e) => {
              setToId(e.target.value);
              clear("toId");
            }}
          >
            <option value="">{contacts.isLoading ? "Loading…" : "-- Choose --"}</option>
            {list.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} – {c.id} ({ROLE_LABEL[c.role] ?? c.role})
              </option>
            ))}
          </Select>
        </Field>
        {kind === "entry" ? (
          <Field label="Entry ID" htmlFor="r-entry" required error={errors.entryId}>
            <Input
              id="r-entry"
              value={entryId}
              placeholder="ENT000123"
              onChange={(e) => {
                setEntryId(e.target.value);
                clear("entryId");
              }}
            />
          </Field>
        ) : kind === "meeting" ? (
          <Field label="Preferred time (optional)" htmlFor="r-when" error={errors.preferredAt}>
            <Input
              id="r-when"
              type="datetime-local"
              min={toLocalInput(new Date())}
              value={preferredAt}
              onChange={(e) => {
                setPreferredAt(e.target.value);
                clear("preferredAt");
              }}
            />
          </Field>
        ) : (
          <div />
        )}
        <Field className="sm:col-span-2" label="Subject (optional)" htmlFor="r-subject" error={errors.subject}>
          <Input
            id="r-subject"
            maxLength={120}
            value={subject}
            placeholder={kind === "meeting" ? "Request for a meeting" : kind === "entry" ? "Request about an entry" : "Request"}
            onChange={(e) => setSubject(e.target.value)}
          />
        </Field>
        <Field className="sm:col-span-2" label="Message" htmlFor="r-message" required error={errors.message}>
          <Textarea
            id="r-message"
            rows={5}
            maxLength={1000}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              clear("message");
            }}
            placeholder={kind === "entry" ? "e.g. I have corrected the UDISE code, please verify it first." : "Write your request"}
          />
        </Field>
      </div>
    </DialogContent>
  );
}
