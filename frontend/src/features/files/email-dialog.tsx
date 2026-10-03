"use client";

import { Mail, RotateCcw, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { Alert } from "@/components/ui/misc";
import { useAppSettings, useSaveMailTemplate } from "@/features/verification/hooks";
import { AuthError } from "@/lib/api/auth";
import type { EmailResult, MailRequest } from "@/lib/api/work";

/** Placeholders filled in by the server when the e-mail is sent. */
export const MAIL_PLACEHOLDERS: [string, string][] = [
  ["{report}", "what is attached, e.g. “DEO payouts report”"],
  ["{details}", "filters / number of entries"],
  ["{file}", "attached file name"],
  ["{date}", "today’s date"],
];

/** Shown only until the saved template has loaded. */
const FALLBACK = { subject: "NASOI – {report} ({date})", message: "Dear Sir / Madam,\n\nPlease find attached the {report}.\n\n{details}\n\nAttached file: {file}\n\nRegards,\nNASOI Admin" };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX = 10;
const LAST_TO = "nasoi.mail.lastTo";

/** "a@x.com, b@y.com" → list; returns an error message for a bad / missing address. */
export function checkAddresses(text: string, required: boolean): string {
  const list = [...new Set(text.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean))];
  if (!list.length) return required ? "Enter at least one e-mail address." : "";
  const bad = list.find((x) => !EMAIL_RE.test(x));
  if (bad) return `“${bad}” is not a valid e-mail address.`;
  if (list.length > MAX) return `At most ${MAX} addresses.`;
  return "";
}

const readLastTo = () => {
  try {
    return localStorage.getItem(LAST_TO) ?? "";
  } catch {
    return "";
  }
};
const writeLastTo = (v: string) => {
  try {
    localStorage.setItem(LAST_TO, v);
  } catch {
    /* storage not available */
  }
};

type Errors = Partial<Record<keyof MailRequest, string>>;

/**
 * "Send on e-mail" button + dialog.
 * - Admin: any custom addresses (To + CC, comma separated) and an editable
 *   subject / message, pre-filled from the default template (Settings). The
 *   text can be saved as the new default.
 * - With `fixedTo` (an employee's own e-mail) there is nothing to type.
 */
