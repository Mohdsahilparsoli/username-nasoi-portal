"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "@/types";

/**
 * One session per role, so DEO, Verifier and Admin can stay logged in
 * together in the same browser (e.g. three tabs).
 * With the real backend this will hold only display info; the actual
 * login lives in a secure HTTP-only cookie.
 */
export interface SessionInfo {
  id: string;
  name: string;
  at: number;
}

interface SessionState {
  sessions: Partial<Record<Role, SessionInfo>>;
  signIn: (role: Role, info: Omit<SessionInfo, "at">) => void;
  signOut: (role: Role) => void;
  signOutAll: () => void;
}

export const SESSION_KEY = "nasoi_next_sessions";

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      sessions: {},
      signIn: (role, info) => set((s) => ({ sessions: { ...s.sessions, [role]: { ...info, at: Date.now() } } })),
      signOut: (role) =>
        set((s) => {
          const next = { ...s.sessions };
          delete next[role];
          return { sessions: next };
        }),
      signOutAll: () => set({ sessions: {} }),
    }),
    { name: SESSION_KEY },
  ),
);

export const useSession = (role: Role) => useSessionStore((s) => s.sessions[role]);
