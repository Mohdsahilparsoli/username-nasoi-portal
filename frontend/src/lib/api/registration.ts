/**
 * Registration and profile – real NASOI API (nasoi-backend).
 *   POST /api/v1/registrations/uploads   one document (multipart)
 *   POST /api/v1/registrations           the full form
 *   GET  /api/v1/profile/me, PATCH /profile/me/contact, PATCH /profile/me/bank
 *   GET  /api/v1/documents/:id
 */
import type { Role } from "@/types";
import { authRaw, authRequest, request } from "./auth";

export type DocumentKind = "aadhaar" | "aadhaar_front" | "aadhaar_back" | "pan" | "bank_proof" | "photo" | "signature";
export type UploadRef = { id: string; token: string };

export interface RegistrationPayload {
  role: "deo" | "verifier";
  name: string; fatherName: string; motherName: string; dob: string; email: string; mobile: string;
  gender: string; category: string; religion: string;
  country: string; state: string; district: string; subDistrict: string; postOffice: string; pincode: string;
  policeStation: string; address: string;
  bankName: string; accountHolder: string; accountNumber: string; ifsc: string;
  qualification: string; aadhaar: string; pan?: string; bankProofType: string;
  documents: { aadhaar_front: UploadRef; aadhaar_back: UploadRef; pan?: UploadRef; bank_proof: UploadRef; photo: UploadRef; signature: UploadRef };
  password: string; declaration: true; terms: true;
}

export async function uploadDocument(kind: DocumentKind, file: Blob, fileName: string): Promise<UploadRef> {
  const fd = new FormData();
  fd.append("kind", kind);
  fd.append("file", file, fileName);
  const { upload } = await request<{ upload: UploadRef }>("/registrations/uploads", { method: "POST", body: fd });
  return { id: upload.id, token: upload.token };
}

export async function submitRegistration(payload: RegistrationPayload) {
  return request<{ user: { id: string; role: "deo" | "verifier"; name: string; mobile: string; email: string }; emailSent?: boolean }>("/registrations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface MyProfile {
  id: string; role: Role; name: string; mobile: string | null; email: string | null; status: string; joinedAt: string;
  profile: null | {
    fatherName: string; motherName: string; dob: string; gender: string; category: string; religion: string;
    altMobile: string | null; qualification: string; country: string; state: string; district: string; subDistrict: string;
    postOffice: string; pincode: string; policeStation: string; address: string; aadhaar: string; pan: string | null;
    bank: { bankName: string; accountHolder: string; account: string; ifsc: string; proofType: string };
  };
  documents: { id: string; kind: DocumentKind; fileName: string; mimeType: string; size: number; createdAt: string }[];
}

export async function getMyProfile(role: Role) {
  return (await authRequest<{ user: MyProfile }>(role, "/profile/me")).user;
}

export function updateContact(role: Role, v: { mobile: string; altMobile?: string; email: string; address: string }) {
  return authRequest<{ ok: true }>(role, "/profile/me/contact", { method: "PATCH", body: JSON.stringify(v) });
}

export function updateBank(role: Role, v: { bankName: string; accountHolder: string; accountNumber: string; ifsc: string }) {
  return authRequest<{ ok: true }>(role, "/profile/me/bank", { method: "PATCH", body: JSON.stringify(v) });
}

/** Opens a stored document in a new tab (fetched with the access token, shown from memory). */
export async function openDocument(role: Role, id: string) {
  const tab = window.open("", "_blank"); // open synchronously so pop-up blockers allow it
  try {
    const res = await authRaw(role, `/documents/${id}`);
    const url = URL.createObjectURL(await res.blob());
    if (tab) tab.location.href = url;
    else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (e) {
    tab?.close();
    throw e;
  }
}
