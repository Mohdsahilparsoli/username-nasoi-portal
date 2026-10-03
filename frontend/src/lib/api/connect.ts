/** Meetings (Zoom / Google Meet), requests between admin / DEO / verifier, personal meeting link, admin overview. */
import { authRequest } from "./auth";
import type { MeetingPlatform, PersonCard } from "./work";
import type { Role } from "@/types";

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export interface Contact extends PersonCard {
  role: Role;
}

export type MeetingState = "upcoming" | "live" | "ended" | "cancelled";

export interface Meeting {
  id: string;
  title: string;
  platform: MeetingPlatform;
  link: string;
  startsAt: string;
  durationMin: number;
  notes: string | null;
  entryId: string | null;
  status: "scheduled" | "cancelled";
  state: MeetingState;
  createdBy: Contact | null;
  participants: Contact[];
  mine: boolean;
  createdAt: string;
}

export type RequestKind = "meeting" | "entry" | "general";
export type RequestStatus = "open" | "accepted" | "declined" | "closed";

export interface ConnectRequest {
  id: string;
  kind: RequestKind;
  from: Contact | null;
  to: Contact | null;
  entryId: string | null;
  subject: string;
  message: string;
  preferredAt: string | null;
  status: RequestStatus;
  reply: string | null;
  respondedAt: string | null;
  meetingId: string | null;
  incoming: boolean;
  createdAt: string;
}

export interface NewMeeting {
  title: string;
  link: string;
  startsAt: string;
  durationMin: number;
  notes?: string;
  participantIds: string[];
  entryId?: string;
  requestId?: string;
}

export interface NewRequest {
  kind: RequestKind;
  toId: string;
  entryId?: string;
  subject?: string;
  message: string;
  preferredAt?: string;
}

export interface ConnectSummary {
  upcoming: number;
  live: number;
  next: Meeting[];
  openInbox: number;
}

export const contacts = (role: Role) => authRequest<{ contacts: Contact[] }>(role, "/connect/contacts").then((r) => r.contacts);
export const connectSummary = (role: Role) => authRequest<ConnectSummary>(role, "/connect/summary");
export const meetings = (role: Role, view: "upcoming" | "past" | "all") =>
  authRequest<{ meetings: Meeting[] }>(role, `/connect/meetings?view=${view}`).then((r) => r.meetings);
export const createMeeting = (role: Role, v: NewMeeting) => authRequest<{ meeting: Meeting }>(role, "/connect/meetings", json("POST", v)).then((r) => r.meeting);
export const cancelMeeting = (role: Role, id: string) =>
  authRequest<{ meeting: Meeting }>(role, `/connect/meetings/${encodeURIComponent(id)}/cancel`, json("POST", {})).then((r) => r.meeting);
export const requests = (role: Role, box: "inbox" | "sent") =>
  authRequest<{ requests: ConnectRequest[] }>(role, `/connect/requests?box=${box}`).then((r) => r.requests);
export const createRequest = (role: Role, v: NewRequest) =>
  authRequest<{ request: ConnectRequest }>(role, "/connect/requests", json("POST", v)).then((r) => r.request);
export const respondRequest = (role: Role, id: string, action: "accept" | "decline" | "close", reply?: string) =>
  authRequest<{ request: ConnectRequest }>(role, `/connect/requests/${encodeURIComponent(id)}/respond`, json("POST", { action, reply })).then((r) => r.request);
export const saveMeetingLink = (role: Role, link: string) =>
  authRequest<{ meetingLink: string | null; platform: MeetingPlatform | null }>(role, "/profile/me/meeting-link", json("PATCH", { link }));

/* ---------- Super Admin overview ---------- */
export interface AdminOverview {
  employees: {
    deo: { total: number; active: number; pending: number; inactive: number; rejected: number; eligible: number };
    verifier: { total: number; active: number; pending: number; inactive: number; rejected: number };
  };
  entries: { total: number; pending: number; approved: number; rejected: number; submittedToday: number; approvedToday: number; rejectedToday: number; schools: number; colleges: number };
  work: { active: number; completed: number; cancelled: number; overdue: number };
  money: { deoEarned: number; verifierEarned: number; earned: number; deoPaid: number; verifierPaid: number; paid: number; balance: number; payments: number };
  monthly: { month: string; submitted: number; approved: number; rejected: number; pending: number; earned: number }[];
  topDeos: { id: string; name: string; approved: number; pending: number; rejected: number; earned: number }[];
  topVerifiers: { id: string; name: string; approved: number; rejected: number; earned: number }[];
  queue: { id: string | null; name: string | null; pending: number; oldest: string }[];
  topDistricts: { state: string; district: string; entries: number; approved: number }[];
  recentEmployees: { id: string; name: string; role: "deo" | "verifier"; status: string; joinedAt: string; district: string | null }[];
  recentPayments: { id: string; userId: string; name: string; role: string; amount: number; paidOn: string; mode: string }[];
  upcomingMeetings: { id: string; title: string; platform: MeetingPlatform; link: string; startsAt: string; durationMin: number; people: number }[];
  openRequests: number;
  generatedAt: string;
}
export const adminOverview = () => authRequest<AdminOverview>("admin", "/admin/overview");
