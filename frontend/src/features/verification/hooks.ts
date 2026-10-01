"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api/verifier";

export function useVerifierSummary(enabled = true) {
  return useQuery({ queryKey: ["verify", "summary"], queryFn: api.verifierSummary, enabled, refetchInterval: 60_000, refetchOnWindowFocus: true });
}

export function useVerifierEntries(view: "pending" | "all") {
  return useQuery({ queryKey: ["verify", "entries", view], queryFn: () => api.verifierEntries(view), refetchOnWindowFocus: true });
}

export function useVerifierEntry(id: string | null) {
  return useQuery({ queryKey: ["verify", "one", id], queryFn: () => api.verifierEntry(id!), enabled: !!id, retry: false });
}

export function useVerifierHistory(decision?: "approved" | "rejected") {
  return useQuery({ queryKey: ["verify", "history", decision ?? "all"], queryFn: () => api.verifierHistory(decision) });
}

export function useDecide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; decision: "approved" | "rejected"; reason?: string }) => api.decide(v.id, v.decision, v.reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["verify"] }),
  });
}

export function useAppSettings(enabled = true) {
  return useQuery({ queryKey: ["app-settings"], queryFn: api.getSettings, enabled });
}

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.saveSettings, onSuccess: (s) => qc.setQueryData(["app-settings"], s) });
}
