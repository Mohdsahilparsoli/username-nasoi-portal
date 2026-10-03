"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DetailGrid } from "@/components/ui/misc";
import type { PaymentRecord } from "@/lib/api/work";
import { fmtDate, fmtDateTime, money } from "@/lib/utils";

/** "View more" popup with every detail of a payment receipt. */
export function PaymentDetailDialog({ payment, onClose, showEmployee }: { payment: PaymentRecord | null; onClose: () => void; showEmployee?: boolean }) {
  return (
    <Dialog open={!!payment} onOpenChange={(o) => !o && onClose()}>
      {payment && (
        <DialogContent title={`Payment ${payment.id}`} description={`${money(payment.amount)} paid on ${fmtDate(payment.paidOn)}`}>
          <DetailGrid
            items={[
              ...(showEmployee && payment.user ? ([["Employee", `${payment.user.name} (${payment.user.id})`]] as [string, string][]) : []),
              ["Amount", <b key="a" className="text-lg text-navy">{money(payment.amount)}</b>],
              ["Paid on", fmtDate(payment.paidOn)],
              ["Transaction ID", <span key="t" className="font-mono">{payment.transactionId}</span>],
              ["Mode", payment.mode],
              ["Paid to (name)", payment.payeeName],
              ["Entries covered", payment.entriesCount ?? "—"],
              ["Period", payment.periodFrom || payment.periodTo ? `${fmtDate(payment.periodFrom)} to ${fmtDate(payment.periodTo)}` : "—"],
              ["Notes", payment.notes || "—"],
              ["Recorded on", fmtDateTime(payment.createdAt)],
            ]}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}
