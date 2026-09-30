"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
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

export function useChangePassword(id: string) {
  return useMutation({ mutationFn: (v: { old: string; pw: string }) => api.changePassword(id, v.old, v.pw) });
}
