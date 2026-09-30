import type { Role } from "@/types";

/** One place for every React Query key, so invalidation stays consistent. */
export const qk = {
  user: (id: string) => ["user", id] as const,
  users: (role: Role) => ["users", role] as const,
  assignments: (deoId?: string) => ["assignments", deoId ?? "all"] as const,
  entries: (deoId?: string) => ["entries", deoId ?? "all"] as const,
  settings: () => ["settings"] as const,
};
