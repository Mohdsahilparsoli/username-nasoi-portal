"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CircleCheck, CircleX, MapPin, Search, Target, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useDeferredValue, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Input, Select } from "@/components/ui/form-controls";
import { Alert, PageHeader } from "@/components/ui/misc";
import { useSetWorkStatus, useWorkList } from "@/features/work/hooks";
import { ConfirmButton, WorkStatusBadge } from "@/features/work/ui";
import type { WorkAssignment } from "@/lib/api/work";
import { fmtDate, money } from "@/lib/utils";

function Actions({ a }: { a: WorkAssignment }) {
  const set = useSetWorkStatus();
  if (a.status !== "active") {
    const at = a.completedAt ?? a.cancelledAt;
    return <span className="text-xs text-muted">{at ? fmtDate(at) : ""}</span>;
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
        description={<>PIN code <b>{a.area.pincode}</b> will be free again and <b>{a.deo?.name ?? a.deoId}</b> will become eligible for the next assignment. The operator will be notified.</>}
        confirmLabel="Mark completed"
        variant="success"
        pending={set.isPending}
        onConfirm={(close) => run("completed", close)}
      />
      <ConfirmButton
        trigger={<Button size="sm" variant="light"><CircleX /> Cancel</Button>}
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
  const list = useWorkList(status ? { status } : {});

  const rows = useMemo(
    () =>
      (list.data ?? []).filter(
        (a) => !dq || [a.id, a.deoId, a.deo?.name ?? "", a.area.pincode, a.area.village, a.area.district, a.taskType].some((v) => v.toLowerCase().includes(dq)),
      ),
    [list.data, dq],
  );

  const columns = useMemo<ColumnDef<WorkAssignment, unknown>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Assignment",
        cell: ({ row: { original: a } }) => <div><b className="whitespace-nowrap text-navy">{a.id}</b><span className="block text-xs text-muted">{fmtDate(a.createdAt)}</span></div>,
      },
      { id: "pin", header: "PIN code", accessorFn: (a) => a.area.pincode, cell: ({ getValue }) => <b>{String(getValue())}</b> },
      {
        id: "deo",
        header: "Operator",
        accessorFn: (a) => a.deo?.name ?? a.deoId,
        cell: ({ row: { original: a }, getValue }) => (
          <Link href={`/admin/operators/${a.deoId}`} className="hover:underline">{String(getValue())}<span className="block text-xs text-muted">{a.deoId}</span></Link>
        ),
      },
      {
        id: "task",
        header: "Task / Area",
        accessorFn: (a) => a.taskType,
        cell: ({ row: { original: a } }) => (
          <div>{a.taskType}<span className="mt-0.5 flex items-center gap-1 text-xs text-muted"><MapPin className="size-3" /> {a.area.village}, {a.area.block}, {a.area.district}</span></div>
        ),
      },
      { accessorKey: "target", header: "Target" },
      { accessorKey: "ratePerEntry", header: "Rate", cell: ({ getValue }) => money(Number(getValue())) },
      { accessorKey: "deadline", header: "Deadline", cell: ({ getValue }) => <span className="whitespace-nowrap text-xs">{fmtDate(String(getValue()))}</span> },
      { accessorKey: "status", header: "Status", cell: ({ row: { original: a } }) => <WorkStatusBadge a={a} /> },
      { id: "action", header: "", enableSorting: false, cell: ({ row: { original: a } }) => <Actions a={a} /> },
    ],
    [],
  );

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
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ID / PIN / operator / village" className="pl-9" />
        </div>
      </div>
      {list.isError && <Alert tone="red" icon={TriangleAlert} className="mb-4">Could not load assignments. Please refresh the page.</Alert>}
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
