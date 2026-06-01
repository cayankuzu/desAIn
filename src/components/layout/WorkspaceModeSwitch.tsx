"use client";

import { useUIStore } from "@/store/uiStore";

const base =
  "inline-flex h-8 shrink-0 items-center rounded-lg border border-white/10 bg-[#0d141d] p-0.5 text-xs font-semibold";
const tabBase =
  "h-7 rounded-md px-3 transition";

export function WorkspaceModeSwitch() {
  const locale = useUIStore((state) => state.locale);
  const workspaceMode = useUIStore((state) => state.workspaceMode);
  const setWorkspaceMode = useUIStore((state) => state.setWorkspaceMode);
  const kitchenLabel = locale === "en" ? "Kitchen" : "İşin Mutfağı";

  return (
    <div
      className={base}
      role="tablist"
      aria-label={locale === "en" ? "Workspace mode" : "Çalışma modu"}
    >
      <button
        type="button"
        role="tab"
        aria-selected={workspaceMode === "kitchen"}
        onClick={() => setWorkspaceMode("kitchen")}
        className={`${tabBase} ${
          workspaceMode === "kitchen"
            ? "bg-[#102234] text-white"
            : "text-slate-300 hover:text-white"
        }`}
      >
        {kitchenLabel}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={workspaceMode === "ai"}
        onClick={() => setWorkspaceMode("ai")}
        className={`${tabBase} ${
          workspaceMode === "ai"
            ? "bg-[#102234] text-white"
            : "text-slate-300 hover:text-white"
        }`}
      >
        desAIn
      </button>
    </div>
  );
}
