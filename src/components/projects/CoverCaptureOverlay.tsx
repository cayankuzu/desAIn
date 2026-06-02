"use client";

import { ArrowLeft, Camera, Languages, RotateCcw } from "lucide-react";
import { getAccountCopy } from "@/lib/i18n/accountTranslations";
import { useLocaleSync } from "@/lib/i18n/useLocaleSync";

interface CoverCaptureOverlayProps {
  open: boolean;
  onCapture: () => void;
  onClose: () => void;
  onResetView: () => void;
}

export function CoverCaptureOverlay({
  open,
  onCapture,
  onClose,
  onResetView,
}: CoverCaptureOverlayProps) {
  const { locale, setLocale } = useLocaleSync();
  const copy = getAccountCopy(locale);

  if (!open) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[190] bg-[#03070b33]">
      <div className="pointer-events-auto absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-[#0a1017]/92 px-4 text-sm font-semibold text-slate-300 shadow-[0_18px_48px_rgba(0,0,0,0.42)] backdrop-blur-xl transition hover:border-[#32516c] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {copy.back}
        </button>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#0a1017]/92 p-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300 shadow-[0_18px_48px_rgba(0,0,0,0.42)] backdrop-blur-xl">
            <span className="hidden items-center gap-1.5 px-2 md:inline-flex">
              <Languages className="h-3 w-3" />
              {copy.language}
            </span>
            <button
              type="button"
              onClick={() => setLocale("tr")}
              aria-pressed={locale === "tr"}
              className={`h-8 rounded-full px-3 transition ${
                locale === "tr"
                  ? "bg-[#102234] text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {copy.turkish}
            </button>
            <button
              type="button"
              onClick={() => setLocale("en")}
              aria-pressed={locale === "en"}
              className={`h-8 rounded-full px-3 transition ${
                locale === "en"
                  ? "bg-[#102234] text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {copy.english}
            </button>
          </div>

          <div className="inline-flex items-center rounded-full border border-white/10 bg-[#0a1017]/92 p-2 shadow-[0_18px_48px_rgba(0,0,0,0.42)] backdrop-blur-xl">
            <button
              type="button"
              onClick={onResetView}
              className="mr-2 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-[#0f1720] text-slate-300 transition hover:border-[#32516c] hover:text-white"
              title={copy.coverCaptureResetView}
              aria-label={copy.coverCaptureResetView}
            >
              <RotateCcw className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onCapture}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#4ea8ff] bg-[#102234] text-white transition hover:border-[#76beff]"
              title={copy.coverCaptureTitle}
              aria-label={copy.coverCaptureTitle}
            >
              <Camera className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-6 flex justify-center px-4">
        <div className="max-w-xl rounded-[1.3rem] border border-white/10 bg-[#0a1017]/88 px-4 py-3 text-center shadow-[0_18px_48px_rgba(0,0,0,0.32)] backdrop-blur-xl">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
            {copy.coverCaptureHint}
          </div>
          <div className="mt-1 text-sm leading-6 text-slate-400">
            {copy.coverCaptureDetail}
          </div>
        </div>
      </div>
    </div>
  );
}
