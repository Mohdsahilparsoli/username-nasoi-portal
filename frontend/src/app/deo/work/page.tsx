"use client";

import { Calendar, CirclePlus, MapPin, Target, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useMe } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, EmptyState, PageHeader, Progress, Skeleton } from "@/components/ui/misc";
import { useAssignments, useMarkAssignmentsSeen } from "@/features/assignments/hooks";
import { useEntries } from "@/features/entries/hooks";
import { fmtDate, money, statsOf } from "@/lib/utils";

export default function WorkStatusPage() {
  const me = useMe();
  const asg = useAssignments(me.id);
  const entries = useEntries(me.id);
  const markSeen = useMarkAssignmentsSeen(me.id);
  const hasNew = (asg.data ?? []).some((a) => !a.seenAt);

  // Opening this page marks new assignments as seen (after a short moment so the "New" badge is visible).
  useEffect(() => {
    if (!hasNew) return;
    const t = setTimeout(() => markSeen.mutate(), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasNew]);

  return (
    <>
      <PageHeader title="Work Status" description="Areas and tasks assigned to you by the Super Admin." />
      {asg.isLoading ? (
        <div className="grid gap-5 md:grid-cols-2">{[1, 2].map((i) => <Skeleton key={i} className="h-64" />)}</div>
      ) : !asg.data?.length ? (
        <Card><EmptyState icon={MapPin} text="No work has been assigned yet." /></Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {asg.data.map((a) => {
            const st = statsOf((entries.data ?? []).filter((e) => e.assignmentId === a.id));
            return (
              <Card key={a.id} className="flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{a.taskType}</h3>
                    <p className="text-xs text-muted">{a.id} • assigned {fmtDate(a.createdAt)}</p>
                  </div>
                  {a.status === "completed" ? <Badge>Completed</Badge> : !a.seenAt ? <Badge tone="blue">New</Badge> : <Badge tone="green">Active</Badge>}
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                  <dt className="flex items-center gap-1.5 text-muted"><MapPin className="size-4 text-primary" /> Area</dt>
                  <dd className="font-medium">{[a.area.village, a.area.block, a.area.district, a.area.state].join(", ")}</dd>
                  <dt className="flex items-center gap-1.5 text-muted"><Target className="size-4 text-primary" /> Target</dt>
                  <dd className="font-medium">{a.target} entries</dd>
                  <dt className="flex items-center gap-1.5 text-muted"><Wallet className="size-4 text-primary" /> Rate</dt>
                  <dd className="font-medium">{money(a.rate)} / approved entry</dd>
                  <dt className="flex items-center gap-1.5 text-muted"><Calendar className="size-4 text-primary" /> Deadline</dt>
                  <dd className="font-medium">{fmtDate(a.deadline)}</dd>
                </dl>
                {a.note && <p className="text-sm text-muted">{a.note}</p>}
                <Progress value={st.total} max={a.target} />
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="amber">{st.pending} pending</Badge>
                  <Badge tone="green">{st.approved} approved</Badge>
                  <Badge tone="red">{st.rejected} rejected</Badge>
                  <Badge>{money(st.earnings)} earned</Badge>
                </div>
                {a.status === "active" && (
                  <Button asChild size="sm" className="self-start">
                    <Link href={`/deo/entries/new?asg=${a.id}`}><CirclePlus /> Add entry for this area</Link>
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
