import type { EntryStatus, Role } from "@/types";
import { STATE_DISTRICTS } from "./india-locations";

export { STATES_LIST, UNION_TERRITORIES } from "./india-locations";

/** All States / UTs of India → districts (A–Z). */
export const STATES: Record<string, string[]> = STATE_DISTRICTS;

export const TASK_TYPES = [
  "Student Academic Record",
  "School Survey Form",
  "Scholarship Application Data",
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

export const ROLE_META: Record<Role, { label: string; short: string; home: string; demoId: string; demoPw: string }> = {
  deo: { label: "Data Entry Operator", short: "DEO", home: "/deo", demoId: "DEO126", demoPw: "Abcd@2026" },
  verifier: { label: "Verifier", short: "VR", home: "/verifier", demoId: "VR101", demoPw: "Abcd@2026" },
  admin: { label: "Super Admin", short: "Admin", home: "/admin", demoId: "ADMIN", demoPw: "Admin@2026" },
};

export const STATUS_LABEL: Record<EntryStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};
