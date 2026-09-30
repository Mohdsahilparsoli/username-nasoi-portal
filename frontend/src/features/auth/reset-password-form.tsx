"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { CircleCheck, KeyRound, LogIn, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { Alert } from "@/components/ui/misc";
import * as authApi from "@/lib/api/auth";
import { AuthCard } from "./auth-card";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be at most 72 characters")
      .regex(/[A-Za-z]/, "Password must contain a letter")
      .regex(/\d/, "Password must contain a number"),
    password2: z.string().min(1, "Please re-enter the password"),
  })
  .refine((v) => v.password === v.password2, { path: ["password2"], message: "Passwords do not match" });
type Form = z.infer<typeof schema>;

/** Reads the token from the link (#token=…) once, then removes it from the address bar and history. */
function useResetToken() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    const t = new URLSearchParams(window.location.hash.slice(1)).get("token");
    if (t) window.history.replaceState(null, "", window.location.pathname);
    // Reading the URL is only possible after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(t);
  }, []);
  return token;
}

export function ResetPasswordForm() {
  const token = useResetToken();
  const [showPw, setShowPw] = useState(false);
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { password: "", password2: "" } });
  const reset = useMutation({ mutationFn: (v: Form) => authApi.resetPassword(token!, v.password) });
  const e = form.formState.errors;
  const expired = reset.error instanceof authApi.AuthError && reset.error.code === "BAD_RESET_LINK";

  if (token === undefined) return <AuthCard><div className="h-64" /></AuthCard>;

  if (!token || expired) {
    return (
      <AuthCard>
        <div className="space-y-4 p-6 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-danger-soft text-danger"><TriangleAlert className="size-7" /></span>
          <h1 className="text-xl font-bold">Link invalid or expired</h1>
          <p className="text-sm text-muted">This password reset link is not valid any more. Links work for 30 minutes and only once.</p>
          <Button asChild className="w-full"><Link href="/forgot-password">Request a new link</Link></Button>
        </div>
      </AuthCard>
    );
  }

  if (reset.isSuccess) {
    return (
      <AuthCard>
        <div className="space-y-4 p-6 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-success-soft text-success"><CircleCheck className="size-7" /></span>
          <h1 className="text-xl font-bold">Password changed</h1>
          <p className="text-sm text-muted">Your password has been reset. For your security you have been logged out on all devices.</p>
          <Button asChild className="w-full" size="lg"><Link href="/login"><LogIn /> Login with new password</Link></Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <form className="space-y-4 p-6" onSubmit={form.handleSubmit((v) => reset.mutate(v))} noValidate>
        <div>
          <h1 className="text-xl font-bold">Set a new password</h1>
          <p className="mt-0.5 text-sm text-muted">At least 8 characters, with letters and numbers.</p>
        </div>
        {reset.error && !expired && <Alert tone="red" icon={TriangleAlert}>{reset.error.message}</Alert>}
        <Field label="New password" htmlFor="password" error={e.password?.message}>
          <div className="relative">
            <Input id="password" type={showPw ? "text" : "password"} autoComplete="new-password" maxLength={72} className="pr-14" aria-invalid={!!e.password} {...form.register("password")} />
            <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary">
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
        </Field>
        <Field label="Confirm new password" htmlFor="password2" error={e.password2?.message}>
          <Input id="password2" type={showPw ? "text" : "password"} autoComplete="new-password" maxLength={72} aria-invalid={!!e.password2} {...form.register("password2")} />
        </Field>
        <Button type="submit" className="w-full" size="lg" disabled={reset.isPending}>
          <KeyRound /> {reset.isPending ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </AuthCard>
  );
}