export function EmailFileButton({
  label = "Send on e-mail",
  title,
  description,
  fixedTo,
  children,
  send,
  variant = "light",
  disabled,
}: {
  label?: string;
  title: string;
  description?: React.ReactNode;
  fixedTo?: string;
  children?: React.ReactNode;
  send: (mail: MailRequest) => Promise<EmailResult>;
  variant?: "light" | "outline" | "primary";
  disabled?: boolean;
}) {
  const custom = !fixedTo;
  const [open, setOpen] = useState(false);
  const settings = useAppSettings(custom && open);
  const saveTpl = useSaveMailTemplate();
  const tpl = settings.data?.mailTemplate ?? FALLBACK;
  const [mail, setMail] = useState<MailRequest>({ to: "", cc: "", subject: "", message: "" });
  const [touchedText, setTouchedText] = useState(false);
  const [saveDefault, setSaveDefault] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  // Until the admin edits the text, it follows the saved template.
  const text = touchedText ? mail : { ...mail, subject: tpl.subject, message: tpl.message };

  const openDialog = () => {
    setMail({ to: readLastTo(), cc: "", subject: "", message: "" });
    setTouchedText(false);
    setSaveDefault(false);
    setErrors({});
    setOpen(true);
  };
  const set = (k: keyof MailRequest) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if ((k === "subject" || k === "message") && !touchedText) {
      setMail({ ...text, [k]: e.target.value });
      setTouchedText(true);
    } else setMail((m) => ({ ...m, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: undefined }));
  };
  const applyDefault = () => {
    setTouchedText(false);
    setErrors((x) => ({ ...x, subject: undefined, message: undefined }));
  };

  const submit = async () => {
    const out: MailRequest = fixedTo ? { to: fixedTo, cc: "", subject: "", message: "" } : { ...text, subject: text.subject.trim(), message: text.message.trim() };
    if (custom) {
      const err: Errors = {
        to: checkAddresses(out.to, true) || undefined,
        cc: checkAddresses(out.cc, false) || undefined,
        subject: out.subject.length < 3 ? "Enter the subject." : /[\r\n]/.test(out.subject) ? "Subject must be one line." : out.subject.length > 200 ? "Subject is too long (max 200)." : undefined,
        message: out.message.length < 10 ? "Enter the message." : out.message.length > 3000 ? "Message is too long (max 3000)." : undefined,
      };
      if (Object.values(err).some(Boolean)) return setErrors(err);
    }
    setBusy(true);
    try {
      const r = await send(out);
      if (custom) writeLastTo(out.to);
      if (custom && saveDefault) {
        try {
          await saveTpl.mutateAsync({ subject: out.subject, message: out.message });
        } catch {
          toast.error("E-mail sent, but the template could not be saved.");
        }
      }
      const cc = r.cc?.length ? ` (CC ${r.cc.join(", ")})` : "";
      toast.success(`Sent ${r.filename}`, { description: `To ${r.to.join(", ")}${cc}` });
      setOpen(false);
    } catch (e) {
      if (e instanceof AuthError && e.fields?.length) {
        const err: Errors = {};
        for (const f of e.fields) {
          const k = (["to", "cc", "subject", "message"] as const).find((x) => f.path === x || f.path.startsWith(`${x}.`)) ?? "to";
          err[k] ??= f.message;
        }
        setErrors(err);
      } else toast.error(e instanceof AuthError ? e.message : "The e-mail could not be sent. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant={variant} disabled={disabled} onClick={openDialog}><Mail /> {label}</Button>
      <DialogContent
        title={title}
        description={description}
        className={custom ? "w-[min(680px,calc(100%-24px))]" : undefined}
        footer={
          <>
            <DialogClose asChild><Button variant="light">Cancel</Button></DialogClose>
            <Button onClick={submit} disabled={busy}><Send /> {busy ? "Sending…" : "Send"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {children}
          {fixedTo ? (
            <p className="text-sm text-navy">The file will be sent to your registered e-mail: <b>{fixedTo}</b></p>
          ) : (
            <>
              <Field label="To" htmlFor="email-to" required error={errors.to} hint="One or more e-mail addresses, separated by commas (max 10).">
                <Input id="email-to" autoFocus value={mail.to} placeholder="accounts@example.com, manager@example.com" onChange={set("to")} aria-invalid={!!errors.to} />
              </Field>
              <Field label="CC" htmlFor="email-cc" error={errors.cc} hint="Optional">
                <Input id="email-cc" value={mail.cc} placeholder="name@example.com" onChange={set("cc")} aria-invalid={!!errors.cc} />
              </Field>
              <Field label="Subject" htmlFor="email-subject" required error={errors.subject}>
                <Input id="email-subject" maxLength={200} value={text.subject} onChange={set("subject")} aria-invalid={!!errors.subject} />
              </Field>
              <Field label="Message" htmlFor="email-message" required error={errors.message}>
                <Textarea id="email-message" rows={9} maxLength={3000} value={text.message} onChange={set("message")} aria-invalid={!!errors.message} />
              </Field>
              <Alert tone="blue">
                <span className="text-xs">
                  Filled in automatically: {MAIL_PLACEHOLDERS.map(([k, v], i) => <span key={k}>{i ? " · " : ""}<code className="font-semibold">{k}</code> = {v}</span>)}
                </span>
              </Alert>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-navy">
                  <input type="checkbox" className="size-4 accent-primary" checked={saveDefault} onChange={(e) => setSaveDefault(e.target.checked)} />
                  Save this subject and message as the default template
                </label>
                <Button type="button" size="sm" variant="ghost" onClick={applyDefault} disabled={!touchedText}><RotateCcw /> Use default template</Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
