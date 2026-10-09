import { TriangleAlert } from "lucide-react";
import { PageBanner } from "@/components/layout/page-banner";
import { Alert } from "@/components/ui/misc";

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

const DECLARATION = [
  "I acknowledge and accept that my engagement is strictly on a Contractual / Part-Time basis under the National Academic Services of India (NASOI) and does not amount to a Permanent Job.",
  "I shall perform data entry duties exclusively on the official portal / app provided by the company.",
  "If I fail to perform any work through my ID for 10 consecutive days, the company holds the right to automatically cancel my ID.",
  "I shall receive remuneration solely for accurate and verified data entries under a commission-based structure as per rates determined by NASOI, which are subject to periodic revision by the company.",
  "All data entered by me is the absolute property of the company. I shall not misuse, share or leak data under any circumstances, failing which legal action may be initiated against me.",
  "In the event of any rule violation, submission of incorrect data or prolonged inactivity, the company reserves the right to terminate my contract instantly.",
  "I have read, understood and unconditionally agreed to all the terms and conditions outlined above.",
];

export default function TermsPage() {
  return (
    <>
      <PageBanner title="Terms & Conditions" subtitle="Terms and Conditions & Self-Declaration – National Academic Services of India (NASOI) – Data Entry Operations" />
      <section className="py-12">
        <div className="mx-auto max-w-4xl rounded-xl border border-line bg-white p-6 shadow-sm sm:p-8">
          <Alert tone="amber" icon={TriangleAlert}>
            No registration fee, security deposit or payment of any kind is collected on this portal.
          </Alert>
          {SECTIONS.map(([h, items]) => (
            <div key={h} className="mt-6">
              <h3 className="text-lg font-semibold text-primary">{h}</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
                {items.map((i) => <li key={i}>{i}</li>)}
              </ul>
            </div>
          ))}
          <div className="mt-8 border-t border-line pt-6">
            <h3 className="text-lg font-semibold text-primary">Self-Declaration (Legal Format)</h3>
            <p className="mt-2 text-sm">
              I, <b>[Operator Full Name]</b>, S/o / D/o <b>[Father / Mother Name]</b>, resident of <b>[Complete Address]</b>, do hereby
              solemnly declare and affirm as follows:
            </p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm">
              {DECLARATION.map((d) => <li key={d}>{d}</li>)}
            </ol>
          </div>
        </div>
      </section>
    </>
  );
}
