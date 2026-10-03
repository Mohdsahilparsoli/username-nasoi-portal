"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CircleCheck, Eye, FileSpreadsheet, HandCoins, ReceiptIndianRupee, Search, TriangleAlert, Users, Wallet } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useDeferredValue, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, FilterTabs } from "@/components/ui/data-table";
import { Input } from "@/components/ui/form-controls";
import { Alert, PageHeader, StatCard } from "@/components/ui/misc";
import { EmailFileButton } from "@/features/files/email-dialog";
import { AddReceiptDialog } from "@/features/payments/add-receipt";
import { PaymentDetailDialog } from "@/features/payments/payment-detail";
import { EmployeeStatusBadge } from "@/features/work/employee-status";
import { usePayments, usePayouts } from "@/features/work/hooks";
import { downloadFile, emailFile, type EmployeeRole, type PaymentRecord, type PayoutRow } from "@/lib/api/work";
import { cn, fmtDate, money } from "@/lib/utils";

const ROLE_LABEL: Record<EmployeeRole, string> = { deo: "Data Entry Operators", verifier: "Verifiers" };

function PayoutsInner() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const role: EmployeeRole = params.get("role") === "verifier" ? "verifier" : "deo";
  const data = usePayouts(role);
  const receipts = usePayments(role);
  const [q, setQ] = useState("");
  const dq = useDeferredValue(q.trim().toLowerCase());
  const [adding, setAdding] = useState<{ open: boolean; who: PayoutRow | null }>({ open: false, who: null });
  const [viewing, setViewing] = useState<PaymentRecord | null>(null);
  const [onlyFor, setOnlyFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(
    () => (data.data?.rows ?? []).filter((r) => !dq || [r.id, r.name, r.mobile ?? ""].some((v) => v.toLowerCase().includes(dq))),
    [data.data, dq],
  );
  const shownReceipts = useMemo(() => (receipts.data ?? []).filter((p) => !onlyFor || p.userId === onlyFor), [receipts.data, onlyFor]);
  const t = data.data?.total;

  const columns = useMemo<ColumnDef<PayoutRow, unknown>[]>(
    () => [
      { accessorKey: "id", header: "ID", cell: ({ getValue }) => <b className="text-navy">{String(getValue())}</b> },
      { accessorKey: "name", header: "Name", cell: ({ row: { original: r } }) => <div className="whitespace-nowrap">{r.name}<span className="block text-xs text-muted">{r.mobile}</span></div> },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <EmployeeStatusBadge status={row.original.status} /> },
      {
        id: "bank",
        header: "Bank",
        enableSorting: false,
        cell: ({ row: { original: r } }) => (r.bank ? <span className="text-xs">{r.bank.bankName}<span className="block text-muted">{r.bank.account} · {r.bank.ifsc}</span></span> : <span className="text-xs text-muted">—</span>),
      },
      { accessorKey: "workCount", header: role === "deo" ? "Approved entries" : "Verified entries" },
      { accessorKey: "earned", header: "Earned", cell: ({ getValue }) => money(Number(getValue())) },
      { accessorKey: "paid", header: "Paid", cell: ({ getValue }) => money(Number(getValue())) },
      {
        accessorKey: "balance",
        header: "Balance",
        cell: ({ getValue }) => {
          const b = Number(getValue());
          return <b className={cn(b > 0 ? "text-saffron-dark" : b < 0 ? "text-danger" : "text-success")}>{money(b)}</b>;
        },
      },
      { accessorKey: "lastPaidOn", header: "Last paid", cell: ({ getValue }) => <span className="whitespace-nowrap text-xs">{fmtDate(getValue() as string | null)}</span> },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row: { original: r } }) => (
          <div className="flex flex-col items-stretch gap-1.5">
            <Button size="sm" onClick={() => setAdding({ open: true, who: r })}><HandCoins /> Pay</Button>
            <Button size="sm" variant="light" disabled={!r.payments} onClick={() => setOnlyFor(r.id)}>Receipts ({r.payments})</Button>
          </div>
        ),
      },
    ],
    [role],
  );

  const receiptColumns = useMemo<ColumnDef<PaymentRecord, unknown>[]>(
    () => [
      { accessorKey: "id", header: "Payment ID", cell: ({ getValue }) => <b className="text-navy">{String(getValue())}</b> },
      { id: "who", header: "Employee", accessorFn: (p) => p.user?.name ?? p.userId, cell: ({ row: { original: p } }) => <div>{p.user?.name}<span className="block text-xs text-muted">{p.userId}</span></div> },
      { accessorKey: "paidOn", header: "Paid on", cell: ({ getValue }) => <span className="whitespace-nowrap text-xs">{fmtDate(String(getValue()))}</span> },
      { accessorKey: "amount", header: "Amount", cell: ({ getValue }) => <b>{money(Number(getValue()))}</b> },
      { accessorKey: "transactionId", header: "Transaction ID", cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue())}</span> },
      { accessorKey: "mode", header: "Mode" },
      { accessorKey: "entriesCount", header: "Entries", cell: ({ getValue }) => (getValue() ?? "—") as string },
      { id: "view", header: "", enableSorting: false, cell: ({ row }) => <Button size="sm" variant="light" onClick={() => setViewing(row.original)}><Eye /> View more</Button> },
    ],
    [],
  );

  const setRole = (r: EmployeeRole) => {
    setOnlyFor(null);
    router.replace(r === "verifier" ? `${path}?role=verifier` : path, { scroll: false });
  };
  const exportExcel = async () => {
    setBusy(true);
    try {
      toast.success(`Downloaded ${await downloadFile("admin", `/admin/payouts/export?role=${role}`, `nasoi-${role}-payouts.xlsx`)}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Payouts"
        description="Earned, paid and balance of every employee, from the database. Record each payment as a receipt."
        action={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setAdding({ open: true, who: null })}><ReceiptIndianRupee /> Add Receipt</Button>
            <Button variant="light" onClick={exportExcel} disabled={busy}><FileSpreadsheet /> {busy ? "Preparing…" : `Export ${role === "deo" ? "DEO" : "VR"} Excel`}</Button>
            <EmailFileButton
              title={`E-mail ${ROLE_LABEL[role]} payouts`}
              description="Excel with every employee's earned / paid / balance and all payment receipts."
              send={(m) => emailFile("admin", "/admin/payouts/export/email", { ...m, role })}
            />
          </div>
        }
      />
      <div className="mb-4">
        <FilterTabs<EmployeeRole>
          value={role}
          onChange={setRole}
          options={[
            { value: "deo", label: "Data Entry Operators" },
            { value: "verifier", label: "Verifiers" },
          ]}
        />
      </div>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Employees" value={data.data?.rows.length ?? "…"} icon={Users} />
        <StatCard label="Total earned" value={t ? money(t.earned) : "…"} icon={Wallet} tone="blue" />
        <StatCard label="Total paid" value={t ? money(t.paid) : "…"} icon={CircleCheck} tone="green" />
        <StatCard label="Balance due" value={t ? money(t.balance) : "…"} icon={HandCoins} tone="saffron" />
      </div>
      {data.isError && <Alert tone="red" icon={TriangleAlert} className="mb-4">Could not load payouts. Please refresh the page.</Alert>}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h3 className="font-semibold">{ROLE_LABEL[role]}</h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ID / name / mobile" className="pl-9" />
          </div>
        </div>
        <DataTable columns={columns} data={rows} loading={data.isLoading} emptyText="No employee found." />
      </Card>
      <Card>
        <CardHeader
          title={onlyFor ? `Receipts – ${onlyFor}` : `Receipts – ${ROLE_LABEL[role]}`}
          action={onlyFor ? <Button size="sm" variant="ghost" onClick={() => setOnlyFor(null)}>Show all</Button> : <span className="text-xs text-muted">{receipts.data?.length ?? 0} payments</span>}
        />
        <DataTable columns={receiptColumns} data={shownReceipts} loading={receipts.isLoading} emptyText="No payment recorded yet. Use “Add Receipt”." />
      </Card>
      <AddReceiptDialog open={adding.open} onOpenChange={(o) => setAdding((s) => ({ ...s, open: o }))} employees={data.data?.rows ?? []} preselect={adding.who} />
      <PaymentDetailDialog payment={viewing} onClose={() => setViewing(null)} showEmployee />
    </>
  );
}

export default function PayoutsPage() {
  return (
    <Suspense>
      <PayoutsInner />
    </Suspense>
  );
}
