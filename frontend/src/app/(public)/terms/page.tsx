import { TriangleAlert } from "lucide-react";
import { PageBanner } from "@/components/layout/page-banner";
import { Alert } from "@/components/ui/misc";

export const metadata = { title: "Terms & Conditions" };

const SECTIONS: [string, string[]][] = [
  ["1. Eligibility", [
    "The applicant must have passed at least Class 5 from a recognised school / board.",
    "The applicant must be an Indian citizen holding a valid Aadhaar card.",
    "The applicant must be between 18 and 65 years of age and have a bank account in their own name.",
    "Incomplete forms, or forms with false information, will be rejected without notice.",
  ]],
  ["2. Registration", [
    "Registration is free. On successful registration the operator receives an Employee ID and password.",
    "The following must be uploaded: Aadhaar card, bank passbook (first page) or cancelled cheque, passport size photo and signature.",
    "Aadhaar and bank details are used only to verify the operator's identity and to pay them. They are stored encrypted and shown only to the operator and the NASOI admin.",
  ]],
  ["3. Work methodology & technical requirements", [
    "All operators work strictly on a Work From Home basis.",
    "Data entry must be performed only on this portal. Offline entries are not accepted.",
    "Operators must have their own Android mobile / tablet / laptop / desktop with reliable internet.",
  ]],
  ["4. Payment structure", [
    "Remuneration is calculated on the number of approved entries × the rate set for the assignment (demo rate ₹10 per entry).",
    "Payments are processed between the 15th and 25th of each month into the operator's registered bank account (NEFT / RTGS / IMPS).",
    "Only accurate, verified entries are paid. Rejected entries can be corrected and resubmitted.",
  ]],
  ["5. Conduct & data protection", [
    "Incorrect or incomplete entries are treated as invalid and rejected with a reason.",
    "All data entered remains the property of the organisation and must not be shared or misused.",
    "An ID that stays inactive for 10 consecutive days, or that submits fraudulent data, may be deactivated by the admin.",
    "The engagement is part-time and contractual and does not constitute permanent employment.",
  ]],
];

export default function TermsPage() {
  return (
    <>
      <PageBanner title="Terms & Conditions" subtitle="Data Entry Operations – NASOI (demo)" />
      <section className="py-12">
        <div className="mx-auto max-w-4xl rounded-xl border border-line bg-white p-6 shadow-sm sm:p-8">
          <Alert tone="amber" icon={TriangleAlert}>
            This is a demo project. No registration fee, security deposit or payment of any kind is collected on this portal.
          </Alert>
          {SECTIONS.map(([h, items]) => (
            <div key={h} className="mt-6">
              <h3 className="text-lg font-semibold text-primary">{h}</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
                {items.map((i) => <li key={i}>{i}</li>)}
              </ul>
            </div>
          ))}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-primary">6. Self-declaration</h3>
            <p className="mt-2 text-sm">
              By registering, the operator declares that the information provided is true and correct, that they will
              perform data entry only on the official portal, and that they have read and agreed to these terms.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
