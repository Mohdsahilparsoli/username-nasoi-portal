"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { LayoutDashboard, LogIn, TriangleAlert } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { Alert } from "@/components/ui/misc";
import * as api from "@/lib/api";
import { ROLE_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/session-store";
import { useSessionHydrated } from "@/stores/use-session-hydrated";
import type { Role } from "@/types";

const schema = z.object({
  loginId: z.string().trim().min(1, "Enter your Registration ID, mobile or email"),
  password: z.string().min(1, "Enter your password"),
});
type Form = z.infer<typeof schema>;

const ROLES: Role[] = ["deo", "verifier", "admin"];
const TITLES: Record<Role, string> = {
  deo: "Data Entry Operator Login",
  verifier: "Verifier (VR) Login",
  admin: "Super Admin Login",
};

export function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const initialRole = (ROLES as string[]).includes(params.get("role") ?? "") ? (params.get("role") as Role) : "deo";
  const [role, setRole] = useState<Role>(initialRole);
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
    mutationFn: (v: Form) => api.login(role, v.loginId, v.password),
    onSuccess: (user) => {
      signIn(role, { id: user.id, name: user.name });
      router.push(ROLE_META[role].home);
    },
  });

  const current = mounted ? sessions[role] : undefined;
  const active = mounted ? ROLES.filter((r) => sessions[r]) : [];

  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
      <div className="px-6 pt-6 text-center">
        <Image src="/brand/logo.png" alt="NASOI" width={92} height={92} className="mx-auto size-[88px]" />
        <p className="mt-2 font-semibold text-primary">National Academic Services of India</p>
        <p className="text-xs text-muted">School Data Entry Portal</p>
      </div>

      <div className="mt-4 flex border-b border-line" role="tablist">
        {ROLES.map((r) => (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={role === r}
            onClick={() => {
              setRole(r);
              login.reset();
            }}
            className={cn(
              "flex-1 border-b-[3px] px-2 py-3 text-sm font-semibold transition",
              role === r ? "border-saffron bg-white text-primary" : "border-transparent bg-canvas text-muted hover:text-navy",
            )}
          >
            {r === "deo" ? "DEO Login" : r === "verifier" ? "Verifier (VR)" : "Admin"}
          </button>
        ))}
      </div>

      <form className="space-y-4 p-6" onSubmit={form.handleSubmit((v) => login.mutate(v))} noValidate>
        <h1 className="text-xl font-bold">{TITLES[role]}</h1>

        {current && (
          <Alert tone="blue">
            Already logged in as <b>{current.name}</b>. <Link href={ROLE_META[role].home}>Open dashboard</Link> or log in again below.
          </Alert>
        )}
        {login.error && (
          <Alert tone="red" icon={TriangleAlert}>
            {login.error.message}
          </Alert>
        )}

        <Field label="Registration ID / Mobile No. / Email ID" htmlFor="loginId" error={form.formState.errors.loginId?.message}>
          <Input id="loginId" autoComplete="username" placeholder="e.g. DEO126 or 9717323761" aria-invalid={!!form.formState.errors.loginId} {...form.register("loginId")} />
        </Field>
        <Field label="Password" htmlFor="password" error={form.formState.errors.password?.message}>
          <div className="relative">
            <Input id="password" type={showPw ? "text" : "password"} autoComplete="current-password" placeholder="Enter password" className="pr-14" aria-invalid={!!form.formState.errors.password} {...form.register("password")} />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary">
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
        </Field>

        <Button type="submit" className="w-full" size="lg" disabled={login.isPending}>
          <LogIn /> {login.isPending ? "Logging in…" : "Login"}
        </Button>

        {role === "deo" && (
          <p className="text-center text-sm text-muted">
            New user? <Link href="/register" className="font-medium text-primary hover:underline">Register as Data Entry Operator</Link>
          </p>
        )}

        <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 bg-canvas p-3 text-[13px]">
          <div>
            <b>Demo login</b>
            <div className="mt-0.5">
              ID: <code className="rounded border border-line bg-white px-1.5">{ROLE_META[role].demoId}</code> &nbsp;Password:{" "}
              <code className="rounded border border-line bg-white px-1.5">{ROLE_META[role].demoPw}</code>
            </div>
          </div>
          <Button
            type="button"
            variant="light"
            size="sm"
            onClick={() => {
              form.setValue("loginId", ROLE_META[role].demoId);
              form.setValue("password", ROLE_META[role].demoPw);
              form.clearErrors();
            }}
          >
            Use
          </Button>
        </div>

        {active.length > 0 && (
          <div className="border-t border-line pt-4">
            <p className="mb-2 text-xs text-muted">Logged-in panels in this browser (open in new tab):</p>
            <div className="grid gap-2">
              {active.map((r) => (
                <a
                  key={r}
                  href={ROLE_META[r].home}
                  target="_blank"
                  rel="noopener"
                  className={cn("flex items-center gap-3 rounded-lg border px-3 py-2 hover:border-primary hover:bg-primary-soft", r === role ? "border-saffron" : "border-line")}
                >
                  <LayoutDashboard className="size-5 text-primary" />
                  <span className="leading-tight">
                    <b className="block text-sm text-navy">{sessions[r]!.name}</b>
                    <small className="text-xs text-muted">{ROLE_META[r].label} • {sessions[r]!.id}</small>
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
        <p className="text-center text-xs text-muted">Tip: DEO, Verifier and Admin can all stay logged in together – open each in a separate tab.</p>
      </form>
    </div>
  );
}
