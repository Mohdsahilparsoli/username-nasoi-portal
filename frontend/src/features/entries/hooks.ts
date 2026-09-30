"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { EntryData } from "@/types";

export function useEntries(deoId?: string) {
  return useQuery({ queryKey: qk.entries(deoId), queryFn: () => api.listEntries({ deoId }) });
}

/** Everything that depends on entries (counts, earnings, queues) refreshes together. */
function useInvalidateEntries() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["entries"] });
    qc.invalidateQueries({ queryKey: ["assignments"] });
  };
}

export function useCreateEntry(deoId: string) {
  const invalidate = useInvalidateEntries();
  return useMutation({
    mutationFn: (v: { assignmentId: string; data: EntryData }) => api.createEntry(deoId, v.assignmentId, v.data),
    onSuccess: invalidate,
  });
}

export function useResubmitEntry(deoId: string) {
  const invalidate = useInvalidateEntries();
  return useMutation({
    mutationFn: (v: { id: string; data: EntryData }) => api.resubmitEntry(deoId, v.id, v.data),
    onSuccess: invalidate,
  });
}

export function useVerifyEntry(verifierId: string) {
  const invalidate = useInvalidateEntries();
  return useMutation({
    mutationFn: (v: { id: string; approve: boolean; reason?: string }) =>
      api.verifyEntry(verifierId, v.id, v.approve, v.reason),
    onSuccess: invalidate,
  });
}
