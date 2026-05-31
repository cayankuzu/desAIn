"use client";

import { create } from "zustand";
import type { Locale } from "@/lib/i18n/translations";

export type SidebarTab =
  | "room"
  | "details"
  | "outliner"
  | "shortcuts"
  | "validation"
  | "inventory";

interface UIStore {
  activeSidebarTab: SidebarTab;
  setActiveSidebarTab: (tab: SidebarTab) => void;
  selectedStructure:
    | {
        type: "wall" | "opening";
        id: string;
      }
    | null;
  setSelectedStructure: (
    selection:
      | {
          type: "wall" | "opening";
          id: string;
        }
      | null,
  ) => void;
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const getInitialLocale = (): Locale => {
  if (typeof window === "undefined") {
    return "tr";
  }

  const storedLocale = window.localStorage.getItem("desain-locale");
  return storedLocale === "en" || storedLocale === "tr" ? storedLocale : "tr";
};

export const useUIStore = create<UIStore>((set) => ({
  activeSidebarTab: "room",
  setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab }),
  selectedStructure: null,
  setSelectedStructure: (selectedStructure) => set({ selectedStructure }),
  locale: getInitialLocale(),
  setLocale: (locale) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("desain-locale", locale);
    }

    set({ locale });
  },
}));
