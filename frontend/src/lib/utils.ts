import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import type { Entry, MonthRow, Stats } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const money = (n: number | undefined) => "₹" + Number(n || 0).toLocaleString("en-IN");


export function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : format(d, "dd MMM yyyy");
}

export function fmtDateTime(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : format(d, "dd MMM yyyy, HH:mm");
}

export function fmtMonth(key: string) {
  const [y, m] = key.split("-").map(Number);
  return format(new Date(y, m - 1, 1), "MMM yyyy");
}

export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export function statsOf(list: Entry[]): Stats {
  const s: Stats = { total: list.length, pending: 0, approved: 0, rejected: 0, earnings: 0 };
  for (const e of list) {
    s[e.status] += 1;
    if (e.status === "approved") s.earnings += Number(e.rate) || 0;
  }
  return s;
}

export function monthlyHistory(list: Entry[]): MonthRow[] {
  const map = new Map<string, MonthRow>();
  for (const e of list) {
    const key = monthKey(new Date(e.submittedAt));
    const row = map.get(key) ?? { key, total: 0, pending: 0, approved: 0, rejected: 0, earnings: 0, payout: "Paid" };
    row.total += 1;
    row[e.status] += 1;
    if (e.status === "approved") row.earnings += Number(e.rate) || 0;
    map.set(key, row);
  }
  const cur = monthKey(new Date());
  return [...map.values()]
    .sort((a, b) => (a.key < b.key ? 1 : -1))
    .map((m) => ({ ...m, payout: m.key === cur ? "In progress" : m.pending ? "Under verification" : "Paid" }));
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
