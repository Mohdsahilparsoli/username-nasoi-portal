export type Role = "deo" | "verifier" | "admin";
export type EntryStatus = "pending" | "approved" | "rejected";
export type AssignmentStatus = "active" | "completed";
export type UserStatus = "active" | "blocked";

export interface BankDetails {
  bankName: string;
  holder: string;
  account: string;
  ifsc: string;
}

export interface User {
  id: string;
  role: Role;
  name: string;
  fatherName?: string;
  motherName?: string;
  dob?: string;
  gender?: string;
  category?: string;
  religion?: string;
  mobile: string;
  altMobile?: string;
  email: string;
  state?: string;
  district?: string;
  tehsil?: string;
  pincode?: string;
  address?: string;
  qualification?: string;
  bank?: BankDetails;
  /** Small data-URL thumbnail (demo only; real app stores a file on the server). */
  photo?: string;
  certificateName?: string;
  status: UserStatus;
  joinedAt: string;
}

/** Stored record in the mock database (never sent to UI with password). */
export interface UserRecord extends User {
  password: string;
}

export interface Area {
  state: string;
  district: string;
  block: string;
  village: string;
}

export interface Assignment {
  id: string;
  deoId: string;
  taskType: string;
  area: Area;
  target: number;
  rate: number;
  deadline: string;
  note?: string;
  status: AssignmentStatus;
  createdAt: string;
  seenAt: string | null;
}

export interface EntryData {
  studentName: string;
  fatherName: string;
  gender: string;
  dob: string;
  className: string;
  rollNo: string;
  school: string;
  board: string;
  percentage: string;
  village: string;
  pincode: string;
  mobile?: string;
}

export interface Entry {
  id: string;
  deoId: string;
  assignmentId: string;
  rate: number;
  data: EntryData;
  status: EntryStatus;
  reason: string;
  submittedAt: string;
  verifiedAt: string | null;
  verifierId: string | null;
  resubmitted?: boolean;
}

export interface Settings {
  rate: number;
  payoutWindow: string;
}

export interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  earnings: number;
}

export type PayoutStatus = "Paid" | "In progress" | "Under verification";

export interface MonthRow extends Stats {
  key: string; // YYYY-MM
  payout: PayoutStatus;
}

export interface RegisterInput {
  name: string;
  fatherName: string;
  motherName: string;
  dob: string;
  gender: string;
  category: string;
  religion?: string;
  mobile: string;
  altMobile?: string;
  email: string;
  state: string;
  district: string;
  tehsil: string;
  pincode: string;
  address: string;
  qualification: string;
  bank: BankDetails;
  photo?: string;
  certificateName?: string;
}
