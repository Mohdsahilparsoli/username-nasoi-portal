/** Real API for the Verifier panel and the admin settings. */
import { authRaw, authRequest } from "./auth";
import type { PersonCard, RecordEntry, RecordType } from "./work";

export interface VerifierSummary {
  totalAssigned: number;
  pending: number;
  approved: number;
  rejected: number;
  income: number;
  verifiedToday: number;
  monthly: { month: string; approved: number; rejected: number; income: number }[];
}

export interface VerifierEntry extends RecordEntry {
  deo: PersonCard;
  assignment: { id: string; taskType: string; recordType: RecordType; village: string; block: string };
  verifierId: string | null;
  assignedAt: string | null;
  history?: { decision: "approved" | "rejected"; reason: string | null; createdAt: string; verifierId: string }[];
}

export interface HistoryRow {
  id: string;
  decision: "approved" | "rejected";
  reason: string | null;
  createdAt: string;
  entry: { id: string; recordType: RecordType; code: string; name: string; pincode: string; currentStatus: string };
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
  authRequest<{ entry: RecordEntry }>("verifier", `/verifier/entries/${encodeURIComponent(id)}/decision`, json("POST", { decision, reason }));

export interface VerifierArea {
  id: string;
  taskType: string;
  recordType: RecordType;
  target: number;
  area: { state: string; district: string; block: string; village: string; pincode: string };
  deadline: string;
  status: "active" | "completed" | "cancelled";
  deo: PersonCard;
  progress: { submitted: number; approved: number; rejected: number };
}

export const verifierAreas = () => authRequest<{ areas: VerifierArea[] }>("verifier", "/verifier/areas").then((r) => r.areas);

export const verifierHistory = (decision?: "approved" | "rejected") =>
  authRequest<{ history: HistoryRow[] }>("verifier", `/verifier/history${decision ? `?decision=${decision}` : ""}`).then((r) => r.history);

export const getSettings = () => authRequest<{ settings: AppSettings }>("admin", "/admin/settings").then((r) => r.settings);

export const saveSettings = (v: AppSettings) =>
  authRequest<{ settings: AppSettings }>("admin", "/admin/settings", json("PATCH", v)).then((r) => r.settings);

/* ---------- Admin: all entries + export ---------- */
export type EntryFilter = Partial<Record<"status" | "recordType" | "pincode" | "deoId" | "verifierId" | "assignmentId" | "taskType" | "state" | "district" | "from" | "to" | "q", string>>;

export interface AdminEntry {
  id: string;
  assignmentId: string;
  taskType: string;
  area: { state: string; district: string; pincode: string };
  recordType: RecordType;
  code: string;
  name: string;
  status: "pending" | "approved" | "rejected";
  rejectReason: string | null;
  deo: { id: string; name: string };
  verifier: { id: string; name: string } | null;
  ratePerEntry: number;
  submittedAt: string;
  verifiedAt: string | null;
}

export interface ExportOptions {
  totalApproved: number;
  pincodes: { value: string; count: number }[];
  deos: { value: string; label: string; count: number }[];
  verifiers: { value: string; label: string; count: number }[];
  assignments: { value: string; count: number }[];
  districts: { state: string; district: string; count: number }[];
  services: { value: string; count: number }[];
  recordTypes: { value: string; label: string; count: number }[];
}

const query = (f: EntryFilter) => {
  const s = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();
  return s ? `?${s}` : "";
};

export const adminEntries = (f: EntryFilter) =>
  authRequest<{ total: number; counts: Record<"all" | "pending" | "approved" | "rejected", number>; entries: AdminEntry[] }>("admin", `/admin/entries${query(f)}`);

export const exportOptions = () => authRequest<ExportOptions>("admin", "/admin/entries/export-options");

/** Downloads approved entries (Excel or CSV) with the given filters; no filters = everything. */
export async function downloadExport(format: "xlsx" | "csv", f: EntryFilter) {
  const res = await authRaw("admin", `/admin/entries/export${query({ ...f, format } as EntryFilter)}`);
  const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? `nasoi-approved-entries.${format}`;
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return name;
}
