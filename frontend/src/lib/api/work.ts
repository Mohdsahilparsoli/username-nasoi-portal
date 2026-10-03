/**
 * Real API for Super Admin → Operators / Assign work, the DEO's own work,
 * and in-app notifications (all roles).
 */
import { authRaw, authRequest } from "./auth";
import type { Role } from "@/types";

export type AssignmentStatus = "active" | "completed" | "cancelled";

/** Basic card a DEO and the verifier of the same area see about each other. */
export interface PersonCard {
  id: string;
  name: string;
  mobile: string | null;
  hasPhoto?: boolean;
}

export type RecordType = "school" | "college";

export interface WorkAssignment {
  id: string;
  deoId: string;
  deo?: PersonCard;
  verifierId?: string | null;
  /** Admin: { id, name, mobile }. DEO: the verifier's card (with photo flag). */
  verifier?: PersonCard | null;
  taskType: string;
  recordType: RecordType;
  target: number;
  /** Only sent to the Super Admin – DEOs and verifiers never see amounts. */
  ratePerEntry?: number;
  verifierRate?: number | null;
  area: { state: string; district: string; block: string; village: string; pincode: string };
  deadline: string;
  instructions: string | null;
  status: AssignmentStatus;
  seenAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  /** Entries submitted (pending + approved), approved and rejected for this work. */
  progress?: { submitted: number; approved: number; rejected: number };
}

export interface OperatorRow {
  id: string;
  name: string;
  mobile: string | null;
  email: string | null;
  status: "active" | "blocked";
  joinedAt: string;
  lastLoginAt: string | null;
  location: { district: string; state: string; pincode: string } | null;
  qualification: string | null;
  assignments: { total: number; completed: number };
  currentAssignment: { id: string; pincode: string; taskType: string; deadline: string } | null;
  eligible: boolean;
}

export interface OperatorDocument {
  id: string;
  kind: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface OperatorDetail {
  id: string;
  name: string;
  mobile: string | null;
  email: string | null;
  status: "active" | "blocked";
  joinedAt: string;
  lastLoginAt: string | null;
  profile: {
    fatherName: string; motherName: string; dob: string; gender: string; category: string; religion: string;
    altMobile: string | null; qualification: string; country: string; state: string; district: string; subDistrict: string;
    postOffice: string; pincode: string; policeStation: string; address: string; aadhaar: string; pan: string | null;
    bank: { bankName: string; accountHolder: string; account: string; ifsc: string; proofType: string };
  } | null;
  documents: OperatorDocument[];
  assignments: WorkAssignment[];
  eligible: boolean;
}

export interface NewAssignment {
  deoId: string;
  taskType: string;
  recordType: RecordType;
  verifierId: string;
  /** ₹ to the DEO per approved entry. */
  ratePerEntry: number;
  /** ₹ to the verifier per verified entry. */
  verifierRate: number;
  target: number;
  state: string;
  district: string;
  block: string;
  village: string;
  pincode: string;
  deadline: string;
  instructions?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });
const qs = (p: Record<string, string | undefined>) => {
  const s = new URLSearchParams(Object.entries(p).filter(([, v]) => v) as [string, string][]).toString();
  return s ? `?${s}` : "";
};

/* ---------- Super Admin ---------- */
export const listOperators = (q?: string) =>
  authRequest<{ operators: OperatorRow[] }>("admin", `/admin/operators${qs({ q })}`).then((r) => r.operators);

export const getOperator = (id: string) =>
  authRequest<{ operator: OperatorDetail }>("admin", `/admin/operators/${encodeURIComponent(id)}`).then((r) => r.operator);

export const setOperatorStatus = (id: string, status: "active" | "blocked") =>
  authRequest<{ id: string; status: string }>("admin", `/admin/operators/${encodeURIComponent(id)}/status`, json("PATCH", { status }));

export const listWork = (f: { status?: string; deoId?: string; q?: string } = {}) =>
  authRequest<{ assignments: WorkAssignment[] }>("admin", `/admin/assignments${qs(f)}`).then((r) => r.assignments);

export const createWork = (input: NewAssignment) =>
  authRequest<{ assignment: WorkAssignment; emailed: boolean }>("admin", "/admin/assignments", json("POST", input));

export const setWorkStatus = (id: string, status: "completed" | "cancelled") =>
  authRequest<{ assignment: WorkAssignment }>("admin", `/admin/assignments/${encodeURIComponent(id)}`, json("PATCH", { status })).then((r) => r.assignment);

