"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CirclePlus, Eye, Pencil, Search, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useDeferredValue, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, FilterTabs } from "@/components/ui/data-table";
import { Input } from "@/components/ui/form-controls";
import { Alert, PageHeader, StatusBadge } from "@/components/ui/misc";
import { useMyEntries, useMyWork } from "@/features/work/hooks";
import type { EntryStatus, SchoolEntry } from "@/lib/api/work";
import { fmtDateTime, money } from "@/lib/utils";

type Filter = "all" | EntryStatus;

function EntriesInner() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const filter = (["pending", "approved", "rejected"].includes(params.get("status") ?? "") ? params.get("status") : "all") as Filter;
  const [q, setQ] = useState(params.get("q") ?? "");
  const dq = useDeferredValue(q.trim().toLowerCase());
  const entries = useMyEntries();
  const work = useMyWork();
  const currentId = work.data?.current?.id;

  const setFilter = (v: Filter) => {
    const p = new URLSearchParams(params.toString());
    if (v !== "all") p.set("status", v);
    else p.delete("status");
    router.replace(`${path}${p.size ? `?${p}` : ""}`, { scroll: false });
  };

  const all = useMemo(() => entries.data ?? [], [entries.data]);
  const rows = useMemo(
    () =>
      all.filter(
        (e) =>
          (filter === "all" || e.status === filter) &&
          (!dq || [e.id, e.school.udiseCode, e.school.schoolName, e.school.lgdVillage].some((v) => v.toLowerCase().includes(dq))),
      ),
    [all, filter, dq],
  );
  const count = (s: EntryStatus) => all.filter((e) => e.status === s).length;

  const columns = useMemo<ColumnDef<SchoolEntry, unknown>[]>(
    () => [
      { accessorKey: "id", header: "Entry ID", cell: ({ row }) => <Link href={`/deo/entries/${row.original.id}`} className="font-semibold text-primary hover:underline">{row.original.id}</Link> },
      {
        id: "school",
        header: "School",
        accessorFn: (e) => e.school.schoolName,
        cell: ({ row: { original: e } }) => (
          <div className="max-w-80">
            {e.school.schoolName}
            <span className="block text-xs text-muted">UDISE {e.school.udiseCode} · {e.school.lgdVillage}</span>
            {e.status === "rejected" && <span className="mt-0.5 block text-xs text-danger">Reason: {e.rejectReason || "—"}</span>}
          </div>
        ),
      },
      { id: "pin", header: "PIN", accessorFn: (e) => e.area.pincode, cell: ({ getValue }) => <span className="text-xs">{String(getValue())}</span> },
      { accessorKey: "assignmentId", header: "Work", cell: ({ getValue }) => <span className="whitespace-nowrap text-xs">{String(getValue())}</span> },
      { accessorKey: "submittedAt", header: "Submitted", cell: ({ getValue }) => <span className="whitespace-nowrap text-xs">{fmtDateTime(String(getValue()))}</span> },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      {
        id: "amount",
        header: "Amount",
        accessorFn: (e) => (e.status === "approved" ? e.ratePerEntry : 0),
        cell: ({ row: { original: e } }) => (e.status === "approved" ? money(e.ratePerEntry) : <span className="text-muted">—</span>),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row: { original: e } }) => {
          const editable = e.status !== "approved" && e.assignmentId === currentId;
          return (
            <div className="flex flex-wrap justify-end gap-1.5">
              <Button asChild variant={editable && e.status === "rejected" ? "outline" : "light"} size="sm">
                <Link href={`/deo/entries/${e.id}`}>
                  {editable ? <><Pencil /> {e.status === "rejected" ? "Fix & Resubmit" : "View / Edit"}</> : <><Eye /> View</>}
                </Link>
              </Button>
            </div>
          );
        },
      },
    ],
    [currentId],
  );

  return (
    <>
      <PageHeader
        title="My Entries"
        description="Every school you entered and its verification status."
        action={<Button asChild><Link href="/deo/entries/new"><CirclePlus /> New Entry</Link></Button>}
      />
      {entries.isError && <Alert tone="red" icon={TriangleAlert} className="mb-4">Could not load your entries. Please refresh the page.</Alert>}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <FilterTabs<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: all.length },
              { value: "pending", label: "Pending", count: count("pending") },
              { value: "approved", label: "Approved", count: count("approved") },
              { value: "rejected", label: "Rejected", count: count("rejected") },
            ]}
          />
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input placeholder="Search ID / UDISE / school / village" value={q} className="pl-9" onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <DataTable
          columns={columns}
          data={rows}
          loading={entries.isLoading}
          emptyText={all.length ? "No entries match the filter." : "You have not added any entry yet."}
        />
      </Card>
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
