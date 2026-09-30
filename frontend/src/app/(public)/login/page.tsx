import { Suspense } from "react";
import { LoginForm } from "@/features/auth/login-form";

export const metadata = { title: "Login" };

export default function LoginPage() {
  return (
    <div className="grid min-h-[calc(100vh-110px)] place-items-center bg-gradient-to-br from-primary-soft to-saffron-soft px-4 py-10">
      <Suspense fallback={<div className="h-[560px] w-full max-w-md animate-pulse rounded-2xl bg-white/70" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
