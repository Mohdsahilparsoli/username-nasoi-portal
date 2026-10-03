"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { BadgeCheck, CircleCheck, CircleX, MapPin, Search, Target, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useDeferredValue, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Input, Select } from "@/components/ui/form-controls";
import { Alert, PageHeader, Progress } from "@/components/ui/misc";
import { useChangeDeo, useChangeVerifier, useOperators, useSetWorkStatus, useVerifiers, useWorkList } from "@/features/work/hooks";
import { ConfirmButton, WorkStatusBadge, placeText } from "@/features/work/ui";
import type { WorkAssignment } from "@/lib/api/work";
import { fmtDate, money } from "@/lib/utils";

/** Change the verifier of an active area (pending entries move to the new verifier). */
function ChangeVerifier({ a }: { a: WorkAssignment }) {
  const verifiers = useVerifiers();
  const change = useChangeVerifier();
  const [vr, setVr] = useState("");
  return (
    <ConfirmButton
      trigger={<button type="button" className="text-xs font-semibold text-primary hover:underline">{a.verifierId ? "Change" : "Set verifier"}</button>}
      title={`Verifier for ${a.id}`}
      description={
        <div className="space-y-3">
          <p>Pending entries of this area will move to the new verifier. Only a free verifier (no other active area) can be chosen. Everyone is notified.</p>
          <Select value={vr} onChange={(e) => setVr(e.target.value)} aria-label="New verifier">
            <option value="">-- Select verifier --</option>
            {verifiers.data?.filter((v) => v.status === "active" && v.id !== a.verifierId).map((v) => (
              <option key={v.id} value={v.id} disabled={!v.eligible}>
                {v.id} – {v.name} · {v.currentAssignment ? `Busy – ${v.currentAssignment.id}` : "Free"}
              </option>
            ))}
          </Select>
        </div>
      }
      confirmLabel="Change verifier"
      pending={change.isPending}
      onConfirm={(close) => {
        if (!vr) return toast.error("Select a verifier.");
        change.mutate(
          { id: a.id, verifierId: vr },
          {
            onSuccess: (r) => {
              toast.success(`${a.id} now verified by ${vr}.`, { description: `${r.movedEntries} pending entr${r.movedEntries === 1 ? "y" : "ies"} moved.` });
              setVr("");
              close();
            },
            onError: (e) => toast.error(e.message),
          },
        );
      }}
    />
  );
}

/** Give active work to another operator (only a free, active DEO). Rejected entries move to them. */
function ChangeDeo({ a }: { a: WorkAssignment }) {
  const deos = useOperators(undefined, "deo");
  const change = useChangeDeo();
  const [deo, setDeo] = useState("");
  return (
    <ConfirmButton
      trigger={<button type="button" className="text-xs font-semibold text-primary hover:underline">Change</button>}
      title={`Operator for ${a.id}`}
      description={
        <div className="space-y-3">
          <p>
            The new operator continues this work. Entries already made stay with <b>{a.deo?.name ?? a.deoId}</b> (pending ones are still paid to them when approved);
            rejected entries move to the new operator for correction. {a.deo?.name ?? a.deoId} becomes free for new work. Everyone is notified.
          </p>
          <Select value={deo} onChange={(e) => setDeo(e.target.value)} aria-label="New operator">
            <option value="">-- Select operator --</option>
            {deos.data?.filter((d) => d.status === "active" && d.id !== a.deoId).map((d) => (
              <option key={d.id} value={d.id} disabled={!d.eligible}>
                {d.id} – {d.name} · {d.currentAssignment ? `Busy – ${d.currentAssignment.id}` : "Free"}
              </option>
            ))}
          </Select>
        </div>
      }
      confirmLabel="Change operator"
      pending={change.isPending}
      onConfirm={(close) => {
        if (!deo) return toast.error("Select an operator.");
        change.mutate(
          { id: a.id, deoId: deo },
          {
            onSuccess: (r) => {
              toast.success(`${a.id} now with ${deo}.`, { description: r.movedEntries ? `${r.movedEntries} rejected entr${r.movedEntries === 1 ? "y" : "ies"} moved for correction.` : undefined });
              setDeo("");
              close();
            },
            onError: (e) => toast.error(e.message),
          },
        );
      }}
    />
  );
}

