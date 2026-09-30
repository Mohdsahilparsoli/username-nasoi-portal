"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import { useMemo, useState } from "react";
import { useMe } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/misc";
import { useUsers } from "@/features/users/hooks";
import { fmtDateTime } from "@/lib/utils";
import type { Entry, EntryStatus } from "@/types";
import { useEntries } from "./hooks";
import { VerifyDialog } from "./verify-dialog";

/** Entries this verifier approved or rejected. */
export function VerifiedHistory({ status }: { status: Exclude<EntryStatus, "pending"> }) {
  const me = useMe();
  const entries = useEntries();
  const deos = useUsers("deo");
  const [viewing, setViewing] = useState<Entry | null>(null);

  const rows = useMemo(
    () =>
      (entries.data ?? [])
        .filter((e) => e.verifierId === me.id && e.status === status)
        .sort((a, b) => ((a.verifiedAt ?? "") < (b.verifiedAt ?? "") ? 1 : -1)),
    [entries.data, me.id, status],
  );

  const columns = useMemo<ColumnDef<Entry, unknown>[]>(
    () => [
      { accessorKey: "id", header: "Entry ID", cell: ({ getValue }) => <b className="text-navy">{String(getValue())}</b> },
      { id: "deo", header: "Operator", accessorFn: (e) => deos.data?.find((u) => u.id === e.deoId)?.name ?? e.deoId },
      { id: "student", header: "Student", accessorFn: (e) => e.data.studentName },
      ...(status === "rejected"
        ? ([{ accessorKey: "reason", header: "Reason", enableSorting: false, cell: ({ getValue }) => <span className="text-xs text-danger">{String(getValue())}</span> }] as ColumnDef<Entry, unknown>[])
        : []),
      { accessorKey: "verifiedAt", header: status === "approved" ? "Approved on" : "Rejected on", cell: ({ getValue }) => <span className="whitespace-nowrap text-xs">{fmtDateTime(getValue() as string)}</span> },
      {
        id: "view",
        header: "",
        enableSorting: false,
        cell: ({ row }) => <Button variant="light" size="sm" onClick={() => setViewing(row.original)}><Eye /> View</Button>,
      },
    ],
    [deos.data, status],
  );

  return (
    <>
      <PageHeader
        title={status === "approved" ? "Approved entries" : "Rejected entries"}
        description={status === "approved" ? "Entries you have verified and approved." : "Entries you rejected, with the reason shared with the operator."}
      />
      <Card>
        <DataTable columns={columns} data={rows} loading={entries.isLoading} emptyText={`No ${status} entries yet.`} />
      </Card>
      <VerifyDialog entry={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
