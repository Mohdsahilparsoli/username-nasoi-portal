"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CircleCheck, CircleX, ClipboardCheck, Clock, Eye, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useMe } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Input, Select } from "@/components/ui/form-controls";
import { Badge, PageHeader, StatCard } from "@/components/ui/misc";
import { useEntries, useVerifyEntry } from "@/features/entries/hooks";
import { VerifyDialog } from "@/features/entries/verify-dialog";
import { useUsers } from "@/features/users/hooks";
import { fmtDateTime } from "@/lib/utils";
import type { Entry } from "@/types";

export default function VerifierQueuePage() {
  const me = useMe();
  const entries = useEntries();
  const deos = useUsers("deo");
  const verify = useVerifyEntry(me.id);
  const [deo, setDeo] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<{ entry: Entry; reject: boolean } | null>(null);

  const all = useMemo(() => entries.data ?? [], [entries.data]);
  const pending = all.filter((e) => e.status === "pending");
  const mine = all.filter((e) => e.verifierId === me.id);
  const today = new Date().toDateString();
  const deoName = (id: string) => deos.data?.find((u) => u.id === id)?.name ?? id;

  const rows = useMemo(
    () =>
      pending
        .filter((e) => (!deo || e.deoId === deo) && (!q || e.id.toLowerCase().includes(q.toLowerCase()) || e.data.studentName.toLowerCase().includes(q.toLowerCase())))
        .sort((a, b) => (a.submittedAt > b.submittedAt ? 1 : -1)), // oldest first
    [pending, deo, q],
  );

  const columns = useMemo<ColumnDef<Entry, unknown>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Entry ID",
        cell: ({ row: { original: e } }) => (
          <div className="flex flex-wrap items-center gap-1.5"><b className="text-navy">{e.id}</b>{e.resubmitted && <Badge tone="blue">Resubmitted</Badge>}</div>
        ),
      },
      {
        id: "deo",
        header: "Operator",
        accessorFn: (e) => e.deoId,
        cell: ({ row: { original: e } }) => <div>{deoName(e.deoId)}<span className="block text-xs text-muted">{e.deoId}</span></div>,
      },
      {
        id: "student",
        header: "Student / Record",
        accessorFn: (e) => e.data.studentName,
        cell: ({ row: { original: e } }) => (
          <div>{e.data.studentName}<span className="block text-xs text-muted">{e.data.className} • Roll {e.data.rollNo} • {e.data.percentage}%</span></div>
        ),
      },
      { accessorKey: "submittedAt", header: "Submitted", cell: ({ getValue }) => <span className="whitespace-nowrap text-xs">{fmtDateTime(String(getValue()))}</span> },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row: { original: e } }) => (
          <div className="flex flex-wrap gap-1.5">
            <Button variant="light" size="sm" onClick={() => setOpen({ entry: e, reject: false })}><Eye /> View</Button>
            <Button
              variant="success"
              size="sm"
              disabled={verify.isPending}
              onClick={() => verify.mutate({ id: e.id, approve: true }, { onSuccess: () => toast.success(`Entry ${e.id} approved.`), onError: (err) => toast.error(err.message) })}
            >
              <CircleCheck /> Approve
            </Button>
            <Button variant="danger" size="sm" onClick={() => setOpen({ entry: e, reject: true })}><CircleX /> Reject</Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deos.data, verify.isPending],
  );

  return (
    <>
      <PageHeader title="Verify Data" description="Check each entry against the source and approve or reject it with a reason." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Pending to verify" value={pending.length} icon={Clock} tone="amber" />
        <StatCard label="Approved by me" value={mine.filter((e) => e.status === "approved").length} icon={CircleCheck} tone="green" href="/verifier/approved" />
        <StatCard label="Rejected by me" value={mine.filter((e) => e.status === "rejected").length} icon={CircleX} tone="red" href="/verifier/rejected" />
        <StatCard label="Verified today" value={mine.filter((e) => e.verifiedAt && new Date(e.verifiedAt).toDateString() === today).length} icon={ClipboardCheck} tone="blue" />
      </div>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h3 className="font-semibold">Pending verification</h3>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Select value={deo} onChange={(e) => setDeo(e.target.value)} className="sm:w-56">
              <option value="">All operators</option>
              {deos.data?.map((u) => <option key={u.id} value={u.id}>{u.id} – {u.name}</option>)}
            </Select>
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ID / student" className="pl-9" />
            </div>
          </div>
        </div>
        <DataTable columns={columns} data={rows} loading={entries.isLoading} emptyText="Nothing pending. All entries are verified." />
      </Card>
      <VerifyDialog entry={open?.entry ?? null} startReject={open?.reject} verifierId={me.id} onClose={() => setOpen(null)} />
    </>
  );
}
