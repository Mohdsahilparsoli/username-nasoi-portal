import { ArrowRight, Award, ClipboardList, GraduationCap, HandHeart, IdCard } from "lucide-react";
import Link from "next/link";
import { PageBanner } from "@/components/layout/page-banner";
import { Badge } from "@/components/ui/misc";

export const metadata = { title: "Services" };

/** Only Data Entry Services is live; the rest are shown as "Coming Soon". */
const SERVICES = [
  { icon: ClipboardList, t: "Data Entry Services", live: true },
  { icon: IdCard, t: "Student UHID Card Service", live: false },
  { icon: Award, t: "National Scholarship Eligibility Examination Test (NSEET)", live: false },
  { icon: HandHeart, t: "Students Education Support Services", live: false },
  { icon: GraduationCap, t: "Academic Management Services", live: false },
];

const FLOW: [string, string, string, React.ReactNode][] = [
  ["1. Assignment", "Super Admin", "Assigns a PIN code area, service and target to a DEO and a Verifier", <Badge key="a" tone="blue">New</Badge>],
  ["2. Entry", "DEO", "Fills the entry form for each record in the assigned area", <Badge key="b" tone="amber">Pending</Badge>],
  ["3. Verification", "Verifier", "Checks the entry against the source and approves or rejects it", <span key="c" className="flex gap-1"><Badge tone="green">Approved</Badge><Badge tone="red">Rejected</Badge></span>],
  ["4. Correction", "DEO", "Reads the rejection reason, corrects and resubmits the entry", <Badge key="d" tone="amber">Pending</Badge>],
  ["5. Payout", "Admin", "Approved entries are paid between 15th – 25th of the month", <Badge key="e" tone="green">Paid</Badge>],
];

export default function ServicesPage() {
  return (
    <>
      <PageBanner title="Services" subtitle="Services of National Academic Services of India" />
      <section className="py-14">
        <div className="mx-auto grid max-w-6xl gap-5 px-4 md:grid-cols-3">
          {SERVICES.map((s) =>
            s.live ? (
              <Link
                key={s.t}
                href="/login"
                className="group flex items-center gap-4 rounded-xl border-2 border-primary bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-white"><s.icon className="size-6" /></span>
                <span className="flex-1">
                  <span className="block text-lg font-semibold text-navy">{s.t}</span>
                  <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary">Login to start <ArrowRight className="size-4 transition group-hover:translate-x-0.5" /></span>
                </span>
              </Link>
            ) : (
              <div key={s.t} className="flex items-center gap-4 rounded-xl border border-line bg-white p-6 opacity-80 shadow-sm" aria-disabled="true">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-slate-100 text-muted"><s.icon className="size-6" /></span>
                <span className="flex-1">
                  <span className="block text-lg font-semibold text-navy">{s.t}</span>
                  <Badge tone="amber" className="mt-1">Coming Soon</Badge>
                </span>
              </div>
            ),
          )}
        </div>
      </section>
      <section className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-6 text-center text-3xl font-bold">Workflow</h2>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
                <tr><th className="px-4 py-3">Stage</th><th className="px-4 py-3">Who</th><th className="px-4 py-3">What happens</th><th className="px-4 py-3">Status shown</th></tr>
              </thead>
              <tbody>
                {FLOW.map(([s, w, d, b]) => (
                  <tr key={s} className="border-t border-line">
                    <td className="px-4 py-3 font-medium">{s}</td><td className="px-4 py-3">{w}</td><td className="px-4 py-3">{d}</td><td className="px-4 py-3">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
