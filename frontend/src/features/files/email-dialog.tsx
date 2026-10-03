"use client";

import { Mail, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/form-controls";
import { AuthError } from "@/lib/api/auth";
import type { EmailResult } from "@/lib/api/work";

/**
 * "Send on e-mail" button + dialog. With `fixedTo` (an employee's own e-mail)
 * there is nothing to type; otherwise the admin enters the address.
 */
export function EmailFileButton({
  label = "Send on e-mail",
  title,
  description,
  defaultTo = "",
  fixedTo,
  children,
  send,
  variant = "light",
  disabled,
}: {
  label?: string;
  title: string;
  description?: React.ReactNode;
  defaultTo?: string;
  fixedTo?: string;
  children?: React.ReactNode;
  send: (to: string) => Promise<EmailResult>;
  variant?: "light" | "outline" | "primary";
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(defaultTo);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const addr = (fixedTo ?? to).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) return setError("Enter a valid e-mail address.");
    setBusy(true);
    try {
      const r = await send(addr);
      toast.success(`Sent ${r.filename} to ${r.to}.`);
      setOpen(false);
    } catch (e) {
      const msg = e instanceof AuthError ? e.message : "The e-mail could not be sent. Please try again.";
      if (e instanceof AuthError && e.fields?.length) setError(e.fields[0].message);
      else toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant={variant} disabled={disabled} onClick={() => setOpen(true)}><Mail /> {label}</Button>
      <DialogContent
        title={title}
        description={description}
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
            <Field label="Send to (e-mail)" htmlFor="email-to" required error={error}>
              <Input id="email-to" type="email" autoFocus value={to} placeholder="name@example.com" onChange={(e) => { setTo(e.target.value); setError(""); }} />
            </Field>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
