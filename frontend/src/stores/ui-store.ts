"use client";

import { create } from "zustand";

interface UiState {
  sidebarOpen: boolean;
  setSidebar: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  sidebarOpen: false,
  setSidebar: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
