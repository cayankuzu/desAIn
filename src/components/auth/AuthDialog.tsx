"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { getAccountCopy } from "@/lib/i18n/accountTranslations";
import { useLocaleSync } from "@/lib/i18n/useLocaleSync";
import type { ProjectDraftPayload, ProjectSummary, Viewer } from "@/types/project";
import { AuthForms } from "@/components/auth/AuthForms";

interface AuthDialogProps {
  open: boolean;
  initialProjectDraft?: ProjectDraftPayload;
  onClose: () => void;
  onSuccess: (payload: {
    user: Viewer | null;
    project: ProjectSummary | null;
  }) => void;
}

export function AuthDialog({
  open,
  initialProjectDraft,
  onClose,
  onSuccess,
}: AuthDialogProps) {
  const { locale } = useLocaleSync();
  const copy = getAccountCopy(locale);
  const [activeTab, setActiveTab] = useState<"register" | "login">("register");

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#03070bcc] px-4 py-6 backdrop-blur-md">
      <div className="relative w-full max-w-3xl">
        <button
          type="button"
          onClick={onClose}
          aria-label={locale === "en" ? "Close" : "Kapat"}
          className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#0d141d]/92 text-slate-300 transition hover:border-[#32516c] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 inline-flex rounded-full border border-white/10 bg-[#0d141d]/92 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("register")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === "register"
                ? "bg-[#102234] text-white"
                : "text-slate-300 hover:text-white"
            }`}
          >
            {copy.authTabs.register}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("login")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === "login"
                ? "bg-[#102234] text-white"
                : "text-slate-300 hover:text-white"
            }`}
          >
            {copy.authTabs.login}
          </button>
        </div>

        <AuthForms
          compact
          mode={activeTab}
          initialProjectDraft={initialProjectDraft}
          onSuccess={(payload) => {
            onSuccess({
              user: payload.user ?? null,
              project: payload.project ?? null,
            });
          }}
        />
      </div>
    </div>
  );
}
