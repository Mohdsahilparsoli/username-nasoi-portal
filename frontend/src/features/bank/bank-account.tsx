import { cn } from "@/lib/utils";

export interface BankInfo {
  bankName: string;
  account: string;
  ifsc: string;
  accountHolder?: string;
}

/** Full account number, with the IFSC code and bank name written under it. */
export function BankAccount({ bank, className, tone = "default" }: { bank: BankInfo | null | undefined; className?: string; tone?: "default" | "light" }) {
  if (!bank) return <span className={cn("text-muted", className)}>—</span>;
  const sub = tone === "light" ? "text-slate-300" : "text-muted";
  return (
    <span className={cn("block", className)}>
      <span className="block font-mono font-semibold tracking-wide">{bank.account}</span>
      <span className={cn("block text-xs", sub)}>IFSC: <b className="font-mono">{bank.ifsc}</b></span>
      <span className={cn("block text-xs", sub)}>{bank.bankName}</span>
    </span>
  );
}

/** Aadhaar as 1234 5678 9012. */
export const aadhaarText = (n?: string | null) => {
  const d = (n ?? "").replace(/\D/g, "");
  return d.length === 12 ? `${d.slice(0, 4)} ${d.slice(4, 8)} ${d.slice(8)}` : n || "—";
};
