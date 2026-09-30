"use client";

import { Calendar, Clock, CircleX, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMe } from "@/components/layout/dashboard-shell";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge, PageHeader, Skeleton, StatCard } from "@/components/ui/misc";
import { useEntries } from "@/features/entries/hooks";
import { useSettings } from "@/features/settings/hooks";
import { useUser } from "@/features/users/hooks";
import { fmtMonth, maskAccount, money, monthKey, monthlyHistory, statsOf } from "@/lib/utils";

const PAYOUT_TONE = { Paid: "green", "In progress": "blue", "Under verification": "amber" } as const;

export default function EarningsPage() {
  const me = useMe();
  const entries = useEntries(me.id);
  const user = useUser(me.id);
  const settings = useSettings();
  if (entries.isLoading) return <Skeleton className="h-96" />;

  const list = entries.data ?? [];
  const s = statsOf(list);
  const history = monthlyHistory(list);
  const thisMonth = history.find((m) => m.key === monthKey(new Date()));
  const rate = settings.data?.rate ?? 10;
  const chart = [...history].reverse().map((m) => ({ month: fmtMonth(m.key), Earnings: m.earnings }));
  const decided = s.approved + s.rejected;

  return (
    <>
      <PageHeader title="Earnings & Monthly History" description="You are paid for approved entries only." />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gradient-to-br from-navy to-primary p-6 text-white">
        <div>
          <p className="text-sm text-slate-300">Total earnings (approved entries)</p>
          <p className="text-4xl font-bold text-[#ffb65c]">{money(s.earnings)}</p>
          <p className="text-sm text-slate-300">{s.approved} approved entries</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-300">Payout credited to</p>
          <p className="font-semibold">{user.data?.bank ? `${user.data.bank.bankName} • ${maskAccount(user.data.bank.account)}` : "—"}</p>
          <p className="text-sm text-slate-300">Paid between {settings.data?.payoutWindow ?? "15th – 25th of every month"}</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="This month" value={money(thisMonth?.earnings)} icon={Calendar} tone="green" />
        <StatCard label="Pending (if approved)" value={money(s.pending * rate)} icon={Clock} tone="amber" />
        <StatCard label="Lost to rejection" value={money(s.rejected * rate)} icon={CircleX} tone="red" />
        <StatCard label="Approval rate" value={`${decided ? Math.round((s.approved / decided) * 100) : 0}%`} icon={TrendingUp} tone="blue" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader title="Earnings by month" />
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `₹${v}`} />
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
                <tr>{["Month", "Total", "Approved", "Rejected", "Pending", "Earnings", "Payout"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
              </thead>
              <tbody>
                {history.map((m) => (
                  <tr key={m.key} className="border-t border-line">
                    <td className="px-4 py-3 font-semibold text-navy">{fmtMonth(m.key)}</td>
                    <td className="px-4 py-3">{m.total}</td>
                    <td className="px-4 py-3">{m.approved}</td>
                    <td className="px-4 py-3">{m.rejected}</td>
                    <td className="px-4 py-3">{m.pending}</td>
                    <td className="px-4 py-3 font-semibold">{money(m.earnings)}</td>
                    <td className="px-4 py-3"><Badge tone={PAYOUT_TONE[m.payout]}>{m.payout}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
