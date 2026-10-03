"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { LayoutDashboard, LogIn, TriangleAlert, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { Alert } from "@/components/ui/misc";
import * as authApi from "@/lib/api/auth";
import { ROLE_META } from "@/lib/constants";
import { useSessionStore } from "@/stores/session-store";
import { useSessionHydrated } from "@/stores/use-session-hydrated";
import { AuthCard } from "./auth-card";
import type { Role } from "@/types";

const schema = z.object({
  loginId: z.string().trim().min(1, "Enter your User ID, mobile number or email"),
  password: z.string().min(1, "Enter your password"),
});
type Form = z.infer<typeof schema>;

const ROLES: Role[] = ["deo", "verifier", "admin"];

export function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const sessions = useSessionStore((s) => s.sessions);
  const signIn = useSessionStore((s) => s.signIn);

  // Sessions come from browser storage, so only show them once loaded.
  const mounted = useSessionHydrated();

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { loginId: params.get("id") ?? "", password: "" },
  });

  const login = useMutation({
    mutationFn: (v: Form) => authApi.login(v.loginId, v.password),
    onSuccess: ({ user }) => {
      signIn(user.role, { id: user.id, name: user.name });
      router.push(ROLE_META[user.role].home);
    },
  });

  const active = mounted ? ROLES.filter((r) => sessions[r]) : [];

  return (
    <AuthCard>
      <form className="space-y-4 p-6" onSubmit={form.handleSubmit((v) => login.mutate(v))} noValidate>
        <div>
          <h1 className="text-xl font-bold">Login to your account</h1>
        </div>

        {login.error && (
          <Alert tone="red" icon={TriangleAlert}>
            {login.error.message}
          </Alert>
        )}

        <Field label="User ID / Mobile No. / Email ID" htmlFor="loginId" error={form.formState.errors.loginId?.message}>
          <Input id="loginId" autoComplete="username" placeholder="Enter User ID, mobile or email" aria-invalid={!!form.formState.errors.loginId} {...form.register("loginId")} />
        </Field>
        <Field label="Password" htmlFor="password" error={form.formState.errors.password?.message}>
          <div className="relative">
            <Input id="password" type={showPw ? "text" : "password"} autoComplete="current-password" placeholder="Enter password" className="pr-14" aria-invalid={!!form.formState.errors.password} {...form.register("password")} />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary">
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
        </Field>
        <div className="-mt-1 text-right">
          <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={login.isPending}>
          <LogIn /> {login.isPending ? "Logging in…" : "Login"}
        </Button>

        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-line" /> New user? <span className="h-px flex-1 bg-line" />
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href="/register"><UserPlus /> Create Registration</Link>
        </Button>

        {active.length > 0 && (
          <div className="border-t border-line pt-4">
            <p className="mb-2 text-xs text-muted">Already logged in on this browser:</p>
            <div className="grid gap-2">
              {active.map((r) => (
                <Link
                  key={r}
                  href={ROLE_META[r].home}
                  className="flex items-center gap-3 rounded-lg border border-line px-3 py-2 hover:border-primary hover:bg-primary-soft"
                >
                  <LayoutDashboard className="size-5 text-primary" />
                  <span className="leading-tight">
                    <b className="block text-sm text-navy">{sessions[r]!.name}</b>
                    <small className="text-xs text-muted">{sessions[r]!.id} · Continue to dashboard</small>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

      </form>
    </AuthCard>
  );
}
