"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, MailCheck, Send, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { Alert } from "@/components/ui/misc";
import * as authApi from "@/lib/api/auth";
import { AuthCard } from "./auth-card";

const schema = z.object({ email: z.string().trim().max(80).email("Enter your registered email ID") });
type Form = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { email: "" } });
  const send = useMutation({ mutationFn: (v: Form) => authApi.forgotPassword(v.email) });

  return (
    <AuthCard>
      {send.isSuccess ? (
        <div className="space-y-4 p-6 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-success-soft text-success"><MailCheck className="size-7" /></span>
          <h1 className="text-xl font-bold">Check your email</h1>
          <p className="text-sm text-muted">
            If an account exists with <b className="text-navy">{form.getValues("email")}</b>, we have sent a link to reset your password.
            The link is valid for 30 minutes. Please also check the spam folder.
          </p>
          <Button asChild variant="outline" className="w-full"><Link href="/login"><ArrowLeft /> Back to Login</Link></Button>
          <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => send.reset()}>
            Didn&apos;t get it? Send again
          </button>
        </div>
      ) : (
        <form className="space-y-4 p-6" onSubmit={form.handleSubmit((v) => send.mutate(v))} noValidate>
          <div>
            <h1 className="text-xl font-bold">Forgot password?</h1>
            <p className="mt-0.5 text-sm text-muted">Enter the email ID you registered with. We will email you a link to set a new password.</p>
          </div>
          {send.error && <Alert tone="red" icon={TriangleAlert}>{send.error.message}</Alert>}
          <Field label="Registered Email ID" htmlFor="email" error={form.formState.errors.email?.message}>
            <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={!!form.formState.errors.email} {...form.register("email")} />
          </Field>
          <Button type="submit" className="w-full" size="lg" disabled={send.isPending}>
            <Send /> {send.isPending ? "Sending…" : "Send reset link"}
          </Button>
          <p className="text-center text-sm">
            <Link href="/login" className="inline-flex items-center gap-1 font-medium text-primary hover:underline"><ArrowLeft className="size-4" /> Back to Login</Link>
          </p>
        </form>
      )}
    </AuthCard>
  );
}
