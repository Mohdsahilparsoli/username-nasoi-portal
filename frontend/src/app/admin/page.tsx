"use client";

import { Bell, CircleCheck, CircleX, ClipboardList, Clock, Target, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge, PageHeader, Skeleton, StatCard } from "@/components/ui/misc";
import { useEntries } from "@/features/entries/hooks";
import { useOperators, useWorkList } from "@/features/work/hooks";
import { fmtMonth, money, monthlyHistory, statsOf } from "@/lib/utils";

export default function AdminOverview() {
  const entries = useEntries();
  const deos = useOperators();
  const active = useWorkList({ status: "active" });
  if (entries.isLoading || deos.isLoading) return <Skeleton className="h-96" />;

  const all = entries.data ?? [];
  const s = statsOf(all);
  const d = deos.data ?? [];
  const eligible = d.filter((u) => u.eligible);
  const recent = [...d].sort((a, b) => (a.joinedAt < b.joinedAt ? 1 : -1)).slice(0, 6);
  const top = d
    .map((u) => ({ u, s: statsOf(all.filter((e) => e.deoId === u.id)) }))
    .sort((a, b) => b.s.approved - a.s.approved)
    .slice(0, 5);
  const chart = monthlyHistory(all).reverse().map((m) => ({ month: fmtMonth(m.key), Approved: m.approved, Rejected: m.rejected, Pending: m.pending }));

  return (
    <>
      <PageHeader
        title="Overview"
        description="Everything happening on the portal at a glance."
        action={<Button asChild><Link href="/admin/assign"><Target /> Assign Work</Link></Button>}
      />
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Operators" value={d.length} icon={Users} href="/admin/operators" />
        <StatCard label="Eligible for work" value={eligible.length} icon={Bell} tone="blue" href="/admin/operators" />
        <StatCard label="Total Entries" value={s.total} icon={ClipboardList} href="/admin/entries" />
        <StatCard label="Total Payable" value={money(s.earnings)} icon={Wallet} tone="saffron" href="/admin/payouts" />
        <StatCard label="Pending" value={s.pending} icon={Clock} tone="amber" href="/admin/entries?status=pending" />
        <StatCard label="Approved" value={s.approved} icon={CircleCheck} tone="green" href="/admin/entries?status=approved" />
        <StatCard label="Rejected" value={s.rejected} icon={CircleX} tone="red" href="/admin/entries?status=rejected" />
        <StatCard label="Active Assignments" value={active.data?.length ?? 0} icon={Target} tone="blue" href="/admin/assignments" />
      </div>

      <Card className="mb-6">
        <CardHeader title="Entries by month" />
        <div className="h-72 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
              <Tooltip cursor={{ fill: "#e9effb" }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Approved" stackId="a" fill="#138a3d" />
              <Bar dataKey="Rejected" stackId="a" fill="#c62828" />
              <Bar dataKey="Pending" stackId="a" fill="#f28a1e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Newly registered operators" action={<Link href="/admin/operators" className="text-sm text-primary hover:underline">All →</Link>} />
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
              <tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">District</th><th className="px-4 py-3">Work</th></tr>
            </thead>
            <tbody>
              {!recent.length && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-muted">No operator has registered yet.</td></tr>
              )}
              {recent.map((u) => {
                return (
                  <tr key={u.id} className="border-t border-line">
                    <td className="px-4 py-3 font-semibold text-navy">{u.id}</td>
                    <td className="px-4 py-3">{u.name}</td>
                    <td className="px-4 py-3 text-xs">{u.location ? `${u.location.district} – ${u.location.pincode}` : "—"}</td>
                    <td className="px-4 py-3">
                      {u.status === "blocked" ? (
                        <Badge tone="red">Blocked</Badge>
                      ) : u.currentAssignment ? (
                        <Badge tone="amber">{u.currentAssignment.id}</Badge>
                      ) : (
                        <Button asChild size="sm"><Link href={`/admin/assign?deo=${u.id}`}>Assign</Link></Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
        <Card>
          <CardHeader title="Top operators" />
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
              <tr><th className="px-4 py-3">Operator</th><th className="px-4 py-3">Approved</th><th className="px-4 py-3">Earnings</th></tr>
            </thead>
            <tbody>
              {top.map(({ u, s: st }) => (
                <tr key={u.id} className="border-t border-line">
                  <td className="px-4 py-3">{u.name} <span className="text-xs text-muted">({u.id})</span></td>
                  <td className="px-4 py-3">{st.approved}</td>
                  <td className="px-4 py-3">{money(st.earnings)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