function Actions({ a }: { a: WorkAssignment }) {
  const set = useSetWorkStatus();
  if (a.status !== "active") {
    const at = a.completedAt ?? a.cancelledAt;
    return <span className="text-[11px] text-muted">{at ? `on ${fmtDate(at)}` : ""}</span>;
  }
  const run = (status: "completed" | "cancelled", close: () => void) =>
    set.mutate(
      { id: a.id, status },
      {
        onSuccess: () => {
          toast.success(status === "completed" ? `${a.id} marked completed. ${a.deoId} is now eligible for new work.` : `${a.id} cancelled.`);
          close();
        },
        onError: (e) => toast.error(e.message),
      },
    );
  return (
    <div className="flex gap-1.5">
      <ConfirmButton
        trigger={<Button size="sm" variant="success"><CircleCheck /> Complete</Button>}
        title={`Mark ${a.id} as completed?`}
        description={<>PIN code <b>{a.area.pincode}</b> will be free again and <b>{a.deo?.name ?? a.deoId}</b> and the verifier <b>{a.verifier?.name ?? a.verifierId ?? ""}</b> will be free for their next area. Both are notified.</>}
        confirmLabel="Mark completed"
        variant="success"
        pending={set.isPending}
        onConfirm={(close) => run("completed", close)}
      />
      <ConfirmButton
        trigger={<Button size="sm" variant="light" aria-label={`Cancel ${a.id}`} title="Cancel assignment"><CircleX /></Button>}
        title={`Cancel ${a.id}?`}
        description={<>The work will be withdrawn from <b>{a.deo?.name ?? a.deoId}</b>. PIN code <b>{a.area.pincode}</b> and the operator will be free for a new assignment.</>}
        confirmLabel="Cancel assignment"
        variant="danger"
        pending={set.isPending}
        onConfirm={(close) => run("cancelled", close)}
      />
    </div>
  );
}

