"use client";

import { create } from "zustand";
import type { Locale } from "@/lib/i18n/translations";

export type SidebarTab =
  | "room"
  | "details"
  | "outliner"
  | "shortcuts"
  | "validation"
  | "inventory"
  | "random";

export type SelectedStructure =
  | {
      type: "wall" | "opening";
      id: string;
    }
  | null;

interface UIStore {
  activeSidebarTab: SidebarTab;
  setActiveSidebarTab: (tab: SidebarTab) => void;
  selectedStructure: SelectedStructure;
  setSelectedStructure: (
    selection: SelectedStructure,
  ) => void;
  multiSelectMenu:
    | {
        x: number;
        y: number;
      }
    | null;
  setMultiSelectMenu: (
    menu:
      | {
          x: number;
          y: number;
        }
      | null,
  ) => void;
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const getInitialLocale = (): Locale => {
  return "tr";
};

export const useUIStore = create<UIStore>((set) => ({
  activeSidebarTab: "room",
  setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab }),
  selectedStructure: null,
  setSelectedStructure: (selectedStructure) => set({ selectedStructure }),
  multiSelectMenu: null,
  setMultiSelectMenu: (multiSelectMenu) => set({ multiSelectMenu }),
  locale: getInitialLocale(),
  setLocale: (locale) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("desain-locale", locale);
    }

    set({ locale });
  },
}));
