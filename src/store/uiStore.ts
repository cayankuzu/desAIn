"use client";

import { create } from "zustand";

export type SidebarTab = "inspector" | "chat" | "json";

interface UIStore {
  activeSidebarTab: SidebarTab;
  setActiveSidebarTab: (tab: SidebarTab) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  activeSidebarTab: "inspector",
  setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab }),
}));
