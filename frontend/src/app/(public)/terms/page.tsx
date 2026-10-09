import { PageBanner } from "@/components/layout/page-banner";

export const metadata = { title: "Terms & Conditions" };

const SECTIONS: [string, string[]][] = [
  ["1. Work Methodology & Technical Requirements", [
    "All operators are required to perform duties strictly on a Work From Home basis.",
    "Data entry must be performed exclusively on the designated website or application provided by the company. No offline data entries shall be entertained or accepted.",
    "Operators must possess their own Android Mobile / Tablet / Laptop / Desktop with reliable internet connectivity to qualify for obtaining a User ID and Password.",
  ]],
  ["2. Payment Structure & Targets", [
    "Monthly Payment Cycle: The total payable remuneration, evaluated on the basis of volume and accuracy of data entries completed by the operator, shall be processed between the 15th and 25th day of each month.",
    "Bank Transfer: Within the stipulated duration, the total earned payment shall be transferred directly into the operator's verified registered bank account via electronic modes (NEFT / RTGS / IMPS).",
    "Payments shall be disbursed exclusively for accurate, verified and error-free data entries.",
    "The company shall not be liable for any technical failures, internet disruptions or personal device malfunctions.",
  ]],
  ["3. Conduct, Intellectual Property & Termination", [
    "Incorrect or incomplete data entries shall be treated as invalid and rejected.",
    "All data inputted by the operator shall remain the sole intellectual property of the company.",
    "Any form of data misuse, unauthorized sharing or leakage shall be deemed a severe legal offense, inviting strict legal proceedings.",
    "If an operator violates rules, submits fraudulent data, fails to comply with company policies, or remains inactive for 10 consecutive days, the company reserves the absolute right to terminate the contract immediately without prior notice. In such cases, no remuneration shall be granted for invalid or fraudulent entries.",
    "This engagement is strictly contractual and part-time under the National Academic Services of India (NASOI) and does not constitute a permanent job. No operator shall claim the status of a permanent employee of the company.",
  ]],
  ["4. Jurisdiction & Dispute Resolution", [
    "Any disputes arising herefrom shall be subject exclusively to the legal jurisdiction of the company's registered office.",
    "The decision of the court / arbitrator shall be final and binding on both parties.",
  ]],
];

export default function TermsPage() {
  return (
    <>
      <PageBanner title="Terms & Conditions" subtitle="National Academic Services of India (NASOI) – Data Entry Operations" />
      <section className="py-12">
        <div className="mx-auto max-w-4xl rounded-xl border border-line bg-white p-6 shadow-sm sm:p-8">
          {SECTIONS.map(([h, items], n) => (
            <div key={h} className={n ? "mt-6" : ""}>
              <h3 className="text-lg font-semibold text-primary">{h}</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
                {items.map((i) => <li key={i}>{i}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
