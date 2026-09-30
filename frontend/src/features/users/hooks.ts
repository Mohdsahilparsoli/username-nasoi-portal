"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import * as authApi from "@/lib/api/auth";
import * as regApi from "@/lib/api/registration";
import { useMe } from "@/components/layout/dashboard-shell";
import { qk } from "@/lib/query-keys";
import type { Role, User } from "@/types";

export function useUser(id?: string) {
  return useQuery({ queryKey: qk.user(id ?? ""), queryFn: () => api.getUser(id!), enabled: !!id });
}

export function useUsers(role: Role) {
  return useQuery({ queryKey: qk.users(role), queryFn: () => api.listUsers(role) });
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<User>) => api.updateUser(id, patch),
    onSuccess: (u) => {
      qc.setQueryData(qk.user(id), u);
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

/** Real API: POST /api/v1/auth/change-password (logs out other devices). */
export function useChangePassword(role: Role) {
  return useMutation({ mutationFn: (v: { old: string; pw: string }) => authApi.changePassword(role, v.old, v.pw) });
}

/** Real API: GET /api/v1/profile/me for the logged-in role. */
export function useMyProfile() {
  const { role, id } = useMe();
  return useQuery({ queryKey: ["my-profile", role, id], queryFn: () => regApi.getMyProfile(role) });
}

export function useUpdateContact() {
  const { role, id } = useMe();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { mobile: string; altMobile?: string; email: string; address: string }) => regApi.updateContact(role, v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-profile", role, id] }),
  });
}

export function useUpdateBank() {
  const { role, id } = useMe();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { bankName: string; accountHolder: string; accountNumber: string; ifsc: string }) => regApi.updateBank(role, v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-profile", role, id] }),
  });
}
