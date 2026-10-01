"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Search, Target, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/form-controls";
import { Alert, Badge, PageHeader } from "@/components/ui/misc";
import { useOperators } from "@/features/work/hooks";
import type { OperatorRow } from "@/lib/api/work";
import { fmtDate } from "@/lib/utils";

export default function OperatorsPage() {
  const deos = useOperators();
  const [q, setQ] = useState("");
  const dq = useDeferredValue(q.trim().toLowerCase());

  const rows = useMemo(
    () =>
      (deos.data ?? []).filter(
        (u) => !dq || [u.id, u.name, u.mobile ?? "", u.email ?? "", u.location?.district ?? "", u.location?.pincode ?? ""].some((v) => v.toLowerCase().includes(dq)),
      ),
    [deos.data, dq],
  );

  const columns = useMemo<ColumnDef<OperatorRow, unknown>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ row: { original: u } }) => <div><b className="text-navy">{u.id}</b><span className="block text-xs text-muted">Joined {fmtDate(u.joinedAt)}</span></div>,
      },
      { accessorKey: "name", header: "Name" },
      { accessorKey: "mobile", header: "Mobile" },
      {
        id: "loc",
        header: "Location",
        accessorFn: (u) => (u.location ? `${u.location.district}, ${u.location.state} – ${u.location.pincode}` : "—"),
        cell: ({ getValue }) => <span className="text-xs">{String(getValue())}</span>,
      },
      {
        id: "work",
        header: "Current work",
        accessorFn: (u) => (u.status === "blocked" ? "2" : u.currentAssignment ? "1" : "0"),
        cell: ({ row: { original: u } }) =>
          u.status === "blocked" ? (
            <Badge tone="red">Blocked</Badge>
          ) : u.currentAssignment ? (
            <div className="text-xs">
              <Badge tone="amber">Busy</Badge>
              <span className="mt-1 block text-muted">{u.currentAssignment.id}</span>
            </div>
          ) : (
            <Badge tone="green">Eligible</Badge>
          ),
      },
      {
        id: "asg",
        header: "Done / Total",
        accessorFn: (u) => u.assignments.total,
        cell: ({ row: { original: u } }) => <span className="text-xs">{u.assignments.completed} / {u.assignments.total}</span>,
      },
      { accessorKey: "status", header: "Account", cell: ({ getValue }) => (getValue() === "blocked" ? <Badge tone="red">Blocked</Badge> : <Badge tone="green">Active</Badge>) },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row: { original: u } }) => (
          <div className="flex gap-1.5">
            <Button asChild variant="light" size="sm"><Link href={`/admin/operators/${u.id}`}><Eye /> View</Link></Button>
            {u.eligible ? (
              <Button asChild size="sm"><Link href={`/admin/assign?deo=${u.id}`}><Target /> Assign</Link></Button>
            ) : (
              <Button size="sm" disabled title={u.status === "blocked" ? "Operator is blocked" : "Current work must be completed first"}><Target /> Assign</Button>
            )}
          </div>
        ),
      },
    ],
    [],
  );

  const total = deos.data?.length ?? 0;
  const eligible = deos.data?.filter((u) => u.eligible).length ?? 0;

  return (
    <>
      <PageHeader
        title="Data Entry Operators"
        description={deos.data ? `${total} registered · ${eligible} eligible for new work · ${total - eligible} busy or blocked` : "All registered DEOs."}
        action={
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ID / name / mobile / PIN" className="pl-9" />
          </div>
        }
      />
      {deos.isError && <Alert tone="red" icon={TriangleAlert} className="mb-4">Could not load operators. Please refresh the page.</Alert>}
      <Card>
        <DataTable columns={columns} data={rows} loading={deos.isLoading} emptyText={q ? "No operator matches your search." : "No operator has registered yet."} />
      </Card>
    </>
  );
}
