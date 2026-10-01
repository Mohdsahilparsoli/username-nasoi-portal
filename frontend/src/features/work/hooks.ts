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

export function useOperators(q?: string) {
  return useQuery({ queryKey: K.operators(q), queryFn: () => api.listOperators(q) });
}

export function useOperator(id: string) {
  return useQuery({ queryKey: K.operator(id), queryFn: () => api.getOperator(id), retry: false });
}

export function useSetOperatorStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; status: "active" | "blocked" }) => api.setOperatorStatus(v.id, v.status),
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
