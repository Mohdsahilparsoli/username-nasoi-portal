"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api/work";
import type { Role } from "@/types";

const K = {
  operators: (q?: string) => ["work", "operators", q ?? ""] as const,
  operator: (id: string) => ["work", "operator", id] as const,
  list: (f: object) => ["work", "assignments", f] as const,
  mine: ["work", "mine"] as const,
  notifications: (role: Role) => ["notifications", role] as const,
};

/** Employees (DEOs and verifiers); pass a role for only one kind. */
export function useOperators(q?: string, role?: api.EmployeeRole) {
  return useQuery({ queryKey: [...K.operators(q), role ?? "all"], queryFn: () => api.listOperators(q, role) });
}

export function useOperator(id: string) {
  return useQuery({ queryKey: K.operator(id), queryFn: () => api.getOperator(id), retry: false });
}

export function useSetOperatorStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; status: "active" | "inactive" | "rejected"; reason?: string }) => api.setOperatorStatus(v.id, v.status, v.reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work"] }),
  });
}

export function useWorkList(f: { status?: string; deoId?: string; q?: string } = {}) {
  return useQuery({ queryKey: K.list(f), queryFn: () => api.listWork(f) });
}

export function useCreateWork() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createWork,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work"] }),
  });
}

export function useSetWorkStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; status: "completed" | "cancelled" }) => api.setWorkStatus(v.id, v.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work"] }),
  });
}

/** DEO's own work (peek – does not mark it seen). Polled so a new assignment shows up without reload. */
export function useMyWork(enabled = true) {
  return useQuery({ queryKey: K.mine, enabled, queryFn: () => api.myWork(false), refetchInterval: 60_000, refetchOnWindowFocus: true });
}

/** Work Status page: marks the current assignment as seen, then refreshes the badge. */
export function useMarkWorkSeen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.myWork(true),
    onSuccess: (r) => qc.setQueryData(K.mine, r),
  });
}

export function useNotifications(role: Role) {
  return useQuery({
    queryKey: K.notifications(role),
    queryFn: () => api.listNotifications(role),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationsRead(role: Role) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { ids?: string[]; all?: boolean }) => api.markNotificationsRead(role, v),
    onSuccess: () => qc.invalidateQueries({ queryKey: K.notifications(role) }),
  });
}

/* ---------- DEO school entries ---------- */
export function useMySummary() {
  return useQuery({ queryKey: ["entries", "summary"], queryFn: api.mySummary, refetchOnWindowFocus: true });
}

export function useMyEntries() {
  return useQuery({ queryKey: ["entries", "list"], queryFn: () => api.myEntries() });
}

export function useMyEntry(id: string) {
  return useQuery({ queryKey: ["entries", "one", id], queryFn: () => api.myEntry(id), retry: false });
}

/** After any change: refresh entries, summary and work progress. */
function useRefreshEntries() {
  const qc = useQueryClient();
  return () => Promise.all([qc.invalidateQueries({ queryKey: ["entries"] }), qc.invalidateQueries({ queryKey: K.mine })]);
}

export function useCreateEntry() {
  const refresh = useRefreshEntries();
  return useMutation({ mutationFn: api.createEntry, onSuccess: refresh });
}

export function useUpdateEntry() {
  const refresh = useRefreshEntries();
  return useMutation({ mutationFn: (v: { id: string; data: api.RecordInput }) => api.updateEntry(v.id, v.data), onSuccess: refresh });
}

/** Form definitions (school / college); they rarely change, so they are cached. */
export function useEntryForms(role: Role) {
  return useQuery({ queryKey: ["entry-forms"], queryFn: () => api.entryForms(role), staleTime: 30 * 60_000 });
}

/** A user's profile photo (only when they have one). */
export function useUserPhoto(role: Role, userId?: string, hasPhoto = true) {
  return useQuery({
    queryKey: ["photo", userId],
    queryFn: () => api.userPhotoUrl(role, userId!),
    enabled: !!userId && hasPhoto,
    staleTime: 10 * 60_000,
    retry: false,
  });
}

export function useUploadPhoto(role: Role, userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: Blob) => api.uploadMyPhoto(role, file),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: ["photo", userId] }), qc.invalidateQueries({ queryKey: ["my-profile"] })]),
  });
}

export function useVerifiers() {
  return useQuery({ queryKey: ["work", "verifiers"], queryFn: api.listVerifiers });
}

export function useChangeVerifier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; verifierId: string }) => api.changeVerifier(v.id, v.verifierId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work"] }),
  });
}

/* ---------- Payouts & payments ---------- */
export function usePayouts(role: api.EmployeeRole) {
  return useQuery({ queryKey: ["payouts", role], queryFn: () => api.payouts(role) });
}

export function usePayments(role?: api.EmployeeRole) {
  return useQuery({ queryKey: ["payouts", "payments", role ?? "all"], queryFn: () => api.listPayments(role) });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.recordPayment, onSuccess: () => qc.invalidateQueries({ queryKey: ["payouts"] }) });
}

export function useMyPayments(role: Role) {
  return useQuery({ queryKey: ["my-payments", role], queryFn: () => api.myPayments(role) });
}
