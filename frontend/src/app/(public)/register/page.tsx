import Image from "next/image";
import { Suspense } from "react";
import { RegisterWizard } from "@/features/registration/register-wizard";

export const metadata = { title: "Registration Form" };

export default function RegisterPage() {
  return (
    <section className="py-10">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5">
          <Image src="/brand/logo.png" alt="NASOI logo" width={88} height={88} unoptimized className="size-16 shrink-0 sm:size-20" priority />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold sm:text-3xl">National Academic Services of India</h1>
            <p className="mt-0.5 text-sm font-semibold uppercase tracking-wider text-saffron-dark">Registration Form</p>
          </div>
        </div>
        <Suspense>
          <RegisterWizard />
        </Suspense>
      </div>
    </section>
  );
}
