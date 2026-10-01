import type { EntryStatus, Role } from "@/types";
import { STATE_DISTRICTS } from "./india-locations";

export { STATES_LIST, UNION_TERRITORIES } from "./india-locations";

/** All States / UTs of India → districts (A–Z). */
export const STATES: Record<string, string[]> = STATE_DISTRICTS;

/** NASOI services – the type of work in an assignment (same list as the backend). */
export const TASK_TYPES = [
  "Student UHID Card Service",
  "National Scholarship Eligibility Examination Test (NSEET)",
  "Data Entry Services",
  "Students Education Support Services",
  "Academic Management Services",
] as const;

export const REJECT_REASONS = [
  "Date of birth does not match the source document.",
  "Student name spelling mismatch with school register.",
  "Percentage entered is outside the valid range.",
  "Duplicate entry – this record already exists.",
  "Pincode does not belong to the assigned area.",
];

export const GENDERS = ["Male", "Female", "Other"];
export const CATEGORIES = ["GEN", "OBC", "SC", "ST"];
export const QUALIFICATIONS = ["Class 5", "Class 8", "Class 10", "Class 12", "Graduation", "Post Graduation"];
export const RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Parsi", "Other"];
export const COUNTRIES = ["India"];
export const CLASSES = ["10th", "12th"];
export const BOARDS = ["UP Board", "CBSE", "ICSE", "State Board (Other)"];

export const ROLE_META: Record<Role, { label: string; short: string; home: string }> = {
  deo: { label: "Data Entry Operator", short: "DEO", home: "/deo" },
  verifier: { label: "Verifier", short: "VR", home: "/verifier" },
  admin: { label: "Super Admin", short: "Admin", home: "/admin" },
};

export const STATUS_LABEL: Record<EntryStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};
