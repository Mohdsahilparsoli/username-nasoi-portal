"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api/connect";
import type { Role } from "@/types";

const KEY = ["connect"] as const;

export function useContacts(role: Role, enabled = true) {
  return useQuery({ queryKey: [...KEY, "contacts", role], queryFn: () => api.contacts(role), enabled, staleTime: 60_000 });
}

/** Upcoming / live meetings and open requests (sidebar badge, dashboard widget). Refreshes every minute. */
export function useConnectSummary(role: Role, enabled = true) {
  return useQuery({ queryKey: [...KEY, "summary", role], queryFn: () => api.connectSummary(role), enabled, refetchInterval: 60_000 });
}

export function useMeetings(role: Role, view: "upcoming" | "past" | "all") {
  return useQuery({ queryKey: [...KEY, "meetings", role, view], queryFn: () => api.meetings(role, view), refetchInterval: 60_000 });
}

export function useRequests(role: Role, box: "inbox" | "sent") {
  return useQuery({ queryKey: [...KEY, "requests", role, box], queryFn: () => api.requests(role, box), refetchInterval: 60_000 });
}

function useConnectMutation<A, R>(fn: (a: A) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export const useCreateMeeting = (role: Role) => useConnectMutation((v: api.NewMeeting) => api.createMeeting(role, v));
export const useCancelMeeting = (role: Role) => useConnectMutation((id: string) => api.cancelMeeting(role, id));
export const useCreateRequest = (role: Role) => useConnectMutation((v: api.NewRequest) => api.createRequest(role, v));
export const useRespondRequest = (role: Role) =>
  useConnectMutation((v: { id: string; action: "accept" | "decline" | "close"; reply?: string }) => api.respondRequest(role, v.id, v.action, v.reply));

export function useSaveMeetingLink(role: Role) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (link: string) => api.saveMeetingLink(role, link),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useAdminOverview() {
  return useQuery({ queryKey: ["admin-overview"], queryFn: api.adminOverview, refetchInterval: 60_000 });
}
