"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CirclePlus, Eye, Pencil, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useMe } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, FilterTabs } from "@/components/ui/data-table";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/form-controls";
import { PageHeader, StatusBadge } from "@/components/ui/misc";
import { useAssignments } from "@/features/assignments/hooks";
import { EntryDetail } from "@/features/entries/components";
import { useEntries } from "@/features/entries/hooks";
import { fmtDateTime, money } from "@/lib/utils";
import type { Entry, EntryStatus } from "@/types";

type Filter = "all" | EntryStatus;

function EntriesInner() {
  const me = useMe();
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const filter = (["pending", "approved", "rejected"].includes(params.get("status") ?? "") ? params.get("status") : "all") as Filter;
  const q = params.get("q") ?? "";
  const entries = useEntries(me.id);
  const asg = useAssignments(me.id);
  const [viewing, setViewing] = useState<Entry | null>(null);

  // Filter and search live in the URL, so refresh / share keeps them.
  const setParam = (k: string, v: string) => {
    const p = new URLSearchParams(params.toString());
    if (v && v !== "all") p.set(k, v);
    else p.delete(k);
    router.replace(`${path}${p.size ? `?${p}` : ""}`, { scroll: false });
  };

  const all = useMemo(() => entries.data ?? [], [entries.data]);
  const rows = useMemo(
    () =>
      all.filter(
        (e) =>
          (filter === "all" || e.status === filter) &&
          (!q || e.id.toLowerCase().includes(q.toLowerCase()) || e.data.studentName.toLowerCase().includes(q.toLowerCase())),
      ),
    [all, filter, q],
  );
  const count = (s: EntryStatus) => all.filter((e) => e.status === s).length;

  const columns = useMemo<ColumnDef<Entry, unknown>[]>(
    () => [
      { accessorKey: "id", header: "Entry ID", cell: ({ row }) => <b className="text-navy">{row.original.id}</b> },
      {
        id: "student",
        header: "Student / Record",
        accessorFn: (e) => e.data.studentName,
        cell: ({ row: { original: e } }) => (
          <div>
            {e.data.studentName}
            <span className="block text-xs text-muted">{e.data.className} • Roll {e.data.rollNo}</span>
            {e.status === "rejected" && <span className="mt-0.5 block text-xs text-danger">Reason: {e.reason}</span>}
          </div>
        ),
      },
      { accessorKey: "assignmentId", header: "Assignment", cell: ({ getValue }) => <span className="text-xs">{String(getValue())}</span> },
      { accessorKey: "submittedAt", header: "Submitted", cell: ({ getValue }) => <span className="whitespace-nowrap text-xs">{fmtDateTime(String(getValue()))}</span> },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      {
        id: "amount",
        header: "Amount",
        enableSorting: false,
        cell: ({ row: { original: e } }) => (e.status === "approved" ? money(e.rate) : <span className="text-muted">—</span>),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row: { original: e } }) => (
          <div className="flex flex-wrap justify-end gap-1.5">
            <Button variant="light" size="sm" onClick={() => setViewing(e)}><Eye /> View</Button>
            {e.status === "rejected" && (
              <Button asChild variant="outline" size="sm"><Link href={`/deo/entries/${e.id}`}><Pencil /> Edit &amp; Resubmit</Link></Button>
            )}
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="My Entries"
        description="Every entry you submitted and its verification status."
        action={<Button asChild><Link href="/deo/entries/new"><CirclePlus /> New Entry</Link></Button>}
      />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <FilterTabs<Filter>
            value={filter}
            onChange={(v) => setParam("status", v)}
            options={[
              { value: "all", label: "All", count: all.length },
              { value: "pending", label: "Pending", count: count("pending") },
              { value: "approved", label: "Approved", count: count("approved") },
              { value: "rejected", label: "Rejected", count: count("rejected") },
            ]}
          />
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input placeholder="Search ID / student name" defaultValue={q} className="pl-9" onChange={(e) => setParam("q", e.target.value)} />
          </div>
        </div>
        <DataTable columns={columns} data={rows} loading={entries.isLoading} emptyText="No entries found." />
      </Card>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        {viewing && (
          <DialogContent
            title="Entry details"
            footer={
              viewing.status === "rejected" ? (
                <Button asChild variant="outline"><Link href={`/deo/entries/${viewing.id}`}><Pencil /> Edit &amp; Resubmit</Link></Button>
              ) : undefined
            }
          >
            <EntryDetail entry={viewing} assignment={asg.data?.find((a) => a.id === viewing.assignmentId)} />
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

export default function DeoEntriesPage() {
  return (
    <Suspense>
      <EntriesInner />
    </Suspense>
  );
}
