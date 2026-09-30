"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Search, Target } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/form-controls";
import { Badge, PageHeader } from "@/components/ui/misc";
import { useAssignments } from "@/features/assignments/hooks";
import { useEntries } from "@/features/entries/hooks";
import { useUsers } from "@/features/users/hooks";
import { money, statsOf } from "@/lib/utils";
import type { Stats, User } from "@/types";

type Row = User & { stats: Stats; assignments: number };

export default function OperatorsPage() {
  const deos = useUsers("deo");
  const entries = useEntries();
  const asg = useAssignments();
  const [q, setQ] = useState("");

  const rows = useMemo<Row[]>(
    () =>
      (deos.data ?? [])
        .filter((u) => !q || [u.id, u.name, u.mobile].some((v) => v.toLowerCase().includes(q.toLowerCase())))
        .map((u) => ({
          ...u,
          stats: statsOf((entries.data ?? []).filter((e) => e.deoId === u.id)),
          assignments: (asg.data ?? []).filter((a) => a.deoId === u.id).length,
        })),
    [deos.data, entries.data, asg.data, q],
  );

  const columns = useMemo<ColumnDef<Row, unknown>[]>(
    () => [
      { accessorKey: "id", header: "ID", cell: ({ getValue }) => <b className="text-navy">{String(getValue())}</b> },
      { accessorKey: "name", header: "Name" },
      { accessorKey: "mobile", header: "Mobile" },
      { id: "loc", header: "Location", accessorFn: (u) => `${u.district}, ${u.state}`, cell: ({ getValue }) => <span className="text-xs">{String(getValue())}</span> },
      { accessorKey: "assignments", header: "Assignments", cell: ({ getValue }) => (Number(getValue()) ? String(getValue()) : <Badge tone="blue">None</Badge>) },
      { id: "par", header: "Entries (P/A/R)", enableSorting: false, cell: ({ row: { original: u } }) => <span className="text-xs">{u.stats.pending} / {u.stats.approved} / {u.stats.rejected}</span> },
      { id: "earn", header: "Earnings", accessorFn: (u) => u.stats.earnings, cell: ({ getValue }) => money(Number(getValue())) },
      { accessorKey: "status", header: "Status", cell: ({ getValue }) => (getValue() === "blocked" ? <Badge tone="red">Blocked</Badge> : <Badge tone="green">Active</Badge>) },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row: { original: u } }) => (
          <div className="flex gap-1.5">
            <Button asChild variant="light" size="sm"><Link href={`/admin/operators/${u.id}`}><Eye /> View</Link></Button>
            <Button asChild size="sm"><Link href={`/admin/assign?deo=${u.id}`}><Target /> Assign</Link></Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Data Entry Operators"
        description="All registered DEOs and their work summary."
        action={
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ID / name / mobile" className="pl-9" />
          </div>
        }
      />
      <Card>
        <DataTable columns={columns} data={rows} loading={deos.isLoading} emptyText="No operators found." />
      </Card>
    </>
  );
}
