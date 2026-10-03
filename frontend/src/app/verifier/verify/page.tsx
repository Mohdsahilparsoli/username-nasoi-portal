"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CircleX, Eye, Search, ShieldCheck, TriangleAlert } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useDeferredValue, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, FilterTabs } from "@/components/ui/data-table";
import { Input } from "@/components/ui/form-controls";
import { Alert, Badge, PageHeader, StatusBadge } from "@/components/ui/misc";
import { useVerifierEntries, useVerifierSummary } from "@/features/verification/hooks";
import { codeText } from "@/features/records/record-form";
import { VerifyDialog } from "@/features/verification/verify-dialog";
import type { VerifierEntry } from "@/lib/api/verifier";
import { fmtDateTime } from "@/lib/utils";

type View = "pending" | "all";

function VerifyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const view: View = params.get("view") === "all" ? "all" : "pending";
  const list = useVerifierEntries(view);
  const summary = useVerifierSummary();
  const [q, setQ] = useState("");
  const dq = useDeferredValue(q.trim().toLowerCase());
  const [open, setOpen] = useState<{ id: string; reject?: boolean } | null>(null);

  const rows = useMemo(
    () =>
      (list.data ?? []).filter(
        (e) => !dq || [e.id, e.code, e.name, e.deo.id, e.deo.name, e.area.pincode].some((v) => v.toLowerCase().includes(dq)),
      ),
    [list.data, dq],
  );

  const columns = useMemo<ColumnDef<VerifierEntry, unknown>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Entry",
        cell: ({ row: { original: e } }) => (
          <div><b className="text-navy">{e.id}</b>{e.resubmitCount > 0 && <Badge tone="blue" className="ml-1.5">Resubmitted</Badge>}</div>
        ),
      },
      {
        id: "record",
        header: "School / College",
        accessorFn: (e) => e.name,
        cell: ({ row: { original: e } }) => (
          <div className="max-w-80">{e.name}<span className="block text-xs text-muted">{codeText(e)}</span></div>
        ),
      },
      { id: "pin", header: "PIN", accessorFn: (e) => e.area.pincode, cell: ({ getValue }) => <span className="text-xs">{String(getValue())}</span> },
      {
        id: "deo",
        header: "Operator",
        accessorFn: (e) => e.deo.name,
        cell: ({ row: { original: e } }) => <div>{e.deo.name}<span className="block text-xs text-muted">{e.deo.id}</span></div>,
      },
      { accessorKey: "submittedAt", header: "Submitted", cell: ({ getValue }) => <span className="whitespace-nowrap text-xs">{fmtDateTime(String(getValue()))}</span> },
      ...(view === "all" ? ([{ accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> }] as ColumnDef<VerifierEntry, unknown>[]) : []),
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row: { original: e } }) =>
          e.status === "pending" ? (
            <div className="flex justify-end gap-1.5">
              <Button size="sm" onClick={() => setOpen({ id: e.id })}><ShieldCheck /> Verify</Button>
              <Button size="sm" variant="light" onClick={() => setOpen({ id: e.id, reject: true })} aria-label={`Reject ${e.id}`}><CircleX /></Button>
            </div>
          ) : (
            <div className="flex justify-end"><Button size="sm" variant="light" onClick={() => setOpen({ id: e.id })}><Eye /> View</Button></div>
          ),
      },
    ],
    [view],
  );

  const setView = (v: View) => router.replace(v === "all" ? `${path}?view=all` : path, { scroll: false });
  const s = summary.data;

  return (
    <>
      <PageHeader title="Verify Data" description="Check each school entry against the source and approve it, or reject it with a reason. Oldest entries come first." />
      {list.isError && <Alert tone="red" icon={TriangleAlert} className="mb-4">Could not load entries. Please refresh the page.</Alert>}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <FilterTabs<View>
            value={view}
            onChange={setView}
            options={[
              { value: "pending", label: "Pending Verification", count: s?.pending },
              { value: "all", label: "All Assigned", count: s?.totalAssigned },
            ]}
          />
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ID / code / name / operator" className="pl-9" />
          </div>
        </div>
        <DataTable
          columns={columns}
          data={rows}
          loading={list.isLoading}
          emptyText={view === "pending" ? "Nothing pending. All entries assigned to you are verified." : "No entries assigned to you yet."}
        />
      </Card>
      <VerifyDialog id={open?.id ?? null} startReject={open?.reject} onClose={() => setOpen(null)} />
    </>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyInner />
    </Suspense>
  );
}
