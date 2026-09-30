"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { Settings } from "@/types";

export function useSettings() {
  return useQuery({ queryKey: qk.settings(), queryFn: api.getSettings });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (s: Settings) => api.updateSettings(s),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.settings() }),
  });
}

export function useResetDemo() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.resetDemoData, onSuccess: () => qc.invalidateQueries() });
}
