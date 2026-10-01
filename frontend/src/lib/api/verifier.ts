/** Real API for the Verifier panel and the admin settings. */
import { authRequest } from "./auth";
import type { SchoolEntry } from "./work";

export interface VerifierSummary {
  totalAssigned: number;
  pending: number;
  approved: number;
  rejected: number;
  income: number;
  verifiedToday: number;
  /** ₹ per verified (approved or rejected) entry right now. */
  rate: number;
  monthly: { month: string; approved: number; rejected: number; income: number }[];
}

export interface VerifierEntry extends SchoolEntry {
  deo: { id: string; name: string };
  assignment: { id: string; taskType: string; village: string; block: string };
  verifierId: string | null;
  assignedAt: string | null;
  history?: { decision: "approved" | "rejected"; reason: string | null; createdAt: string; verifierId: string }[];
}

export interface HistoryRow {
  id: string;
  decision: "approved" | "rejected";
  reason: string | null;
  rate: number;
  createdAt: string;
  entry: { id: string; udiseCode: string; schoolName: string; pincode: string; currentStatus: string };
  deo: { id: string; name: string };
}

export interface AppSettings {
  verifierRate: number;
  defaultDeoRate: number;
  payoutWindow: string;
  updatedAt?: string;
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const verifierSummary = () => authRequest<VerifierSummary>("verifier", "/verifier/summary");

export const verifierEntries = (view: "pending" | "all") =>
  authRequest<{ entries: VerifierEntry[] }>("verifier", `/verifier/entries?view=${view}`).then((r) => r.entries);

export const verifierEntry = (id: string) =>
  authRequest<{ entry: VerifierEntry }>("verifier", `/verifier/entries/${encodeURIComponent(id)}`).then((r) => r.entry);

export const decide = (id: string, decision: "approved" | "rejected", reason?: string) =>
  authRequest<{ entry: SchoolEntry; rate: number }>("verifier", `/verifier/entries/${encodeURIComponent(id)}/decision`, json("POST", { decision, reason }));

export const verifierHistory = (decision?: "approved" | "rejected") =>
  authRequest<{ history: HistoryRow[] }>("verifier", `/verifier/history${decision ? `?decision=${decision}` : ""}`).then((r) => r.history);

export const getSettings = () => authRequest<{ settings: AppSettings }>("admin", "/admin/settings").then((r) => r.settings);

export const saveSettings = (v: AppSettings) =>
  authRequest<{ settings: AppSettings }>("admin", "/admin/settings", json("PATCH", v)).then((r) => r.settings);
