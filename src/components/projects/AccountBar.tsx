"use client";

import { FolderKanban, LogOut, Sparkles, UserPlus, UserRound, X } from "lucide-react";
import { getAccountCopy } from "@/lib/i18n/accountTranslations";
import { useLocaleSync } from "@/lib/i18n/useLocaleSync";
import type { Viewer } from "@/types/project";

interface AccountBarProps {
  viewer: Viewer | null;
  currentProjectName?: string | null;
  projectSessionActive?: boolean;
  onOpenProjects: () => void;
  onOpenProfile: () => void;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onRequestLogout: () => void;
  onRequestCloseProject?: () => void;
}

export function AccountBar({
  viewer,
  currentProjectName = null,
  projectSessionActive = false,
  onOpenProjects,
  onOpenProfile,
  onOpenLogin,
  onOpenRegister,
  onRequestLogout,
  onRequestCloseProject,
}: AccountBarProps) {
  const { locale } = useLocaleSync();
  const copy = getAccountCopy(locale);
  const activeProjectLabel = currentProjectName || copy.activeProjectEmpty;

  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-[#0a1017]/92 px-4 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#24405a] bg-[#102234] text-[#8cb9ff]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8cb9ff]">
              {copy.accountBarEyebrow}
            </div>
            <div className="mt-1 text-sm text-slate-300">
              {viewer ? copy.accountSignedIn(viewer.username) : copy.accountSignedOut}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <div className="inline-flex min-h-10 items-center rounded-full border border-white/10 bg-white/5 px-4 text-sm font-semibold text-slate-200">
            {copy.activeProjectLabel}: {activeProjectLabel}
          </div>

          {projectSessionActive ? (
            <button
              type="button"
              onClick={onRequestCloseProject}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[#4ea8ff] bg-[#102234] px-4 text-sm font-semibold text-white transition hover:border-[#76beff]"
            >
              <X className="h-4 w-4" />
              {copy.closeProject}
            </button>
          ) : viewer ? (
            <>
              <button
                type="button"
                onClick={onOpenProjects}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[#24405a] bg-[#102234] px-4 text-sm font-semibold text-white transition hover:border-[#4ea8ff]"
              >
                <FolderKanban className="h-4 w-4" />
                {copy.myProjects}
              </button>
              <button
                type="button"
                onClick={onOpenProfile}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-[#0f1720] px-4 text-sm font-semibold text-slate-300 transition hover:border-[#32516c] hover:text-white"
              >
                <UserRound className="h-4 w-4" />
                {copy.profile}
              </button>
              <button
                type="button"
                onClick={onRequestLogout}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-[#0f1720] px-4 text-sm font-semibold text-slate-300 transition hover:border-[#32516c] hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                {copy.logout}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onOpenLogin}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-[#0f1720] px-4 text-sm font-semibold text-slate-300 transition hover:border-[#32516c] hover:text-white"
              >
                {copy.authTabs.login}
              </button>
              <button
                type="button"
                onClick={onOpenRegister}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[#4ea8ff] bg-[#102234] px-4 text-sm font-semibold text-white transition hover:border-[#76beff]"
              >
                <UserPlus className="h-4 w-4" />
                {copy.authTabs.register}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
