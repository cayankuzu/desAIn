"use client";

import { useState } from "react";
import {
  AlertTriangle,
  BoxSelect,
  Camera,
  Eye,
  EyeOff,
  Languages,
  Move3d,
  Save,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Undo2,
} from "lucide-react";
import {
  t,
} from "@/lib/i18n/translations";
import { useRoomStore } from "@/store/roomStore";
import { useUIStore } from "@/store/uiStore";
import { WorkspaceModeSwitch } from "@/components/layout/WorkspaceModeSwitch";

const modeButtonBase =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition";
const neutralButtonClass =
  "border-white/10 bg-[#0d141d] text-slate-300 hover:border-[#32516c] hover:text-white";
const iconButtonClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#0d141d] text-slate-300 transition hover:border-[#32516c] hover:text-white";

interface TopbarProps {
  panelsHidden: boolean;
  onTogglePanels: () => void;
  onCaptureScreenshot: () => void;
}

export function Topbar({
  panelsHidden,
  onTogglePanels,
  onCaptureScreenshot,
}: TopbarProps) {
  const locale = useUIStore((state) => state.locale);
  const setLocale = useUIStore((state) => state.setLocale);
  const workspaceMode = useUIStore((state) => state.workspaceMode);
  const setActiveSidebarTab = useUIStore((state) => state.setActiveSidebarTab);
  const transformMode = useRoomStore((state) => state.transformMode);
  const setTransformMode = useRoomStore((state) => state.setTransformMode);
  const undo = useRoomStore((state) => state.undo);
  const redo = useRoomStore((state) => state.redo);
  const resetRoom = useRoomStore((state) => state.resetRoom);
  const saveRoomSnapshot = useRoomStore((state) => state.saveRoomSnapshot);
  const historyPastLength = useRoomStore((state) => state.historyPast.length);
  const historyFutureLength = useRoomStore((state) => state.historyFuture.length);
  const validationWarnings = useRoomStore((state) => state.validationWarnings);
  const [resetMenuOpen, setResetMenuOpen] = useState(false);
  const [hasSavedLayout, setHasSavedLayout] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return Boolean(window.localStorage.getItem("desain-saved-room-data"));
  });

  return (
    <header className="editor-panel relative z-50 overflow-visible px-3 py-2.5">
      <div className="flex flex-col gap-2 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div className="toolbar-scroll -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
          <WorkspaceModeSwitch />
          <div className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-[#0d141d] p-0.5">
            <div className="hidden px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 sm:block">
              <span className="inline-flex items-center gap-1.5">
                <Languages className="h-3 w-3" />
                {t(locale, "language")}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLocale("tr")}
              aria-pressed={locale === "tr"}
              className={`h-7 rounded-md px-2.5 text-xs font-semibold transition ${
                locale === "tr"
                  ? "bg-[#102234] text-white"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              {t(locale, "turkish")}
            </button>
            <button
              type="button"
              onClick={() => setLocale("en")}
              aria-pressed={locale === "en"}
              className={`h-7 rounded-md px-2.5 text-xs font-semibold transition ${
                locale === "en"
                  ? "bg-[#102234] text-white"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              {t(locale, "english")}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setTransformMode("select")}
            aria-pressed={transformMode === "select"}
            className={`${modeButtonBase} ${
              transformMode === "select"
                ? "border-[#ff8c42] bg-[#2a1910] text-[#ffb16a]"
                : neutralButtonClass
            }`}
          >
            <BoxSelect className="h-3.5 w-3.5" />
            Q {t(locale, "selectMode")}
          </button>
          <button
            type="button"
            onClick={() => setTransformMode("translate")}
            aria-pressed={transformMode === "translate"}
            className={`${modeButtonBase} ${
              transformMode === "translate"
                ? "border-[#ff8c42] bg-[#2a1910] text-[#ffb16a]"
                : neutralButtonClass
            }`}
          >
            <Move3d className="h-3.5 w-3.5" />
            W {t(locale, "moveMode")}
          </button>
          <button
            type="button"
            onClick={() => setTransformMode("rotate")}
            aria-pressed={transformMode === "rotate"}
            className={`${modeButtonBase} ${
              transformMode === "rotate"
                ? "border-[#ff8c42] bg-[#2a1910] text-[#ffb16a]"
                : neutralButtonClass
            }`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            E {t(locale, "rotateMode")}
          </button>
          <button
            type="button"
            onClick={() => setActiveSidebarTab("validation")}
            className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition ${
              validationWarnings.length
                ? "border-[#6d4a29] bg-[#25180f] text-[#f5c28b] hover:border-[#ffb16a]"
                : "border-[#24405a] bg-[#111924] text-[#8cb9ff] hover:border-[#4ea8ff] hover:text-white"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {validationWarnings.length
              ? `${validationWarnings.length} ${t(locale, "validationWarnings")}`
              : t(locale, "sceneValidated")}
          </button>
        </div>

        <div className="toolbar-scroll -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
          {workspaceMode === "ai" ? (
            <div className="inline-flex h-8 items-center rounded-lg border border-white/10 bg-[#0d141d] px-3 text-xs font-semibold text-slate-300">
              desAIn
            </div>
          ) : null}
          <button
            type="button"
            onClick={undo}
            disabled={historyPastLength === 0}
            className={`${modeButtonBase} ${neutralButtonClass} disabled:cursor-not-allowed disabled:opacity-45`}
          >
            <Undo2 className="h-3.5 w-3.5" />
            {t(locale, "undo")}
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={historyFutureLength === 0}
            className={`${modeButtonBase} ${neutralButtonClass} disabled:cursor-not-allowed disabled:opacity-45`}
          >
            <RotateCw className="h-3.5 w-3.5" />
            {t(locale, "redo")}
          </button>
          <button
            type="button"
            onClick={() => setResetMenuOpen((current) => !current)}
            className={`${modeButtonBase} border-[#4f2b16] bg-[#2b170d] text-[#ffb16a] hover:border-[#ff8c42] hover:text-white`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t(locale, "resetScene")}
          </button>
          {resetMenuOpen ? (
            <div className="absolute right-3 top-[calc(100%+0.5rem)] z-[90] w-64 rounded-xl border border-white/10 bg-[#0d141d] p-2 text-sm shadow-[0_18px_45px_rgba(0,0,0,0.42)]">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                {t(locale, "resetSceneOptions")}
              </div>
              <button
                type="button"
                onClick={() => {
                  resetRoom("default");
                  setResetMenuOpen(false);
                }}
                className="flex h-8 w-full items-center justify-between rounded-lg border border-white/10 bg-[#111924] px-2.5 text-left text-xs font-semibold text-slate-200 transition hover:border-[#32516c] hover:text-white"
              >
                {t(locale, "resetDefault")}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetRoom("saved");
                  setResetMenuOpen(false);
                }}
                disabled={!hasSavedLayout}
                className="mt-2 flex h-8 w-full items-center justify-between rounded-lg border border-white/10 bg-[#111924] px-2.5 text-left text-xs font-semibold text-slate-200 transition hover:border-[#32516c] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span>{t(locale, "resetSaved")}</span>
                <span className="text-[11px] text-slate-500">
                  {hasSavedLayout ? t(locale, "savedLayout") : t(locale, "noSavedLayout")}
                </span>
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => {
              saveRoomSnapshot();
              setHasSavedLayout(true);
            }}
            className={`${modeButtonBase} ${neutralButtonClass}`}
          >
            <Save className="h-3.5 w-3.5" />
            {t(locale, "saveRoom")}
          </button>
          <button
            type="button"
            onClick={onCaptureScreenshot}
            title={t(locale, "captureScreenshot")}
            aria-label={t(locale, "captureScreenshot")}
            className={iconButtonClass}
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onTogglePanels}
            title={panelsHidden ? t(locale, "showPanels") : t(locale, "hidePanels")}
            aria-label={panelsHidden ? t(locale, "showPanels") : t(locale, "hidePanels")}
            aria-pressed={panelsHidden}
            className={iconButtonClass}
          >
            {panelsHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </header>
  );
}
