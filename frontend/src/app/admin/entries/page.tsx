"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Download, FileSpreadsheet, FileText, RotateCcw, Search, TriangleAlert } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useDeferredValue, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, FilterTabs } from "@/components/ui/data-table";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { Alert, PageHeader, StatusBadge } from "@/components/ui/misc";
import { useAdminEntries, useExportOptions } from "@/features/verification/hooks";
import { codeText } from "@/features/records/record-form";
import { downloadExport, type AdminEntry, type EntryFilter } from "@/lib/api/verifier";
import { fmtDateTime, money } from "@/lib/utils";

type Status = "all" | "pending" | "approved" | "rejected";
type ExportFilter = Pick<EntryFilter, "recordType" | "pincode" | "deoId" | "verifierId" | "assignmentId" | "taskType" | "district" | "from" | "to">;

/* ---------------- Export panel ---------------- */
function ExportPanel() {
  const opts = useExportOptions();
  const [f, setF] = useState<ExportFilter>({});
  const [busy, setBusy] = useState<string | null>(null);
  const set = (k: keyof ExportFilter) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value || undefined }));
  const active = Object.values(f).filter(Boolean).length;
  const o = opts.data;

  const run = async (format: "xlsx" | "csv", all = false) => {
    const key = `${format}${all ? "-all" : ""}`;
    setBusy(key);
    try {
      // District values are "State|District".
      const [state, district] = (f.district ?? "").split("|");
      const filter: EntryFilter = all ? {} : { ...f, state: f.district ? state : undefined, district: f.district ? district : undefined };
      const name = await downloadExport(format, filter);
      toast.success(`Downloaded ${name}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader
        title="Export approved entries"
        action={<span className="text-sm text-muted">{o ? <><b className="text-navy">{o.totalApproved}</b> approved entries</> : "…"}</span>}
      />
      <div className="space-y-5 p-5">
        {opts.isError && <Alert tone="red" icon={TriangleAlert}>Could not load export options. Please refresh the page.</Alert>}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-canvas p-3">
          <span className="mr-auto text-sm font-semibold text-navy">Export all approved data (no filters)</span>
          <Button onClick={() => run("xlsx", true)} disabled={!!busy || !o?.totalApproved}><FileSpreadsheet /> {busy === "xlsx-all" ? "Preparing…" : "Export All – Excel"}</Button>
          <Button variant="light" onClick={() => run("csv", true)} disabled={!!busy || !o?.totalApproved}><FileText /> {busy === "csv-all" ? "Preparing…" : "Export All – CSV"}</Button>
        </div>

        <p className="text-sm font-semibold text-navy">Or export by filter</p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="School / College" htmlFor="x-type">
            <Select id="x-type" value={f.recordType ?? ""} onChange={set("recordType")}>
              <option value="">Both</option>
              {o?.recordTypes.map((t) => <option key={t.value} value={t.value}>{t.label} ({t.count})</option>)}
            </Select>
          </Field>
          <Field label="PIN code" htmlFor="x-pin">
            <Select id="x-pin" value={f.pincode ?? ""} onChange={set("pincode")}>
              <option value="">All PIN codes</option>
              {o?.pincodes.map((p) => <option key={p.value} value={p.value}>{p.value} ({p.count})</option>)}
            </Select>
          </Field>
          <Field label="Data Entry Operator" htmlFor="x-deo">
            <Select id="x-deo" value={f.deoId ?? ""} onChange={set("deoId")}>
              <option value="">All operators</option>
              {o?.deos.map((d) => <option key={d.value} value={d.value}>{d.label} ({d.count})</option>)}
            </Select>
          </Field>
          <Field label="Verifier" htmlFor="x-vr">
            <Select id="x-vr" value={f.verifierId ?? ""} onChange={set("verifierId")}>
              <option value="">All verifiers</option>
              {o?.verifiers.map((v) => <option key={v.value} value={v.value}>{v.label} ({v.count})</option>)}
            </Select>
          </Field>
          <Field label="Assignment" htmlFor="x-asg">
            <Select id="x-asg" value={f.assignmentId ?? ""} onChange={set("assignmentId")}>
              <option value="">All assignments</option>
              {o?.assignments.map((a) => <option key={a.value} value={a.value}>{a.value} ({a.count})</option>)}
            </Select>
          </Field>
          <Field label="Service" htmlFor="x-svc">
            <Select id="x-svc" value={f.taskType ?? ""} onChange={set("taskType")}>
              <option value="">All services</option>
              {o?.services.map((s) => <option key={s.value} value={s.value}>{s.value} ({s.count})</option>)}
            </Select>
          </Field>
          <Field label="Educational district" htmlFor="x-dist">
            <Select id="x-dist" value={f.district ?? ""} onChange={set("district")}>
              <option value="">All districts</option>
              {o?.districts.map((d) => <option key={`${d.state}|${d.district}`} value={`${d.state}|${d.district}`}>{d.district}, {d.state} ({d.count})</option>)}
            </Select>
          </Field>
          <Field label="Approved from" htmlFor="x-from">
            <Input id="x-from" type="date" value={f.from ?? ""} max={f.to} onChange={set("from")} />
          </Field>
          <Field label="Approved to" htmlFor="x-to">
            <Input id="x-to" type="date" value={f.to ?? ""} min={f.from} onChange={set("to")} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => run("xlsx")} disabled={!!busy || !active}><Download /> {busy === "xlsx" ? "Preparing…" : "Export Excel"}</Button>
          <Button variant="light" onClick={() => run("csv")} disabled={!!busy || !active}><Download /> {busy === "csv" ? "Preparing…" : "Export CSV"}</Button>
          {active > 0 && <Button variant="ghost" onClick={() => setF({})}><RotateCcw /> Clear filters ({active})</Button>}
          {!active && <span className="self-center text-xs text-muted">Choose at least one filter, or use Export All above.</span>}
        </div>
      </div>
    </Card>
  );
}

/* ---------------- Entries list ---------------- */
function AllEntriesInner() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const status = (["pending", "approved", "rejected"].includes(params.get("status") ?? "") ? params.get("status") : "all") as Status;
  const [q, setQ] = useState("");
  const dq = useDeferredValue(q.trim());
  const list = useAdminEntries({ status: status === "all" ? undefined : status, q: dq || undefined });
  const c = list.data?.counts;

  const columns = useMemo<ColumnDef<AdminEntry, unknown>[]>(
    () => [
      { accessorKey: "id", header: "Entry", cell: ({ row: { original: e } }) => <div><b className="text-navy">{e.id}</b><span className="block text-xs text-muted">{e.assignmentId}</span></div> },
      {
        id: "record",
        header: "School / College",
        accessorFn: (e) => e.name,
        cell: ({ row: { original: e } }) => (
          <div className="max-w-72">
            {e.name}
            <span className="block text-xs text-muted">{codeText(e)}</span>
            {e.status === "rejected" && <span className="block text-xs text-danger">Reason: {e.rejectReason}</span>}
          </div>
        ),
      },
      { id: "pin", header: "PIN", accessorFn: (e) => e.area.pincode, cell: ({ row: { original: e } }) => <span className="text-xs">{e.area.pincode}<span className="block text-muted">{e.area.district}</span></span> },
      { id: "deo", header: "Operator", accessorFn: (e) => e.deo.name, cell: ({ row: { original: e } }) => <div>{e.deo.name}<span className="block text-xs text-muted">{e.deo.id}</span></div> },
      {
        id: "vr",
        header: "Verifier",
        accessorFn: (e) => e.verifier?.name ?? "",
        cell: ({ row: { original: e } }) => (e.verifier ? <div>{e.verifier.name}<span className="block text-xs text-muted">{e.verifier.id}</span></div> : <span className="text-xs text-muted">Not assigned</span>),
      },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { accessorKey: "ratePerEntry", header: "DEO rate", cell: ({ getValue }) => <span className="text-xs">{money(Number(getValue()))}</span> },
      { accessorKey: "submittedAt", header: "Submitted", cell: ({ getValue }) => <span className="whitespace-nowrap text-xs">{fmtDateTime(String(getValue()))}</span> },
    ],
    [],
  );

  const setStatus = (v: Status) => router.replace(v === "all" ? path : `${path}?status=${v}`, { scroll: false });

  return (
    <>
      <PageHeader title="All Entries" description="Every school and college entry on the portal. Export approved entries to Excel or CSV." />
      <ExportPanel />
      {list.isError && <Alert tone="red" icon={TriangleAlert} className="mb-4">Could not load entries. Please refresh the page.</Alert>}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <FilterTabs<Status>
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All", count: c?.all },
              { value: "pending", label: "Pending", count: c?.pending },
              { value: "approved", label: "Approved", count: c?.approved },
              { value: "rejected", label: "Rejected", count: c?.rejected },
            ]}
          />
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ID / code / name" className="pl-9" />
          </div>
        </div>
        <DataTable columns={columns} data={list.data?.entries ?? []} loading={list.isLoading} emptyText="No entries found." />
        {list.data && list.data.total > list.data.entries.length && (
          <p className="border-t border-line px-5 py-3 text-xs text-muted">Showing the latest {list.data.entries.length} of {list.data.total}. Use search or export for the full list.</p>
        )}
      </Card>
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
