"use client";

import { Bell, CircleCheck, CirclePlus, CircleX, ClipboardList, Clock, MapPin, TriangleAlert, Wallet } from "lucide-react";
import Link from "next/link";
import { useMe } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Alert, Badge, EmptyState, PageHeader, Progress, Skeleton, StatCard, StatusBadge } from "@/components/ui/misc";
import { PersonCard } from "@/features/records/person-card";
import { UpcomingMeetingsCard } from "@/features/connect/upcoming-card";
import { placeText } from "@/features/work/ui";
import { codeText } from "@/features/records/record-form";
import { useMyEntries, useMySummary, useMyWork } from "@/features/work/hooks";
import { fmtDate, fmtDateTime, money } from "@/lib/utils";

export default function DeoDashboard() {
  const me = useMe();
  const work = useMyWork();
  const summary = useMySummary();
  const entries = useMyEntries();
  const a = work.data?.current;
  const t = summary.data?.totals;
  const p = summary.data?.currentProgress;
  const left = a && p ? Math.max(0, a.target - p.submitted) : 0;
  const n = (v?: number) => (summary.isLoading ? "…" : (v ?? 0));

  return (
    <>
      <PageHeader
        title={`Welcome, ${me.name}`}
        description="Here is the status of your data entry work."
        action={a ? <Button asChild><Link href="/deo/entries/new"><CirclePlus /> New Entry</Link></Button> : undefined}
      />

      {a && !a.seenAt && (
        <Alert tone="blue" icon={Bell} className="mb-5">
          New work has been assigned to you: <b>{a.id}</b> – {a.taskType} for PIN code <b>{a.area.pincode}</b>.{" "}
          <Link href="/deo/work">View now →</Link>
        </Alert>
      )}
      {summary.isError && <Alert tone="red" icon={TriangleAlert} className="mb-5">Could not load your numbers. Please refresh the page.</Alert>}

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Assigned Area" value={work.isLoading ? "…" : a ? `PIN ${a.area.pincode}` : "None"} icon={MapPin} tone="blue" href="/deo/work" />
        <StatCard label="Total Entry" value={n(t?.total)} icon={ClipboardList} href="/deo/entries" />
        <StatCard label="Pending Entry" value={n(t?.pending)} icon={Clock} tone="amber" href="/deo/entries?status=pending" />
        <StatCard label="Rejected Entries" value={n(t?.rejected)} icon={CircleX} tone="red" href="/deo/entries?status=rejected" />
        <StatCard label="Approved Entry" value={n(t?.approved)} icon={CircleCheck} tone="green" href="/deo/entries?status=approved" />
        <StatCard label="Total Earnings" value={summary.isLoading ? "…" : money(t?.earnings)} icon={Wallet} tone="saffron" href="/deo/earnings" />
        <StatCard
          label="New Add Entry"
          value={!a ? "No work" : left ? `${left} left` : "Target done"}
          icon={CirclePlus}
          tone="green"
          href="/deo/entries/new"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Recent entries" action={<Link href="/deo/entries" className="text-sm text-primary hover:underline">View all →</Link>} />
          {entries.isLoading ? (
            <div className="space-y-3 p-5">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-6" />)}</div>
          ) : !entries.data?.length ? (
            <EmptyState icon={ClipboardList} text={a ? "No entries yet. Start with “New Add Entry”." : "No entries yet."} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
                  <tr><th className="px-4 py-3">Entry ID</th><th className="px-4 py-3">School / College</th><th className="px-4 py-3">Submitted</th><th className="px-4 py-3">Status</th></tr>
                </thead>
                <tbody>
                  {entries.data.slice(0, 6).map((e) => (
                    <tr key={e.id} className="border-t border-line">
                      <td className="px-4 py-3"><Link href={`/deo/entries/${e.id}`} className="font-medium text-primary hover:underline">{e.id}</Link></td>
                      <td className="px-4 py-3">{e.name}<span className="block text-xs text-muted">{codeText(e)}</span></td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{fmtDateTime(e.submittedAt)}</td>
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
          <div className="p-5">
            {work.isLoading ? (
              <Skeleton className="h-16" />
            ) : !a ? (
              <p className="text-sm text-muted">No work is assigned to you right now. You will get a notification when the Super Admin assigns work.</p>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-2">
                  <b className="text-navy">{a.taskType}</b>
                  {!a.seenAt && <Badge tone="blue">New</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-muted">{a.id} · PIN <b>{a.area.pincode}</b></p>
                <p className="mb-3 mt-0.5 flex items-center gap-1 text-xs text-muted">
                  <MapPin className="size-3.5" /> {placeText(a.area)}
                </p>
                <Progress value={p?.submitted ?? 0} max={a.target} />
                <p className="mt-2 text-xs text-muted">
                  {p?.approved ?? 0} approved · {p?.pending ?? 0} pending · {p?.rejected ?? 0} rejected · deadline {fmtDate(a.deadline)}
                </p>
                <PersonCard title="Your verifier" person={a.verifier} className="mt-4" />
              </div>
            )}
          </div>
        </Card>
      </div>
      <UpcomingMeetingsCard className="mt-6" />
    </>
  );
}
