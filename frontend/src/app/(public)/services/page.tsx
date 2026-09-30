import { FileText, GraduationCap, School } from "lucide-react";
import { PageBanner } from "@/components/layout/page-banner";
import { Badge } from "@/components/ui/misc";

export const metadata = { title: "Services" };

const SERVICES = [
  { icon: GraduationCap, t: "Student Academic Records", d: "Class 10th and 12th student details from school registers – name, parents, date of birth, roll number, board and percentage." },
  { icon: School, t: "School Survey Forms", d: "Area-wise survey of schools and enrolled students, entered village by village or ward by ward." },
  { icon: FileText, t: "Scholarship Applications", d: "Digitising scholarship application forms received in batches so they can be processed faster." },
];

const FLOW: [string, string, string, React.ReactNode][] = [
  ["1. Assignment", "Super Admin", "Assigns an area, task type, target and rate to a DEO", <Badge key="a" tone="blue">New</Badge>],
  ["2. Entry", "DEO", "Fills the entry form for each record in the assigned area", <Badge key="b" tone="amber">Pending</Badge>],
  ["3. Verification", "Verifier", "Checks the entry against the source and approves or rejects it", <span key="c" className="flex gap-1"><Badge tone="green">Approved</Badge><Badge tone="red">Rejected</Badge></span>],
  ["4. Correction", "DEO", "Reads the rejection reason, corrects and resubmits the entry", <Badge key="d" tone="amber">Pending</Badge>],
  ["5. Payout", "Admin", "Approved entries × rate are paid between 15th – 25th of the month", <Badge key="e" tone="green">Paid</Badge>],
];

export default function ServicesPage() {
  return (
    <>
      <PageBanner title="Services" subtitle="Types of data entry work handled on the portal" />
      <section className="py-14">
        <div className="mx-auto grid max-w-6xl gap-5 px-4 md:grid-cols-3">
          {SERVICES.map((s) => (
            <div key={s.t} className="rounded-xl border border-line bg-white p-6 shadow-sm">
              <div className="mb-3 grid size-12 place-items-center rounded-xl bg-primary-soft text-primary">
                <s.icon className="size-6" />
              </div>
              <h3 className="text-lg font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-muted">{s.d}</p>
            </div>
          ))}
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
