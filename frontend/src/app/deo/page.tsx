"use client";

import { Bell, CircleCheck, CirclePlus, CircleX, ClipboardList, Clock, MapPin, Wallet } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useMe } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Alert, Badge, EmptyState, PageHeader, Progress, Skeleton, StatCard, StatGrid, StatusBadge } from "@/components/ui/misc";
import { useEntries } from "@/features/entries/hooks";
import { useMyWork } from "@/features/work/hooks";
import { fmtDate, money, statsOf } from "@/lib/utils";

export default function DeoDashboard() {
  const me = useMe();
  const entries = useEntries(me.id);
  const work = useMyWork();
  const list = useMemo(() => entries.data ?? [], [entries.data]);
  const s = statsOf(list);
  const current = work.data?.current;

  return (
    <>
      <PageHeader
        title={`Welcome, ${me.name}`}
        description="Here is the status of your data entry work."
        action={<Button asChild><Link href="/deo/entries/new"><CirclePlus /> New Entry</Link></Button>}
      />

      {current && !current.seenAt && (
        <Alert tone="blue" icon={Bell} className="mb-5">
          New work has been assigned to you: <b>{current.id}</b> – {current.taskType} for PIN code <b>{current.area.pincode}</b>.{" "}
          <Link href="/deo/work">View now →</Link>
        </Alert>
      )}

      <StatGrid>
        <StatCard label="Total Entries" value={s.total} icon={ClipboardList} href="/deo/entries" />
        <StatCard label="Pending Entries" value={s.pending} icon={Clock} tone="amber" href="/deo/entries?status=pending" />
        <StatCard label="Approved Entries" value={s.approved} icon={CircleCheck} tone="green" href="/deo/entries?status=approved" />
        <StatCard label="Rejected Entries" value={s.rejected} icon={CircleX} tone="red" href="/deo/entries?status=rejected" />
        <StatCard label="Total Earnings" value={money(s.earnings)} icon={Wallet} tone="saffron" href="/deo/earnings" />
      </StatGrid>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Recent entries" action={<Link href="/deo/entries" className="text-sm text-primary hover:underline">View all →</Link>} />
          {entries.isLoading ? (
            <div className="space-y-3 p-5">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-6" />)}</div>
          ) : list.length === 0 ? (
            <EmptyState icon={ClipboardList} text="No entries yet. Start with “New Entry”." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
                  <tr><th className="px-4 py-3">Entry ID</th><th className="px-4 py-3">Student</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th></tr>
                </thead>
                <tbody>
                  {list.slice(0, 6).map((e) => (
                    <tr key={e.id} className="border-t border-line">
                      <td className="px-4 py-3"><Link href={`/deo/entries/${e.id}`} className="font-medium text-primary hover:underline">{e.id}</Link></td>
                      <td className="px-4 py-3">{e.data.studentName}</td>
                      <td className="px-4 py-3 text-muted">{fmtDate(e.submittedAt)}</td>
                      <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Assigned area" action={<Link href="/deo/work" className="text-sm text-primary hover:underline">Details →</Link>} />
          <div className="space-y-5 p-5">
            {work.isLoading ? (
              <Skeleton className="h-16" />
            ) : !current ? (
              <p className="text-sm text-muted">No work is assigned to you right now. You will get a notification when the Super Admin assigns work.</p>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-2">
                  <b className="text-navy">{current.taskType}</b>
                  {!current.seenAt && <Badge tone="blue">New</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-muted">{current.id} · PIN <b>{current.area.pincode}</b></p>
                <p className="mb-2 mt-0.5 flex items-center gap-1 text-xs text-muted">
                  <MapPin className="size-3.5" /> {[current.area.village, current.area.block, current.area.district, current.area.state].join(", ")}
                </p>
                <Progress value={list.filter((e) => e.assignmentId === current.id).length} max={current.target} />
                <p className="mt-2 text-xs text-muted">Target {current.target} entries · deadline {fmtDate(current.deadline)}</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