/** Opens an operator's document in a new tab (admin session). */
export async function openOperatorDocument(id: string) {
  const tab = window.open("", "_blank");
  try {
    const res = await authRaw("admin", `/documents/${id}`);
    const url = URL.createObjectURL(await res.blob());
    if (tab) tab.location.href = url;
    else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (e) {
    tab?.close();
    throw e;
  }
}

/* ---------- DEO ---------- */
export const myWork = (markSeen = false) =>
  authRequest<{ current: WorkAssignment | null; history: WorkAssignment[] }>("deo", `/me/assignments${markSeen ? "?seen=1" : ""}`);

/* ---------- Notifications (any role) ---------- */
export const listNotifications = (role: Role) =>
  authRequest<{ notifications: AppNotification[]; unread: number }>(role, "/notifications");

export const markNotificationsRead = (role: Role, v: { ids?: string[]; all?: boolean }) =>
  authRequest<{ ok: true }>(role, "/notifications/read", json("POST", v));

/* ---------- DEO school entries ---------- */
export type EntryStatus = "pending" | "approved" | "rejected";

export interface RecordEntry {
  id: string;
  assignmentId: string;
  deoId: string;
  recordType: RecordType;
  /** UDISE code (school) / AISHE code (college). */
  code: string;
  /** School / college name. */
  name: string;
  area: { state: string; district: string; pincode: string };
  /** All form fields, keyed by field key (see GET /entry-forms). */
  data: Record<string, string | number>;
  status: EntryStatus;
  rejectReason: string | null;
  verifiedAt: string | null;
  resubmitCount: number;
  submittedAt: string;
  updatedAt: string;
}

/** Values sent when saving an entry (all form fields). */
export type RecordInput = Record<string, string | number>;

/* ---------- Form definitions (GET /entry-forms) ---------- */
export interface FieldDef {
  key: string;
  label: string;
  kind: "code" | "text" | "choice" | "year" | "number" | "phone" | "email" | "url";
  section: string;
  required?: boolean;
  options?: string[];
  strict?: boolean;
  pattern?: string;
  patternMessage?: string;
  max?: number;
  min?: number;
  showIf?: { field: string; in: string[] };
  notBefore?: string;
  notAbove?: string;
  hint?: string;
  placeholder?: string;
  wide?: boolean;
}

export interface FormDef {
  type: RecordType;
  label: string;
  codeField: string;
  nameField: string;
  sections: string[];
  fields: FieldDef[];
}

export const entryForms = (role: Role) => authRequest<{ forms: Record<RecordType, FormDef> }>(role, "/entry-forms").then((r) => r.forms);

export interface Totals {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  earnings: number;
}

export interface MySummary {
  totals: Totals;
  monthly: (Totals & { month: string })[];
  currentProgress: { assignmentId: string; target: number; submitted: number; approved: number; pending: number; rejected: number } | null;
}

export const mySummary = () => authRequest<MySummary>("deo", "/me/summary");

export const myEntries = (f: { status?: string; q?: string } = {}) =>
  authRequest<{ entries: RecordEntry[] }>("deo", `/me/entries${qs(f)}`).then((r) => r.entries);

export const myEntry = (id: string) => authRequest<{ entry: RecordEntry }>("deo", `/me/entries/${encodeURIComponent(id)}`).then((r) => r.entry);

export const createEntry = (v: RecordInput) => authRequest<{ entry: RecordEntry }>("deo", "/me/entries", json("POST", v)).then((r) => r.entry);

export const updateEntry = (id: string, v: RecordInput) =>
  authRequest<{ entry: RecordEntry }>("deo", `/me/entries/${encodeURIComponent(id)}`, json("PATCH", v)).then((r) => r.entry);

/** Profile photo of a user (self, or the DEO / verifier of the same area) as an object URL. */
export async function userPhotoUrl(role: Role, userId: string) {
  const res = await authRaw(role, `/users/${encodeURIComponent(userId)}/photo`);
  return URL.createObjectURL(await res.blob());
}

/** Replace my profile photo (JPG / PNG). */
export async function uploadMyPhoto(role: Role, file: Blob) {
  const fd = new FormData();
  fd.append("file", file, "photo.jpg");
  return authRequest<{ document: { id: string } }>(role, "/profile/me/photo", { method: "POST", body: fd });
}

/* ---------- Admin: verifiers ---------- */
export interface VerifierRow extends PersonCard {
  status: "active" | "blocked";
  activeAreas: number;
  pendingEntries: number;
}
export const listVerifiers = () => authRequest<{ verifiers: VerifierRow[] }>("admin", "/admin/verifiers").then((r) => r.verifiers);
export const changeVerifier = (id: string, verifierId: string) =>
  authRequest<{ assignment: WorkAssignment; movedEntries: number }>("admin", `/admin/assignments/${encodeURIComponent(id)}/verifier`, json("PATCH", { verifierId }));
