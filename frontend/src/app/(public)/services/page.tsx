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
    </>
  );
}
