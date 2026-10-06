"use client";

import { Calendar, CircleX, Clock, TrendingUp, TriangleAlert } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardHeader } from "@/components/ui/card";
import { Alert, EmptyState, PageHeader, Skeleton, StatCard } from "@/components/ui/misc";
import { useMyProfile } from "@/features/users/hooks";
import { useMySummary } from "@/features/work/hooks";
import { fmtMonth, money, monthKey } from "@/lib/utils";
import { BankAccount } from "@/features/bank/bank-account";

/** Month key in India time, matching the server's month-wise history. */
const thisMonthIST = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7);

export default function EarningsPage() {
  const summary = useMySummary();
  const profile = useMyProfile();
  const bank = profile.data?.profile?.bank;

  if (summary.isLoading) return <Skeleton className="h-96" />;
  if (summary.isError || !summary.data) return <Alert tone="red" icon={TriangleAlert}>Could not load your earnings. Please refresh the page.</Alert>;

  const { totals: s, monthly } = summary.data;
  const thisMonth = monthly.find((m) => m.month === (thisMonthIST() || monthKey(new Date())));
  const decided = s.approved + s.rejected;
  const chart = [...monthly].reverse().map((m) => ({ month: fmtMonth(m.month), Earnings: m.earnings }));

  return (
    <>
      <PageHeader title="Earnings & Monthly History" description="You are paid for approved entries only." />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gradient-to-br from-navy to-primary p-6 text-white">
        <div>
          <p className="text-sm text-slate-300">Total earnings (approved entries)</p>
          <p className="text-4xl font-bold text-[#ffb65c]">{money(s.earnings)}</p>
          <p className="text-sm text-slate-300">{s.approved} approved of {s.total} entries</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-300">Payout credited to</p>
          <BankAccount bank={bank} tone="light" className="text-right" />
          <p className="text-sm text-slate-300">Paid between 15th – 25th of every month</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="This month" value={money(thisMonth?.earnings)} icon={Calendar} tone="green" />
        <StatCard label="Pending verification" value={s.pending} icon={Clock} tone="amber" href="/deo/entries?status=pending" />
        <StatCard label="Rejected entries" value={s.rejected} icon={CircleX} tone="red" href="/deo/entries?status=rejected" />
        <StatCard label="Approval rate" value={decided ? `${Math.round((s.approved / decided) * 100)}%` : "—"} icon={TrendingUp} tone="blue" />
      </div>

      {!monthly.length ? (
        <Card><EmptyState icon={Calendar} text="No entries yet – your month-wise history will appear here." /></Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
          <Card>
            <CardHeader title="Earnings by month" />
            <div className="h-72 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip cursor={{ fill: "#e9effb" }} formatter={(v) => money(Number(v))} />
                  <Bar dataKey="Earnings" fill="#1c3f94" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card>
            <CardHeader title="Monthly history" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
                  <tr>{["Month", "Total", "Approved", "Rejected", "Pending", "Earnings"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {monthly.map((m) => (
                    <tr key={m.month} className="border-t border-line">
                      <td className="px-4 py-3 font-semibold text-navy">{fmtMonth(m.month)}</td>
                      <td className="px-4 py-3">{m.total}</td>
                      <td className="px-4 py-3">{m.approved}</td>
                      <td className="px-4 py-3">{m.rejected}</td>
                      <td className="px-4 py-3">{m.pending}</td>
                      <td className="px-4 py-3 font-semibold">{money(m.earnings)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
