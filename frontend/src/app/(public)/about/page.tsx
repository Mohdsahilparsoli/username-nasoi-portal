import Link from "next/link";
import { PageBanner } from "@/components/layout/page-banner";
import { Button } from "@/components/ui/button";

export const metadata = { title: "About" };

const Tick = ({ children }: { children: React.ReactNode }) => (
  <li className="flex gap-2.5">
    <span className="mt-1.5 inline-block h-[7px] w-3 shrink-0 -rotate-45 border-b-[2.5px] border-l-[2.5px] border-success" />
    {children}
  </li>
);

export default function AboutPage() {
  return (
    <>
      <PageBanner title="About NASOI" subtitle="Who we are and what this portal does" />
      <section className="py-14">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="text-2xl font-bold">Our mission</h2>
            <p className="mt-3 text-ink/90">
              National Academic Services of India (NASOI) is a demo project that models how school records – student
              results, school surveys and scholarship applications – can be digitised by a distributed team of Data
              Entry Operators working from home.
            </p>
            <p className="mt-3 text-ink/90">
              Every record entered by an operator is checked by a Verifier before it is accepted. Operators are paid
              only for verified, accurate entries, which keeps data quality high and payments fair and transparent.
            </p>
            <h3 className="mt-8 text-lg font-semibold">What makes the process reliable</h3>
            <ul className="mt-3 space-y-2">
              <Tick>Area-wise work allocation by the Super Admin</Tick>
              <Tick>Two-level process: entry by DEO, check by Verifier</Tick>
              <Tick>Clear rejection reasons so operators can correct mistakes</Tick>
              <Tick>Live earnings and month-wise payout history</Tick>
            </ul>
          </div>
          <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Eligibility</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <Tick>Class 5 or above passed, and a valid Aadhaar card</Tick>
              <Tick>Own Android mobile / tablet / laptop / desktop</Tick>
              <Tick>Reliable internet connection</Tick>
              <Tick>A bank account in your own name for payouts</Tick>
            </ul>
            <h3 className="mt-6 text-lg font-semibold">Work terms</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <Tick>Part-time, contractual, work from home</Tick>
              <Tick>Entries only through this portal</Tick>
              <Tick>Payout between 15th – 25th of each month</Tick>
            </ul>
            <Button asChild className="mt-6 w-full">
              <Link href="/register">Register now</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
