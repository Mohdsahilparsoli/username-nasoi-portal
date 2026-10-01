"use client";

import { Calendar, CircleCheck, FileText, Hash, MapPin, Target, TriangleAlert, Wallet } from "lucide-react";
import { useEffect } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Alert, EmptyState, PageHeader, Skeleton } from "@/components/ui/misc";
import { useMarkWorkSeen, useMyWork } from "@/features/work/hooks";
import { WorkStatusBadge, areaText } from "@/features/work/ui";
import { fmtDate, money } from "@/lib/utils";

export default function WorkStatusPage() {
  const work = useMyWork();
  const markSeen = useMarkWorkSeen();
  const current = work.data?.current;
  const unseen = !!current && !current.seenAt;

  // Opening this page marks the new assignment as seen (after a moment so the "New" badge is visible).
  useEffect(() => {
    if (!unseen) return;
    const t = setTimeout(() => markSeen.mutate(), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unseen]);

  if (work.isLoading) return <Skeleton className="h-80" />;
  if (work.isError) return <Alert tone="red" icon={TriangleAlert}>Could not load your work. Please refresh the page.</Alert>;
  const history = work.data?.history ?? [];

  return (
    <>
      <PageHeader title="Work Status" description="Work assigned to you by the Super Admin." />

      {current ? (
        <Card className="mb-6 overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-primary-soft/60 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Current assignment</p>
              <h2 className="text-lg font-bold text-navy">{current.taskType}</h2>
              <p className="text-xs text-muted">{current.id} · assigned on {fmtDate(current.createdAt)}</p>
            </div>
            <WorkStatusBadge a={current} />
          </div>
          <dl className="grid gap-x-6 gap-y-3 p-5 text-sm sm:grid-cols-2">
            <Item icon={Hash} label="PIN code" value={<b className="text-base">{current.area.pincode}</b>} />
            <Item icon={MapPin} label="Area" value={areaText(current.area)} />
            <Item icon={Target} label="Target" value={`${current.target} entries`} />
            <Item icon={Wallet} label="Rate" value={`${money(current.ratePerEntry)} per approved entry`} />
            <Item icon={Calendar} label="Deadline" value={fmtDate(current.deadline)} />
          </dl>
          {current.instructions && (
            <div className="mx-5 mb-5 rounded-lg border border-line bg-canvas p-4 text-sm">
              <p className="mb-1 flex items-center gap-1.5 font-semibold text-navy"><FileText className="size-4" /> Instructions</p>
              <p className="whitespace-pre-line">{current.instructions}</p>
            </div>
          )}
          <p className="border-t border-line px-5 py-3 text-xs text-muted">
            You will be eligible for your next assignment after this work is completed.
          </p>
        </Card>
      ) : (
        <Card className="mb-6">
          <EmptyState icon={CircleCheck} text="You have no active work right now. You are eligible for a new assignment – you will get a notification as soon as the admin assigns work." />
        </Card>
      )}

      <Card>
        <CardHeader title="Previous assignments" />
        {!history.length ? (
          <p className="px-5 py-4 text-sm text-muted">No previous assignments.</p>
        ) : (
          <ul className="divide-y divide-line">
            {history.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
                <div>
                  <b className="text-sm text-navy">{a.id} · {a.taskType}</b>
                  <p className="text-xs text-muted">{areaText(a.area)}</p>
                  <p className="text-xs text-muted">
                    Target {a.target} · {money(a.ratePerEntry)}/entry · {a.status === "completed" ? "completed" : "cancelled"} on {fmtDate(a.completedAt ?? a.cancelledAt)}
                  </p>
                </div>
                <WorkStatusBadge a={a} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function Item({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
      <div>
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="font-medium text-navy">{value}</dd>
      </div>
    </div>
  );
}
