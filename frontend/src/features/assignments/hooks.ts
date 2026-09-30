"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { Assignment } from "@/types";

export function useAssignments(deoId?: string) {
  return useQuery({ queryKey: qk.assignments(deoId), queryFn: () => api.listAssignments(deoId) });
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof api.createAssignment>[0]) => api.createAssignment(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments"] }),
  });
}

export function useSetAssignmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; status: Assignment["status"] }) => api.setAssignmentStatus(v.id, v.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments"] }),
  });
}

export function useMarkAssignmentsSeen(deoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.markAssignmentsSeen(deoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments"] }),
  });
}
