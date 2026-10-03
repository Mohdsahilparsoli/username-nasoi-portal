"use client";

import { CircleCheck, CircleX, ClipboardList, Clock, ShieldCheck, TriangleAlert, User, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useMe } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Alert, Badge, EmptyState, PageHeader, Skeleton, StatCard } from "@/components/ui/misc";
import { PersonCard } from "@/features/records/person-card";
import { UpcomingMeetingsCard } from "@/features/connect/upcoming-card";
import { placeText } from "@/features/work/ui";
import { codeText } from "@/features/records/record-form";
import { useVerifierAreas, useVerifierEntries, useVerifierSummary } from "@/features/verification/hooks";
import { VerifyDialog } from "@/features/verification/verify-dialog";
import { fmtDateTime, money } from "@/lib/utils";

export default function VerifierDashboard() {
  const me = useMe();
  const s = useVerifierSummary();
  const queue = useVerifierEntries("pending");
  const [open, setOpen] = useState<string | null>(null);
  const n = (v?: number) => (s.isLoading ? "…" : (v ?? 0));
  const next = (queue.data ?? []).slice(0, 5);
  const areas = useVerifierAreas();
  const active = (areas.data ?? []).filter((a) => a.status === "active");

  return (
    <>
      <PageHeader
        title={`Welcome, ${me.name}`}
        description="Your verification work at a glance."
        action={<Button asChild><Link href="/verifier/verify"><ShieldCheck /> Verify Data</Link></Button>}
      />
      {s.isError && <Alert tone="red" icon={TriangleAlert} className="mb-5">Could not load your numbers. Please refresh the page.</Alert>}

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Profile" value={me.id} icon={User} href="/verifier/profile" />
        <StatCard label="Total Assigned" value={n(s.data?.totalAssigned)} icon={ClipboardList} tone="blue" href="/verifier/verify?view=all" />
        <StatCard label="Approved Entry" value={n(s.data?.approved)} icon={CircleCheck} tone="green" href="/verifier/approved" />
        <StatCard label="Rejected Entry" value={n(s.data?.rejected)} icon={CircleX} tone="red" href="/verifier/rejected" />
        <StatCard label="Pending Verification" value={n(s.data?.pending)} icon={Clock} tone="amber" href="/verifier/verify" />
        <StatCard label="Total Income" value={s.isLoading ? "…" : money(s.data?.income)} icon={Wallet} tone="saffron" href="/verifier/income" />
      </div>

      <UpcomingMeetingsCard className="mb-6" />
      <Card className="mb-6">
        <CardHeader title="My Areas" action={<span className="text-xs text-muted">{active.length} active</span>} />
        {areas.isLoading ? (
          <div className="p-5"><Skeleton className="h-20" /></div>
        ) : !active.length ? (
          <p className="px-5 py-4 text-sm text-muted">No area is assigned to you right now. The Super Admin will assign areas for verification.</p>
        ) : (
          <div className="grid gap-4 p-5 md:grid-cols-2">
            {active.map((a) => (
              <div key={a.id} className="rounded-xl border border-line p-4">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <b className="text-navy">{a.id}</b>
                    <p className="text-xs text-muted">{a.taskType} · {a.recordType === "college" ? "College" : "School"} entries</p>
                    <p className="text-xs text-muted">{placeText({ village: a.area.village, block: a.area.block, district: a.area.district })} – PIN <b>{a.area.pincode}</b></p>
                  </div>
                  <Badge tone="blue">{a.progress.submitted}/{a.target} entered · {a.progress.approved} approved</Badge>
                </div>
                <PersonCard title="Data Entry Operator" person={a.deo} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Next to verify"
          action={<Link href="/verifier/verify" className="text-sm text-primary hover:underline">All pending →</Link>}
        />
        {queue.isLoading ? (
          <div className="space-y-3 p-5">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-6" />)}</div>
        ) : !next.length ? (
          <EmptyState icon={CircleCheck} text="Nothing pending. New entries will appear here as operators submit them." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
                <tr><th className="px-4 py-3">Entry</th><th className="px-4 py-3">School / College</th><th className="px-4 py-3">Operator</th><th className="px-4 py-3">Submitted</th><th className="px-4 py-3" /></tr>
              </thead>
              <tbody>
                {next.map((e) => (
                  <tr key={e.id} className="border-t border-line">
                    <td className="px-4 py-3"><b className="text-navy">{e.id}</b>{e.resubmitCount > 0 && <Badge tone="blue" className="ml-1.5">Resubmitted</Badge>}</td>
                    <td className="px-4 py-3">{e.name}<span className="block text-xs text-muted">{codeText(e)} · PIN {e.area.pincode}</span></td>
                    <td className="px-4 py-3">{e.deo.name}<span className="block text-xs text-muted">{e.deo.id}</span></td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{fmtDateTime(e.submittedAt)}</td>
                    <td className="px-4 py-3 text-right"><Button size="sm" onClick={() => setOpen(e.id)}><ShieldCheck /> Verify</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <VerifyDialog id={open} onClose={() => setOpen(null)} />
    </>
  );
}
