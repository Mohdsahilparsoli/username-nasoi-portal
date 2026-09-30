"use client";

import { CircleCheck, Users, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/form-controls";
import { Badge, EmptyState, PageHeader, Skeleton, StatCard } from "@/components/ui/misc";
import { useEntries } from "@/features/entries/hooks";
import { useUsers } from "@/features/users/hooks";
import { fmtMonth, maskAccount, money, monthlyHistory } from "@/lib/utils";

const TONE = { Paid: "green", "In progress": "blue", "Under verification": "amber" } as const;

export default function PayoutsPage() {
  const entries = useEntries();
  const deos = useUsers("deo");
  const months = useMemo(() => monthlyHistory(entries.data ?? []).map((m) => m.key), [entries.data]);
  const [picked, setPicked] = useState("");
  const month = picked || months[0] || "";

  const rows = useMemo(
    () =>
      (deos.data ?? [])
        .map((u) => ({ u, m: monthlyHistory((entries.data ?? []).filter((e) => e.deoId === u.id)).find((x) => x.key === month) }))
        .filter((r) => r.m && r.m.approved > 0),
    [deos.data, entries.data, month],
  );
  const total = rows.reduce((s, r) => s + r.m!.earnings, 0);
  const count = rows.reduce((s, r) => s + r.m!.approved, 0);

  if (entries.isLoading) return <Skeleton className="h-96" />;

  return (
    <>
      <PageHeader
        title="Payouts"
        description="Month-wise amount due to each operator (approved entries × rate)."
        action={
          <Select value={month} onChange={(e) => setPicked(e.target.value)} className="w-48">
            {months.map((k) => <option key={k} value={k}>{fmtMonth(k)}</option>)}
          </Select>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Operators to pay" value={rows.length} icon={Users} tone="blue" />
        <StatCard label="Approved entries" value={count} icon={CircleCheck} tone="green" />
        <StatCard label="Total amount" value={money(total)} icon={Wallet} tone="saffron" />
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
              <tr>{["Operator", "Bank", "Account", "IFSC", "Approved", "Amount", "Status"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map(({ u, m }) => (
                <tr key={u.id} className="border-t border-line">
                  <td className="px-4 py-3">{u.name} <span className="text-xs text-muted">({u.id})</span></td>
                  <td className="px-4 py-3">{u.bank?.bankName}</td>
                  <td className="px-4 py-3 font-mono text-xs">{maskAccount(u.bank?.account)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{u.bank?.ifsc}</td>
                  <td className="px-4 py-3">{m!.approved}</td>
                  <td className="px-4 py-3 font-semibold">{money(m!.earnings)}</td>
                  <td className="px-4 py-3"><Badge tone={TONE[m!.payout]}>{m!.payout}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <EmptyState icon={Wallet} text="No approved entries in this month." />}
        </div>
      </Card>
    </>
  );
}