function AssignmentsInner() {
  const params = useSearchParams();
  const router = useRouter();
  const status = params.get("status") ?? "";
  const [q, setQ] = useState(params.get("q") ?? "");
  const dq = useDeferredValue(q.trim().toLowerCase());
  const ready = status === "ready";
  const list = useWorkList(status && !ready ? { status } : ready ? { status: "active" } : {});

  const rows = useMemo(
    () =>
      (list.data ?? []).filter(
        (a) => (!ready || !!a.allApprovedAt) && (!dq || [a.id, a.deoId, a.deo?.name ?? "", a.verifierId ?? "", a.verifier?.name ?? "", a.area.pincode, a.area.village, a.area.district, a.taskType].some((v) => v.toLowerCase().includes(dq))),
      ),
    [list.data, dq, ready],
  );

  const columns = useMemo<ColumnDef<WorkAssignment, unknown>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Assignment",
        cell: ({ row: { original: a } }) => <div><b className="whitespace-nowrap text-navy">{a.id}</b><span className="block text-xs text-muted">{fmtDate(a.createdAt)}</span></div>,
      },
      {
        id: "pin",
        header: "PIN / Area",
        accessorFn: (a) => a.area.pincode,
        cell: ({ row: { original: a } }) => (
          <div className="min-w-32">
            <b>{a.area.pincode}</b>
            <span className="mt-0.5 flex items-start gap-1 text-xs text-muted"><MapPin className="mt-0.5 size-3 shrink-0" /> {placeText(a.area)}</span>
            <span className="text-[11px] text-muted">{a.recordType === "college" ? "College" : "School"} · {a.taskType}</span>
          </div>
        ),
      },
      {
        id: "deo",
        header: "Operator",
        accessorFn: (a) => a.deo?.name ?? a.deoId,
        cell: ({ row: { original: a }, getValue }) => (
          <div className="text-sm">
            <Link href={`/admin/operators/${a.deoId}`} className="hover:underline">{String(getValue())}<span className="block whitespace-nowrap text-xs text-muted">{a.deoId}</span></Link>
            {a.status === "active" && <ChangeDeo a={a} />}
          </div>
        ),
      },
      {
        id: "vr",
        header: "Verifier",
        accessorFn: (a) => a.verifier?.name ?? "",
        cell: ({ row: { original: a } }) => (
          <div className="text-sm">
            {a.verifier ? <>{a.verifier.name}<span className="block whitespace-nowrap text-xs text-muted">{a.verifier.id}</span></> : <span className="text-xs text-muted">Automatic</span>}
            {a.status === "active" && <ChangeVerifier a={a} />}
          </div>
        ),
      },
      {
        id: "progress",
        header: "Progress",
        accessorFn: (a) => a.progress?.submitted ?? 0,
        cell: ({ row: { original: a } }) => (
          <div className="min-w-36">
            <Progress value={a.progress?.submitted ?? 0} max={a.target} />
            <span className="block text-[11px] text-muted">{a.progress?.approved ?? 0} approved · {a.progress?.rejected ?? 0} rejected</span>
            <span className="block text-[11px] text-muted">Deadline {fmtDate(a.deadline)}</span>
          </div>
        ),
      },
      {
        id: "amounts",
        header: "₹ DEO / VR",
        accessorFn: (a) => a.ratePerEntry ?? 0,
        cell: ({ row: { original: a } }) => (
          <span className="whitespace-nowrap text-xs">{money(a.ratePerEntry)} / {a.verifierRate == null ? "default" : money(a.verifierRate)}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row: { original: a } }) => (
          <div>
            <WorkStatusBadge a={a} />
            {a.status === "active" && a.allApprovedAt && (
              <span className="mt-1 block whitespace-nowrap text-[11px] text-muted">by {a.allApprovedBy} · {fmtDate(a.allApprovedAt)}</span>
            )}
            <div className="mt-2"><Actions a={a} /></div>
          </div>
        ),
      },
    ],
    [],
  );

  const readyCount = (list.data ?? []).filter((a) => a.status === "active" && a.allApprovedAt).length;
  const setStatus = (s: string) => router.replace(s ? `/admin/assignments?status=${s}` : "/admin/assignments");

  return (
    <>
      <PageHeader
        title="All Assignments"
        description="Every PIN code assigned to operators. Mark work completed to make the operator eligible for the next one."
        action={<Button asChild><Link href="/admin/assign"><Target /> Assign Work</Link></Button>}
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44" aria-label="Status">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="ready">All approved by VR (to complete)</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ID / PIN / DEO / verifier / district" className="pl-9" />
        </div>
      </div>
      {list.isError && <Alert tone="red" icon={TriangleAlert} className="mb-4">Could not load assignments. Please refresh the page.</Alert>}
      {!ready && readyCount > 0 && (
        <Alert tone="green" icon={BadgeCheck} className="mb-4">
          <b>{readyCount}</b> assignment{readyCount > 1 ? "s have" : " has"} all entries approved by the verifier – ready to mark completed.{" "}
          <button type="button" className="font-semibold underline" onClick={() => setStatus("ready")}>Show</button>
        </Alert>
      )}
      <Card>
        <DataTable columns={columns} data={rows} loading={list.isLoading} emptyText={q || status ? "No assignment matches the filter." : "No work assigned yet."} />
      </Card>
    </>
  );
}

export default function AssignmentsPage() {
  return (
    <Suspense>
      <AssignmentsInner />
    </Suspense>
  );
}
