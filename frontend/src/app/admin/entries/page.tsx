"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, FilterTabs } from "@/components/ui/data-table";
import { Input, Select } from "@/components/ui/form-controls";
import { PageHeader, StatusBadge } from "@/components/ui/misc";
import { useEntries } from "@/features/entries/hooks";
import { VerifyDialog } from "@/features/entries/verify-dialog";
import { useUsers } from "@/features/users/hooks";
import { fmtDateTime } from "@/lib/utils";
import type { Entry, EntryStatus } from "@/types";

type Filter = "all" | EntryStatus;

function AllEntriesInner() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const filter = (["pending", "approved", "rejected"].includes(params.get("status") ?? "") ? params.get("status") : "all") as Filter;
  const deo = params.get("deo") ?? "";
  const q = params.get("q") ?? "";
  const entries = useEntries();
  const deos = useUsers("deo");
  const verifiers = useUsers("verifier");
  const [viewing, setViewing] = useState<Entry | null>(null);

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
          (!deo || e.deoId === deo) &&
          (!q || e.id.toLowerCase().includes(q.toLowerCase()) || e.data.studentName.toLowerCase().includes(q.toLowerCase())),
      ),
    [all, filter, deo, q],
  );
  const name = (list: typeof deos.data, id: string | null) => (id ? list?.find((u) => u.id === id)?.name ?? id : "—");

  const columns = useMemo<ColumnDef<Entry, unknown>[]>(
    () => [
      { accessorKey: "id", header: "Entry ID", cell: ({ getValue }) => <b className="text-navy">{String(getValue())}</b> },
      { id: "deo", header: "Operator", accessorFn: (e) => name(deos.data, e.deoId) },
      {
        id: "student",
        header: "Student",
        accessorFn: (e) => e.data.studentName,
        cell: ({ row: { original: e } }) => (
          <div>{e.data.studentName}{e.status === "rejected" && <span className="block text-xs text-danger">{e.reason}</span>}</div>
        ),
      },
      { accessorKey: "submittedAt", header: "Submitted", cell: ({ getValue }) => <span className="whitespace-nowrap text-xs">{fmtDateTime(String(getValue()))}</span> },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { id: "vr", header: "Verified by", accessorFn: (e) => name(verifiers.data, e.verifierId), cell: ({ getValue }) => <span className="text-xs">{String(getValue())}</span> },
      { id: "view", header: "", enableSorting: false, cell: ({ row }) => <Button variant="light" size="sm" onClick={() => setViewing(row.original)}><Eye /> View</Button> },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deos.data, verifiers.data],
  );

  return (
    <>
      <PageHeader title="All Entries" description="Every entry submitted on the portal." />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <FilterTabs<Filter>
            value={filter}
            onChange={(v) => setParam("status", v)}
            options={[
              { value: "all", label: "All", count: all.length },
              { value: "pending", label: "Pending", count: all.filter((e) => e.status === "pending").length },
              { value: "approved", label: "Approved", count: all.filter((e) => e.status === "approved").length },
              { value: "rejected", label: "Rejected", count: all.filter((e) => e.status === "rejected").length },
            ]}
          />
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Select value={deo} onChange={(e) => setParam("deo", e.target.value)} className="sm:w-52">
              <option value="">All operators</option>
              {deos.data?.map((u) => <option key={u.id} value={u.id}>{u.id} – {u.name}</option>)}
            </Select>
            <div className="relative w-full sm:w-52">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input defaultValue={q} onChange={(e) => setParam("q", e.target.value)} placeholder="Search ID / student" className="pl-9" />
            </div>
          </div>
        </div>
        <DataTable columns={columns} data={rows} loading={entries.isLoading} pageSize={15} />
      </Card>
      <VerifyDialog entry={viewing} onClose={() => setViewing(null)} />
    </>
  );
}

export default function AllEntriesPage() {
  return (
    <Suspense>
      <AllEntriesInner />
    </Suspense>
  );
}
