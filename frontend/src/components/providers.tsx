"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { DB_KEY, reloadDb } from "@/lib/mock/db";
import { SESSION_KEY, useSessionStore } from "@/stores/session-store";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: true, retry: 1 } },
      }),
  );

  // Live sync between tabs: when another tab (another role) changes data,
  // refresh this tab too.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === DB_KEY) {
        reloadDb();
        client.invalidateQueries();
      } else if (e.key === SESSION_KEY) {
        useSessionStore.persist.rehydrate();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [client]);

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster position="bottom-center" richColors closeButton />
    </QueryClientProvider>
  );
}
