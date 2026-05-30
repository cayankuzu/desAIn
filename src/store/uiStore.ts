"use client";

import { create } from "zustand";
import type { Locale } from "@/lib/i18n/translations";

export type SidebarTab =
  | "details"
  | "outliner"
  | "validation"
  | "json"
  | "shortcuts";

interface UIStore {
  activeSidebarTab: SidebarTab;
  setActiveSidebarTab: (tab: SidebarTab) => void;
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
  activeSidebarTab: "details",
  setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab }),
  locale: getInitialLocale(),
  setLocale: (locale) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("desain-locale", locale);
    }

    set({ locale });
  },
}));
