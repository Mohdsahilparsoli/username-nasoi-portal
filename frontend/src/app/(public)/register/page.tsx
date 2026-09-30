import { RegisterWizard } from "@/features/registration/register-wizard";

export const metadata = { title: "DEO Registration" };

export default function RegisterPage() {
  return (
    <section className="py-10">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-saffron-dark">New Registration</p>
          <h1 className="text-2xl font-bold sm:text-3xl">Data Entry Operator Registration</h1>
          <p className="mt-1 text-sm text-muted">Complete all five steps. Name should be as per your education certificate.</p>
        </div>
        <RegisterWizard />
      </div>
    </section>
  );
}
