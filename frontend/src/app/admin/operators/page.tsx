"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Search, Target, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useDeferredValue, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, FilterTabs } from "@/components/ui/data-table";
import { Input, Select } from "@/components/ui/form-controls";
import { Alert, Badge, PageHeader } from "@/components/ui/misc";
import { EmployeeStatusActions, EmployeeStatusBadge } from "@/features/work/employee-status";
import { useOperators } from "@/features/work/hooks";
import type { EmployeeStatus, OperatorRow } from "@/lib/api/work";
import { fmtDate } from "@/lib/utils";

type RoleTab = "all" | "deo" | "verifier";

function EmployeesInner() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const tab = (["deo", "verifier"].includes(params.get("role") ?? "") ? params.get("role") : "all") as RoleTab;
  const [status, setStatus] = useState<"" | EmployeeStatus>((params.get("status") as EmployeeStatus) ?? "");
  const list = useOperators();
  const [q, setQ] = useState("");
  const dq = useDeferredValue(q.trim().toLowerCase());

  const all = useMemo(() => list.data ?? [], [list.data]);
  const rows = useMemo(
    () =>
      all.filter(
        (u) =>
          (tab === "all" || u.role === tab) &&
          (!status || u.status === status) &&
          (!dq || [u.id, u.name, u.mobile ?? "", u.email ?? "", u.location?.district ?? "", u.location?.pincode ?? ""].some((v) => v.toLowerCase().includes(dq))),
      ),
    [all, tab, status, dq],
  );
  const count = (r: RoleTab) => all.filter((u) => r === "all" || u.role === r).length;
  const pending = all.filter((u) => u.status === "pending").length;

  const columns = useMemo<ColumnDef<OperatorRow, unknown>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ row: { original: u } }) => <div><b className="text-navy">{u.id}</b><span className="block text-xs text-muted">Joined {fmtDate(u.joinedAt)}</span></div>,
      },
      { accessorKey: "role", header: "Role", cell: ({ getValue }) => (getValue() === "verifier" ? <Badge tone="blue">Verifier</Badge> : <Badge>DEO</Badge>) },
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
        header: "Work",
        accessorFn: (u) => u.assignments.active,
        cell: ({ row: { original: u } }) =>
          u.role === "verifier" ? (
            <span className="text-xs">{u.assignments.active} active area(s)</span>
          ) : u.currentAssignment ? (
            <span className="text-xs">Busy · {u.currentAssignment.id}</span>
          ) : (
            <span className="text-xs text-muted">No active work</span>
          ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row: { original: u } }) => (
          <div>
            <EmployeeStatusBadge status={u.status} />
            {u.statusReason && u.status !== "active" && <span className="mt-0.5 block max-w-40 truncate text-[11px] text-muted" title={u.statusReason}>{u.statusReason}</span>}
          </div>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row: { original: u } }) => (
          <div className="flex flex-wrap gap-1.5">
            <Button asChild variant="light" size="sm"><Link href={`/admin/operators/${u.id}`}><Eye /> View</Link></Button>
            {u.role === "deo" && u.eligible && (
              <Button asChild size="sm"><Link href={`/admin/assign?deo=${u.id}`}><Target /> Assign</Link></Button>
            )}
            <EmployeeStatusActions u={u} />
          </div>
        ),
      },
    ],
    [],
  );

  const setTab = (v: RoleTab) => {
    const p = new URLSearchParams(params.toString());
    if (v === "all") p.delete("role");
    else p.set("role", v);
    router.replace(`${path}${p.size ? `?${p}` : ""}`, { scroll: false });
  };

  return (
    <>
      <PageHeader
        title="Employees"
        description="Data Entry Operators and Verifiers. Only active employees can be assigned work."
        action={
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ID / name / mobile / PIN" className="pl-9" />
          </div>
        }
      />
      {pending > 0 && (
        <Alert tone="blue" className="mb-4">
          <b>{pending}</b> new registration{pending > 1 ? "s are" : " is"} waiting for approval.{" "}
          <button type="button" className="font-semibold underline" onClick={() => setStatus("pending")}>Show them</button>
        </Alert>
      )}
      {list.isError && <Alert tone="red" icon={TriangleAlert} className="mb-4">Could not load employees. Please refresh the page.</Alert>}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <FilterTabs<RoleTab>
            value={tab}
            onChange={setTab}
            options={[
              { value: "all", label: "All", count: count("all") },
              { value: "deo", label: "Data Entry Operators", count: count("deo") },
              { value: "verifier", label: "Verifiers", count: count("verifier") },
            ]}
          />
          <Select value={status} onChange={(e) => setStatus(e.target.value as EmployeeStatus | "")} className="w-48" aria-label="Status">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending approval</option>
            <option value="inactive">Inactive</option>
            <option value="rejected">Rejected</option>
          </Select>
        </div>
        <DataTable columns={columns} data={rows} loading={list.isLoading} emptyText={q || status ? "No employee matches the filter." : "No employee has registered yet."} />
      </Card>
    </>
  );
}

export default function EmployeesPage() {
  return (
    <Suspense>
      <EmployeesInner />
    </Suspense>
  );
}
