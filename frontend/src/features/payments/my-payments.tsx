"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CircleCheck, Eye, FileSpreadsheet, HandCoins, ReceiptIndianRupee, TriangleAlert, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useMe } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Alert, PageHeader, Skeleton, StatCard } from "@/components/ui/misc";
import { EmailFileButton } from "@/features/files/email-dialog";
import { useMyProfile } from "@/features/users/hooks";
import { useMyPayments } from "@/features/work/hooks";
import { downloadFile, emailFile, type PaymentRecord } from "@/lib/api/work";
import { fmtDate, money } from "@/lib/utils";
import { PaymentDetailDialog } from "./payment-detail";

/** DEO / verifier: every payment received, with totals, details popup, Excel and e-mail. */
export function MyPaymentsPage() {
  const me = useMe();
  const q = useMyPayments(me.role);
  const profile = useMyProfile();
  const [viewing, setViewing] = useState<PaymentRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const columns = useMemo<ColumnDef<PaymentRecord, unknown>[]>(
    () => [
      { accessorKey: "id", header: "Payment ID", cell: ({ getValue }) => <b className="text-navy">{String(getValue())}</b> },
      { accessorKey: "paidOn", header: "Paid on", cell: ({ getValue }) => <span className="whitespace-nowrap">{fmtDate(String(getValue()))}</span> },
      { accessorKey: "amount", header: "Amount", cell: ({ getValue }) => <b>{money(Number(getValue()))}</b> },
      { accessorKey: "transactionId", header: "Transaction ID", cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue())}</span> },
      { accessorKey: "mode", header: "Mode" },
      { accessorKey: "entriesCount", header: "Entries", cell: ({ getValue }) => (getValue() ?? "—") as string },
      { id: "view", header: "", enableSorting: false, cell: ({ row }) => <Button size="sm" variant="light" onClick={() => setViewing(row.original)}><Eye /> View more</Button> },
    ],
    [],
  );

  if (q.isLoading) return <Skeleton className="h-96" />;
  if (q.isError || !q.data) return <Alert tone="red" icon={TriangleAlert}>Could not load your payments. Please refresh the page.</Alert>;
  const s = q.data.summary;
  const email = profile.data?.email ?? undefined;

  const exportExcel = async () => {
    setBusy(true);
    try {
      toast.success(`Downloaded ${await downloadFile(me.role, "/payments/me/export", "nasoi-payments.xlsx")}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Payments"
        description="Every payment NASOI has made to you."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="light" onClick={exportExcel} disabled={busy || !q.data.payments.length}><FileSpreadsheet /> {busy ? "Preparing…" : "Export Excel"}</Button>
            <EmailFileButton
              label="E-mail me"
              title="E-mail my payments"
              description="An Excel file with all your payments."
              fixedTo={email ?? "your registered e-mail"}
              disabled={!q.data.payments.length || !email}
              send={() => emailFile(me.role, "/payments/me/export/email", {})}
            />
          </div>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={me.role === "verifier" ? "Total income" : "Total earned"} value={money(s.earned)} icon={Wallet} tone="blue" />
        <StatCard label="Received" value={money(s.paid)} icon={CircleCheck} tone="green" />
        <StatCard label="Balance" value={money(s.balance)} icon={HandCoins} tone="saffron" />
        <StatCard label="Payments" value={s.payments} icon={ReceiptIndianRupee} />
      </div>
      <Card>
        <CardHeader title="Payment history" />
        <DataTable columns={columns} data={q.data.payments} emptyText="No payment yet. Payments are made between 15th – 25th of every month." />
      </Card>
      <PaymentDetailDialog payment={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
