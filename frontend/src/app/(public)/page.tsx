import { ClipboardCheck, Keyboard, LogIn, ShieldCheck, UserPlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const STEPS = [
  { t: "Register", d: "Fill the multi-step registration form with personal, address and bank details. You instantly get an Employee ID and password." },
  { t: "Get assigned", d: "The Super Admin assigns you schools in an area, the task type and a target number of entries." },
  { t: "Enter data", d: "Add student records online from your dashboard. Each entry goes to a Verifier for checking." },
  { t: "Earn", d: "Every approved entry adds to your earnings. See totals and month-wise history anytime." },
];

const ROLES = [
  { icon: Keyboard, t: "Data Entry Operator (DEO)", items: ["Profile & banking details", "Assigned area & targets", "Pending / approved / rejected entries", "Rejection reason & resubmit", "Earnings & monthly history"] },
  { icon: ClipboardCheck, t: "Verifier (VR)", items: ["Queue of entries to verify", "Approve with one click", "Reject with a reason", "Approved / rejected history"] },
  { icon: ShieldCheck, t: "Super Admin", items: ["View all operators", "Assign area & task to a DEO", "Set rate per entry", "Monitor entries & payouts"] },
];

function Check() {
  return <span className="mt-1.5 inline-block h-[7px] w-3 shrink-0 -rotate-45 border-b-[2.5px] border-l-[2.5px] border-success" />;
}

export default function HomePage() {
  return (
    <>
      <section className="bg-gradient-to-br from-navy via-primary to-[#2a55b8] py-16 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <span className="inline-block rounded-full bg-saffron px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              School Data Entry Portal
            </span>
            <h1 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-5xl">
              Digitising school records, one entry at a time
            </h1>
            <p className="mt-4 max-w-xl text-blue-100">
              Register as a Data Entry Operator, get schools in your area assigned by the admin, enter student records
              online and track every entry – pending, approved or rejected – along with your earnings.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="saffron" size="lg">
                <Link href="/register"><UserPlus /> New Registration</Link>
              </Button>
              <Button asChild variant="onDark" size="lg">
                <Link href="/login"><LogIn /> Login</Link>
              </Button>
            </div>
          </div>
          <div className="relative mt-16 rounded-2xl bg-white p-5 text-ink shadow-2xl lg:mt-0">
            <Image src="/brand/logo.png" alt="NASOI" width={150} height={150} className="mx-auto -mt-24 mb-3 size-36 rounded-full bg-white p-1.5 shadow-xl" />
            <h4 className="text-center font-semibold">Operator dashboard preview</h4>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {[["Total Entries", "49", "text-navy"], ["Approved", "37", "text-success"], ["Pending", "5", "text-warning"], ["Earnings", "₹370", "text-navy"]].map(([l, v, c]) => (
                <div key={l} className="rounded-xl bg-canvas p-3">
                  <span className="block text-xs text-muted">{l}</span>
                  <b className={`text-2xl ${c}`}>{v}</b>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">₹10 per approved entry (demo rate)</p>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto mb-8 max-w-xl text-center">
            <h2 className="text-3xl font-bold">How it works</h2>
            <p className="mt-2 text-muted">Four simple steps from registration to payout.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.t} className="rounded-xl border border-line bg-white p-5 shadow-sm">
                <div className="mb-3 grid size-10 place-items-center rounded-full bg-saffron-soft font-bold text-saffron-dark">{i + 1}</div>
                <h3 className="text-lg font-semibold">{s.t}</h3>
                <p className="mt-1 text-sm text-muted">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-8 text-center text-3xl font-bold">Three roles, one portal</h2>
          <div className="grid gap-5 md:grid-cols-3">
            {ROLES.map((r) => (
              <div key={r.t} className="rounded-xl border border-line bg-white p-6 shadow-sm">
                <div className="mb-3 grid size-12 place-items-center rounded-xl bg-primary-soft text-primary">
                  <r.icon className="size-6" />
                </div>
                <h3 className="text-lg font-semibold">{r.t}</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {r.items.map((it) => (
                    <li key={it} className="flex gap-2.5"><Check />{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-saffron-soft py-12 text-center">
        <h2 className="text-2xl font-bold">Ready to start?</h2>
        <p className="mt-1 text-muted">Registration takes about 5 minutes.</p>
        <Button asChild className="mt-4" size="lg">
          <Link href="/register"><UserPlus /> Register as Data Entry Operator</Link>
        </Button>
      </section>
    </>
  );
}
