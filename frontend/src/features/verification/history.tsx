"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Alert, PageHeader, StatusBadge } from "@/components/ui/misc";
import type { HistoryRow } from "@/lib/api/verifier";
import { fmtDateTime } from "@/lib/utils";
import { useVerifierHistory } from "./hooks";
import { VerifyDialog } from "./verify-dialog";

/** Entries this verifier approved or rejected (from the verification log). */
export function VerifierHistory({ decision }: { decision: "approved" | "rejected" }) {
  const h = useVerifierHistory(decision);
  const [open, setOpen] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<HistoryRow, unknown>[]>(
    () => [
      { id: "entry", header: "Entry", accessorFn: (r) => r.entry.id, cell: ({ getValue }) => <b className="text-navy">{String(getValue())}</b> },
      {
        id: "school",
        header: "School",
        accessorFn: (r) => r.entry.schoolName,
        cell: ({ row: { original: r } }) => <div className="max-w-80">{r.entry.schoolName}<span className="block text-xs text-muted">UDISE {r.entry.udiseCode} · PIN {r.entry.pincode}</span></div>,
      },
      { id: "deo", header: "Operator", accessorFn: (r) => r.deo.name, cell: ({ row: { original: r } }) => <div>{r.deo.name}<span className="block text-xs text-muted">{r.deo.id}</span></div> },
      ...(decision === "rejected"
        ? ([{ accessorKey: "reason", header: "Reason", enableSorting: false, cell: ({ getValue }) => <span className="text-xs text-danger">{String(getValue() ?? "")}</span> }] as ColumnDef<HistoryRow, unknown>[])
        : []),
      { accessorKey: "createdAt", header: decision === "approved" ? "Approved on" : "Rejected on", cell: ({ getValue }) => <span className="whitespace-nowrap text-xs">{fmtDateTime(String(getValue()))}</span> },
      { id: "now", header: "Now", accessorFn: (r) => r.entry.currentStatus, cell: ({ row: { original: r } }) => <StatusBadge status={r.entry.currentStatus as "pending" | "approved" | "rejected"} /> },
      { id: "view", header: "", enableSorting: false, cell: ({ row }) => <Button variant="light" size="sm" onClick={() => setOpen(row.original.entry.id)}><Eye /> View</Button> },
    ],
    [decision],
  );

  return (
    <>
      <PageHeader
        title={decision === "approved" ? "Approved Entries" : "Rejected Entries"}
        description={decision === "approved" ? "Entries you verified and approved." : "Entries you rejected, with the reason shared with the operator. “Now” shows if it was corrected and resubmitted."}
      />
      {h.isError && <Alert tone="red" icon={TriangleAlert} className="mb-4">Could not load the history. Please refresh the page.</Alert>}
      <Card>
        <DataTable columns={columns} data={h.data ?? []} loading={h.isLoading} emptyText={`You have not ${decision} any entry yet.`} />
      </Card>
      <VerifyDialog id={open} onClose={() => setOpen(null)} />
    </>
  );
}
