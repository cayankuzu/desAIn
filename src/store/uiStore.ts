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

export type WorkspaceMode = "kitchen" | "ai";

export type SelectedStructure =
  | {
      type: "wall" | "opening";
      id: string;
    }
  | null;

interface UIStore {
  workspaceMode: WorkspaceMode;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
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
  if (typeof window === "undefined") {
    return "tr";
  }

  const storedLocale = window.localStorage.getItem("desain-locale");
  return storedLocale === "en" || storedLocale === "tr" ? storedLocale : "tr";
};

const getInitialWorkspaceMode = (): WorkspaceMode => {
  if (typeof window === "undefined") {
    return "kitchen";
  }

  const stored = window.localStorage.getItem("desain-workspace-mode");
  return stored === "ai" || stored === "kitchen" ? stored : "kitchen";
};

export const useUIStore = create<UIStore>((set) => ({
  workspaceMode: getInitialWorkspaceMode(),
  setWorkspaceMode: (workspaceMode) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("desain-workspace-mode", workspaceMode);
    }

    set({ workspaceMode });
  },
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
