/**
 * API layer used by every page (through React Query hooks).
 *
 * Today each function reads/writes the mock database in the browser.
 * When the Express backend is ready, replace the body of each function
 * with a fetch() to the matching endpoint (noted above each one) –
 * pages and components will not need to change.
 */
import { getDb, nextId, resetDb, saveDb } from "@/lib/mock/db";
import type {
  Assignment, Entry, EntryData, RegisterInput, Role, Settings, User, UserRecord,
} from "@/types";

export class ApiError extends Error {}

const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toISOString();
const strip = ({ password: _pw, ...u }: UserRecord): User => u;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function genPassword(name: string) {
  const base = name.replace(/[^A-Za-z]/g, "").slice(0, 4) || "User";
  return base[0].toUpperCase() + base.slice(1).toLowerCase() + "@" + (1000 + Math.floor(Math.random() * 9000));
}

/* ------------------------------------------------------------------ */
/* Auth                                                               */
/* ------------------------------------------------------------------ */

// Login, logout, refresh and change-password use the real API: see ./auth.ts

/** POST /api/v1/auth/register */
export async function registerDeo(input: RegisterInput): Promise<{ user: User; password: string }> {
  await wait(600);
  const db = getDb();
  if (db.users.some((u) => u.mobile === input.mobile)) throw new ApiError("This mobile number is already registered.");
  if (db.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase()))
    throw new ApiError("This email ID is already registered.");
  if (input.aadhaar && db.users.some((u) => u.aadhaar === input.aadhaar))
    throw new ApiError("This Aadhaar number is already registered.");
  const password = genPassword(input.name);
  const rec: UserRecord = {
    ...input, id: nextId("deo", "DEO", 0), role: "deo", password, status: "active", joinedAt: now(),
  };
  db.users.push(rec);
  saveDb();
  return { user: strip(clone(rec)), password };
}

/** GET /api/v1/users/me */
export async function getUser(id: string): Promise<User> {
  await wait(120);
  const u = getDb().users.find((x) => x.id === id);
  if (!u) throw new ApiError("User not found.");
  return strip(clone(u));
}

/** PATCH /api/v1/users/me */
export async function updateUser(id: string, patch: Partial<User>): Promise<User> {
  await wait(300);
  const db = getDb();
  const u = db.users.find((x) => x.id === id);
  if (!u) throw new ApiError("User not found.");
  if (patch.mobile && db.users.some((x) => x.id !== id && x.mobile === patch.mobile))
    throw new ApiError("Mobile number already used by another account.");
  Object.assign(u, patch);
  saveDb();
  return strip(clone(u));
}


/** GET /api/v1/admin/users?role=deo */
export async function listUsers(role: Role): Promise<User[]> {
  await wait(150);
  return getDb().users.filter((u) => u.role === role).map((u) => strip(clone(u)));
}

/* ------------------------------------------------------------------ */
/* Assignments                                                        */
/* ------------------------------------------------------------------ */

/** GET /api/v1/assignments (DEO: own, Admin: all) */
export async function listAssignments(deoId?: string): Promise<Assignment[]> {
  await wait(150);
  return clone(getDb().assignments.filter((a) => !deoId || a.deoId === deoId)).sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1,
  );
}

/** POST /api/v1/admin/assignments */
export async function createAssignment(input: Omit<Assignment, "id" | "status" | "createdAt" | "seenAt">) {
  await wait(400);
  const a: Assignment = { ...input, id: nextId("assignment", "ASG", 3), status: "active", createdAt: now(), seenAt: null };
  getDb().assignments.push(a);
  saveDb();
  return clone(a);
}

/** PATCH /api/v1/admin/assignments/:id */
export async function setAssignmentStatus(id: string, status: Assignment["status"]) {
  await wait(200);
  const a = getDb().assignments.find((x) => x.id === id);
  if (!a) throw new ApiError("Assignment not found.");
  a.status = status;
  saveDb();
}

/** POST /api/v1/assignments/mark-seen */
export async function markAssignmentsSeen(deoId: string) {
  let changed = false;
  for (const a of getDb().assignments) {
    if (a.deoId === deoId && !a.seenAt) {
      a.seenAt = now();
      changed = true;
    }
  }
  if (changed) saveDb();
}

/* ------------------------------------------------------------------ */
/* Entries                                                            */
/* ------------------------------------------------------------------ */

/** GET /api/v1/entries (DEO: own, Verifier/Admin: all) */
export async function listEntries(filter: { deoId?: string } = {}): Promise<Entry[]> {
  await wait(150);
  return clone(getDb().entries.filter((e) => !filter.deoId || e.deoId === filter.deoId)).sort((a, b) =>
    a.submittedAt < b.submittedAt ? 1 : -1,
  );
}

/** POST /api/v1/entries */
export async function createEntry(deoId: string, assignmentId: string, data: EntryData): Promise<Entry> {
  await wait(400);
  const db = getDb();
  const a = db.assignments.find((x) => x.id === assignmentId && x.deoId === deoId && x.status === "active");
  if (!a) throw new ApiError("This assignment is not active.");
  if (db.entries.some((e) => e.deoId === deoId && e.data.rollNo === data.rollNo && e.status !== "rejected"))
    throw new ApiError("An entry with this roll number already exists.");
  const e: Entry = {
    id: nextId("entry", "ENT", 5), deoId, assignmentId, rate: a.rate, data, status: "pending", reason: "",
    submittedAt: now(), verifiedAt: null, verifierId: null,
  };
  db.entries.push(e);
  saveDb();
  return clone(e);
}

/** PUT /api/v1/entries/:id/resubmit */
export async function resubmitEntry(deoId: string, id: string, data: EntryData): Promise<Entry> {
  await wait(400);
  const e = getDb().entries.find((x) => x.id === id && x.deoId === deoId);
  if (!e || e.status !== "rejected") throw new ApiError("Only rejected entries can be resubmitted.");
  Object.assign(e, { data, status: "pending", reason: "", resubmitted: true, submittedAt: now(), verifiedAt: null, verifierId: null });
  saveDb();
  return clone(e);
}

/** POST /api/v1/entries/:id/verify */
export async function verifyEntry(verifierId: string, id: string, approve: boolean, reason = ""): Promise<Entry> {
  await wait(300);
  const e = getDb().entries.find((x) => x.id === id);
  if (!e || e.status !== "pending") throw new ApiError("This entry is no longer pending.");
  if (!approve && reason.trim().length < 5) throw new ApiError("Please give a clear reason.");
  Object.assign(e, { status: approve ? "approved" : "rejected", reason: approve ? "" : reason.trim(), verifiedAt: now(), verifierId });
  saveDb();
  return clone(e);
}

/* ------------------------------------------------------------------ */
/* Settings                                                           */
/* ------------------------------------------------------------------ */

/** GET /api/v1/settings */
export async function getSettings(): Promise<Settings> {
  await wait(100);
  return clone(getDb().settings);
}

/** PUT /api/v1/admin/settings */
export async function updateSettings(s: Settings) {
  await wait(300);
  getDb().settings = { ...s };
  saveDb();
}

/** Demo only: restore sample data. */
export async function resetDemoData() {
  await wait(300);
  resetDb();
}
