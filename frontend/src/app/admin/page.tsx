"use client";

import {
  AlarmClock, CalendarClock, CircleCheck, CircleX, ClipboardList, Clock, HandCoins, Inbox, School, Target, UserCheck, UserPlus, Users, Wallet,
} from "lucide-react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Alert, Badge, PageHeader, Skeleton, StatCard } from "@/components/ui/misc";
import { useAdminOverview } from "@/features/connect/hooks";
import { JoinMeetingButton, PlatformMark, istDay, istTime, relativeTime } from "@/features/connect/meeting-ui";
import { EmployeeStatusBadge } from "@/features/work/employee-status";
import type { EmployeeStatus } from "@/lib/api/work";
import { fmtDate, fmtDateTime, fmtMonth, money } from "@/lib/utils";

const C = { approved: "#138a3d", rejected: "#c62828", pending: "#f28a1e" };

/** Super Admin dashboard – every number comes from the database (GET /admin/overview, refreshed every minute). */
export default function AdminOverview() {
  const q = useAdminOverview();
  if (q.isLoading) return <Skeleton className="h-96" />;
  const o = q.data;
  if (!o) return <Alert tone="red">{q.error instanceof Error ? q.error.message : "Could not load the dashboard."} Please refresh the page.</Alert>;

  const chart = o.monthly.map((m) => ({ month: fmtMonth(m.month), Approved: m.approved, Rejected: m.rejected, Pending: m.pending }));
  const decided = o.entries.approved + o.entries.rejected;
  const approvalRate = decided ? Math.round((o.entries.approved / decided) * 100) : 0;
  const pendingNew = o.employees.deo.pending + o.employees.verifier.pending;

  return (
    <>
      <PageHeader
        title="Overview"
        description={`Live figures from the database · updated ${fmtDateTime(o.generatedAt)}`}
        action={<Button asChild><Link href="/admin/assign"><Target /> Assign Work</Link></Button>}
      />

      {(pendingNew > 0 || o.openRequests > 0 || o.work.overdue > 0) && (
        <div className="mb-5 space-y-2">
          {pendingNew > 0 && (
            <Alert tone="blue" icon={UserPlus}>
              <b>{pendingNew}</b> new registration{pendingNew > 1 ? "s" : ""} waiting for approval ({o.employees.deo.pending} DEO, {o.employees.verifier.pending} verifier).{" "}
              <Link href="/admin/operators?status=pending" className="font-semibold underline">Review</Link>
            </Alert>
          )}
          {o.work.overdue > 0 && (
            <Alert tone="amber" icon={AlarmClock}>
              <b>{o.work.overdue}</b> active assignment{o.work.overdue > 1 ? "s are" : " is"} past the deadline. <Link href="/admin/assignments" className="font-semibold underline">Open</Link>
            </Alert>
          )}
          {o.openRequests > 0 && (
            <Alert tone="amber" icon={Inbox}>
              <b>{o.openRequests}</b> request{o.openRequests > 1 ? "s" : ""} waiting for your answer. <Link href="/admin/connect?tab=requests" className="font-semibold underline">Answer</Link>
            </Alert>
          )}
        </div>
      )}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Entries</h2>
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total entries" value={o.entries.total} icon={ClipboardList} href="/admin/entries" />
        <StatCard label="Pending verification" value={o.entries.pending} icon={Clock} tone="amber" href="/admin/entries?status=pending" />
        <StatCard label="Approved" value={o.entries.approved} icon={CircleCheck} tone="green" href="/admin/entries?status=approved" />
        <StatCard label="Rejected" value={o.entries.rejected} icon={CircleX} tone="red" href="/admin/entries?status=rejected" />
        <StatCard label="Submitted today" value={o.entries.submittedToday} icon={ClipboardList} tone="blue" href="/admin/entries" />
        <StatCard label="Approval rate" value={`${approvalRate}%`} icon={CircleCheck} tone="green" />
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">People, work and money</h2>
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="DEOs (active / total)" value={`${o.employees.deo.active} / ${o.employees.deo.total}`} icon={Users} href="/admin/operators?role=deo" />
        <StatCard label="Verifiers (active / total)" value={`${o.employees.verifier.active} / ${o.employees.verifier.total}`} icon={UserCheck} tone="blue" href="/admin/operators?role=verifier" />
        <StatCard label="DEOs free for work" value={o.employees.deo.eligible} icon={Target} tone="blue" href="/admin/assign" />
        <StatCard label="Active assignments" value={o.work.active} icon={Target} tone="navy" href="/admin/assignments" />
        <StatCard label="Total earned" value={money(o.money.earned)} icon={Wallet} tone="saffron" href="/admin/payouts" />
        <StatCard label="Balance to pay" value={money(o.money.balance)} icon={HandCoins} tone="amber" href="/admin/payouts" />
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Entries by month (last 12 months)" />
          <div className="h-72 p-4">
            {chart.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "#e9effb" }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Approved" stackId="a" fill={C.approved} stroke="#fff" strokeWidth={1} maxBarSize={48} />
                  <Bar dataKey="Rejected" stackId="a" fill={C.rejected} stroke="#fff" strokeWidth={1} maxBarSize={48} />
                  <Bar dataKey="Pending" stackId="a" fill={C.pending} stroke="#fff" strokeWidth={1} radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="grid h-full place-items-center text-sm text-muted">No entries yet.</p>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Money (only final approvals earn)" action={<Link href="/admin/payouts" className="text-sm text-primary hover:underline">Payouts →</Link>} />
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
              <tr><th className="px-4 py-2.5"></th><th className="px-4 py-2.5 text-right">Earned</th><th className="px-4 py-2.5 text-right">Paid</th><th className="px-4 py-2.5 text-right">Balance</th></tr>
            </thead>
            <tbody>
              {[
                ["DEOs", o.money.deoEarned, o.money.deoPaid],
                ["Verifiers", o.money.verifierEarned, o.money.verifierPaid],
              ].map(([k, e, p]) => (
                <tr key={k as string} className="border-t border-line">
                  <td className="px-4 py-3 font-semibold text-navy">{k}</td>
                  <td className="px-4 py-3 text-right">{money(e as number)}</td>
                  <td className="px-4 py-3 text-right">{money(p as number)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{money((e as number) - (p as number))}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-line bg-slate-50 font-bold text-navy">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right">{money(o.money.earned)}</td>
                <td className="px-4 py-3 text-right">{money(o.money.paid)}</td>
                <td className="px-4 py-3 text-right text-saffron-dark">{money(o.money.balance)}</td>
              </tr>
            </tbody>
          </table>
          <div className="grid grid-cols-2 gap-3 border-t border-line p-4 text-sm">
            <div><p className="text-xs text-muted">Schools / Colleges</p><p className="font-semibold text-navy"><School className="mr-1 inline size-4" />{o.entries.schools} / {o.entries.colleges}</p></div>
            <div><p className="text-xs text-muted">Decided today</p><p className="font-semibold text-navy">{o.entries.approvedToday} approved · {o.entries.rejectedToday} rejected</p></div>
            <div><p className="text-xs text-muted">Payments recorded</p><p className="font-semibold text-navy">{o.money.payments}</p></div>
            <div><p className="text-xs text-muted">Work completed / cancelled</p><p className="font-semibold text-navy">{o.work.completed} / {o.work.cancelled}</p></div>
          </div>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <RankTable
          title="Top Data Entry Operators"
          href="/admin/operators?role=deo"
          head={["Operator", "Approved", "Pending", "Rejected", "Earned"]}
          rows={o.topDeos.map((d) => [d.id, d.name, d.approved, d.pending, d.rejected, money(d.earned)])}
          empty="No entries yet."
        />
        <RankTable
          title="Top Verifiers"
          href="/admin/operators?role=verifier"
          head={["Verifier", "Approved", "Rejected", "Earned"]}
          rows={o.topVerifiers.map((v) => [v.id, v.name, v.approved, v.rejected, money(v.earned)])}
          empty="No verification yet."
        />
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader title="Verification queue" action={<span className="text-xs text-muted">pending per verifier</span>} />
          <ul className="divide-y divide-line">
            {!o.queue.length && <li className="px-5 py-4 text-sm text-muted">Nothing waiting – all entries are verified.</li>}
            {o.queue.map((q) => (
              <li key={q.id ?? "none"} className="flex items-center gap-3 px-5 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  {q.id ? (
                    <Link href={`/admin/operators/${q.id}`} className="font-semibold text-navy hover:underline">{q.name} <span className="font-normal text-muted">({q.id})</span></Link>
                  ) : (
                    <span className="font-semibold text-danger">Not assigned to a verifier</span>
                  )}
                  <p className="text-xs text-muted">oldest waiting since {fmtDate(q.oldest)}</p>
                </div>
                <Badge tone="amber">{q.pending}</Badge>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Top districts" />
          <ul className="divide-y divide-line">
            {!o.topDistricts.length && <li className="px-5 py-4 text-sm text-muted">No entries yet.</li>}
            {o.topDistricts.map((d) => (
              <li key={`${d.state}|${d.district}`} className="px-5 py-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-semibold text-navy">{d.district}<span className="font-normal text-muted">, {d.state}</span></span>
                  <span className="text-muted">{d.entries} entries</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${d.approved} of ${d.entries} approved`}>
                  <div className="h-full rounded-full bg-success" style={{ width: `${d.entries ? (d.approved / d.entries) * 100 : 0}%` }} />
                </div>
                <p className="mt-0.5 text-[11px] text-muted">{d.approved} approved</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Upcoming meetings" action={<Link href="/admin/connect" className="text-sm text-primary hover:underline">All →</Link>} />
          <ul className="divide-y divide-line">
            {!o.upcomingMeetings.length && <li className="flex items-center gap-2 px-5 py-4 text-sm text-muted"><CalendarClock className="size-4" /> No upcoming meeting.</li>}
            {o.upcomingMeetings.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <PlatformMark platform={m.platform} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-navy">{m.title}</p>
                  <p className="text-xs text-muted">{istDay(m.startsAt)}, {istTime(m.startsAt)} · {relativeTime(m.startsAt)} · {m.people} people</p>
                </div>
                <JoinMeetingButton link={m.link} platform={m.platform} size="sm" label="Join" />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Newly registered employees" action={<Link href="/admin/operators" className="text-sm text-primary hover:underline">All →</Link>} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
                <tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">District</th><th className="px-4 py-3">Status</th></tr>
              </thead>
              <tbody>
                {!o.recentEmployees.length && <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-muted">No employee has registered yet.</td></tr>}
                {o.recentEmployees.map((u) => (
                  <tr key={u.id} className="border-t border-line">
                    <td className="whitespace-nowrap px-4 py-3"><Link href={`/admin/operators/${u.id}`} className="font-semibold text-navy hover:underline">{u.id}</Link><span className="block text-[11px] text-muted">{fmtDate(u.joinedAt)}</span></td>
                    <td className="px-4 py-3">{u.name}</td>
                    <td className="px-4 py-3">{u.role === "verifier" ? <Badge tone="blue">Verifier</Badge> : <Badge>DEO</Badge>}</td>
                    <td className="px-4 py-3 text-xs">{u.district ?? "—"}</td>
                    <td className="px-4 py-3"><EmployeeStatusBadge status={u.status as EmployeeStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <CardHeader title="Latest payments" action={<Link href="/admin/payouts" className="text-sm text-primary hover:underline">All →</Link>} />
          <ul className="divide-y divide-line">
            {!o.recentPayments.length && <li className="px-5 py-4 text-sm text-muted">No payment recorded yet.</li>}
            {o.recentPayments.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy">{p.name} <span className="font-normal text-muted">({p.userId})</span></p>
                  <p className="text-xs text-muted">{p.id} · {fmtDate(p.paidOn)} · {p.mode}</p>
                </div>
                <b className="text-success">{money(p.amount)}</b>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

function RankTable({ title, href, head, rows, empty }: { title: string; href: string; head: string[]; rows: (string | number)[][]; empty: string }) {
  return (
    <Card>
      <CardHeader title={title} action={<Link href={href} className="text-sm text-primary hover:underline">All →</Link>} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
            <tr>{head.map((h, i) => <th key={h} className={`px-4 py-3 ${i ? "text-right" : ""}`}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {!rows.length && <tr><td colSpan={head.length} className="px-4 py-6 text-center text-sm text-muted">{empty}</td></tr>}
            {rows.map(([id, name, ...rest], i) => (
              <tr key={String(id)} className="border-t border-line">
                <td className="px-4 py-3">
                  <span className="mr-2 inline-grid size-6 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">{i + 1}</span>
                  <Link href={`/admin/operators/${id}`} className="font-semibold text-navy hover:underline">{name}</Link>
                  <span className="ml-1 text-xs text-muted">{id}</span>
                </td>
                {rest.map((v, j) => <td key={j} className="px-4 py-3 text-right">{v}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
