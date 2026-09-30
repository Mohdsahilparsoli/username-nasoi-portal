"use client";

import { useSyncExternalStore } from "react";
import { useSessionStore } from "./session-store";

/** True once the saved sessions have been read from browser storage. */
export function useSessionHydrated() {
  return useSyncExternalStore(
    (cb) => useSessionStore.persist.onFinishHydration(cb),
    () => useSessionStore.persist.hasHydrated(),
    () => false,
  );
}
