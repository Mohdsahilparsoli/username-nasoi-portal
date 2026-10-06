"use client";

import { Calendar, CircleCheck, ClipboardCheck, TriangleAlert, Wallet } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Alert, EmptyState, PageHeader, Skeleton, StatCard } from "@/components/ui/misc";
import { useMyProfile } from "@/features/users/hooks";
import { useVerifierSummary } from "@/features/verification/hooks";
import { fmtMonth, money } from "@/lib/utils";
import { BankAccount } from "@/features/bank/bank-account";

const thisMonthIST = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7);

export default function VerifierIncomePage() {
  const s = useVerifierSummary();
  const profile = useMyProfile();
  const bank = profile.data?.profile?.bank;

  if (s.isLoading) return <Skeleton className="h-96" />;
  if (s.isError || !s.data) return <Alert tone="red" icon={TriangleAlert}>Could not load your income. Please refresh the page.</Alert>;
  const d = s.data;
  const month = d.monthly.find((m) => m.month === thisMonthIST());

  return (
    <>
      <PageHeader title="Income & Monthly History" description="Your income from verified entries." />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gradient-to-br from-navy to-primary p-6 text-white">
        <div>
          <p className="text-sm text-slate-300">Total income</p>
          <p className="text-4xl font-bold text-[#ffb65c]">{money(d.income)}</p>
          <p className="text-sm text-slate-300">{d.approved + d.rejected} entries verified</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-300">Payout credited to</p>
          <BankAccount bank={bank} tone="light" className="text-right" />
          <p className="text-sm text-slate-300">Paid between 15th – 25th of every month</p>
        </div>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="This month" value={money(month?.income)} icon={Calendar} tone="green" />
        <StatCard label="Verified today" value={d.verifiedToday} icon={ClipboardCheck} tone="blue" />
        <StatCard label="Approved" value={d.approved} icon={CircleCheck} tone="green" href="/verifier/approved" />
        <StatCard label="Rejected" value={d.rejected} icon={Wallet} tone="red" href="/verifier/rejected" />
      </div>
      <Card>
        <CardHeader title="Monthly history" />
        {!d.monthly.length ? (
          <EmptyState icon={Calendar} text="No verified entries yet – your month-wise income will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
                <tr>{["Month", "Approved", "Rejected", "Verified", "Income"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
              </thead>
              <tbody>
                {d.monthly.map((m) => (
                  <tr key={m.month} className="border-t border-line">
                    <td className="px-4 py-3 font-semibold text-navy">{fmtMonth(m.month)}</td>
                    <td className="px-4 py-3">{m.approved}</td>
                    <td className="px-4 py-3">{m.rejected}</td>
                    <td className="px-4 py-3">{m.approved + m.rejected}</td>
                    <td className="px-4 py-3 font-semibold">{money(m.income)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
