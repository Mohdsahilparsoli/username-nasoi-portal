"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MapPin, Target } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Badge, PageHeader, Progress } from "@/components/ui/misc";
import { useAssignments, useSetAssignmentStatus } from "@/features/assignments/hooks";
import { useEntries } from "@/features/entries/hooks";
import { useUsers } from "@/features/users/hooks";
import { fmtDate, money } from "@/lib/utils";
import type { Assignment } from "@/types";

export default function AssignmentsPage() {
  const asg = useAssignments();
  const entries = useEntries();
  const deos = useUsers("deo");
  const setStatus = useSetAssignmentStatus();

  const columns = useMemo<ColumnDef<Assignment, unknown>[]>(
    () => [
      { accessorKey: "id", header: "ID", cell: ({ row: { original: a } }) => <div><b className="text-navy">{a.id}</b><span className="block text-xs text-muted">{fmtDate(a.createdAt)}</span></div> },
      {
        id: "deo",
        header: "Operator",
        accessorFn: (a) => deos.data?.find((u) => u.id === a.deoId)?.name ?? a.deoId,
        cell: ({ row: { original: a }, getValue }) => <div>{String(getValue())}<span className="block text-xs text-muted">{a.deoId}</span></div>,
      },
      {
        id: "task",
        header: "Task / Area",
        accessorFn: (a) => a.taskType,
        cell: ({ row: { original: a } }) => (
          <div>{a.taskType}<span className="mt-0.5 flex items-center gap-1 text-xs text-muted"><MapPin className="size-3" /> {a.area.village}, {a.area.block}, {a.area.district}</span></div>
        ),
      },
      {
        id: "progress",
        header: "Progress",
        enableSorting: false,
        cell: ({ row: { original: a } }) => (
          <div className="min-w-36"><Progress value={(entries.data ?? []).filter((e) => e.assignmentId === a.id).length} max={a.target} /></div>
        ),
      },
      { accessorKey: "rate", header: "Rate", cell: ({ getValue }) => money(Number(getValue())) },
      { accessorKey: "deadline", header: "Deadline", cell: ({ getValue }) => <span className="whitespace-nowrap text-xs">{fmtDate(String(getValue()))}</span> },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row: { original: a } }) =>
          a.status === "completed" ? <Badge>Completed</Badge> : !a.seenAt ? <Badge tone="blue">New (unseen)</Badge> : <Badge tone="green">Active</Badge>,
      },
      {
        id: "action",
        header: "",
        enableSorting: false,
        cell: ({ row: { original: a } }) => (
          <Button
            variant="light"
            size="sm"
            onClick={() =>
              setStatus.mutate(
                { id: a.id, status: a.status === "active" ? "completed" : "active" },
                { onSuccess: () => toast.success(a.status === "active" ? "Assignment marked complete." : "Assignment reopened.") },
              )
            }
          >
            {a.status === "active" ? "Mark complete" : "Reopen"}
          </Button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deos.data, entries.data],
  );

  return (
    <>
      <PageHeader
        title="All Assignments"
        description="Progress of every area assigned."
        action={<Button asChild><Link href="/admin/assign"><Target /> Assign Work</Link></Button>}
      />
      <Card>
        <DataTable columns={columns} data={asg.data ?? []} loading={asg.isLoading} emptyText="No assignments yet." />
      </Card>
    </>
  );
}
