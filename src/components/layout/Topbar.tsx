"use client";

import {
  AlertTriangle,
  BoxSelect,
  Languages,
  Move3d,
  Save,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Shuffle,
  Undo2,
} from "lucide-react";
import {
  getLocalizedObjectLabel,
  getLocalizedOpeningType,
  getLocalizedRoomLabel,
  t,
} from "@/lib/i18n/translations";
import { useRoomStore } from "@/store/roomStore";
import { useUIStore } from "@/store/uiStore";

const modeButtonBase =
  "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition";

export function Topbar() {
  const locale = useUIStore((state) => state.locale);
  const setLocale = useUIStore((state) => state.setLocale);
  const setActiveSidebarTab = useUIStore((state) => state.setActiveSidebarTab);
  const selectedStructure = useUIStore((state) => state.selectedStructure);
  const roomData = useRoomStore((state) => state.roomData);
  const selectedObjectId = useRoomStore((state) => state.selectedObjectId);
  const transformMode = useRoomStore((state) => state.transformMode);
  const setTransformMode = useRoomStore((state) => state.setTransformMode);
  const undo = useRoomStore((state) => state.undo);
  const redo = useRoomStore((state) => state.redo);
  const resetRoom = useRoomStore((state) => state.resetRoom);
  const saveRoomSnapshot = useRoomStore((state) => state.saveRoomSnapshot);
  const randomizeLayout = useRoomStore((state) => state.randomizeLayout);
  const historyPastLength = useRoomStore((state) => state.historyPast.length);
  const historyFutureLength = useRoomStore((state) => state.historyFuture.length);
  const validationWarnings = useRoomStore((state) => state.validationWarnings);

  const selectedObject =
    roomData.objects.find((object) => object.id === selectedObjectId) ?? null;
  const roomLabel = getLocalizedRoomLabel(locale, roomData.room);
  const selectedOpening = selectedStructure?.type === "opening"
    ? roomData.room.openings.find((opening) => opening.id === selectedStructure.id) ?? null
    : null;
  const selectedLabel = selectedObject
    ? getLocalizedObjectLabel(locale, selectedObject)
    : selectedOpening
      ? `${getLocalizedOpeningType(locale, selectedOpening.type)} / ${selectedOpening.id}`
      : selectedStructure?.type === "wall"
        ? selectedStructure.id
        : t(locale, "noObjectSelected");

  return (
    <header className="editor-panel px-4 py-3">
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="rounded-xl border border-white/10 bg-[#0d141d] px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8cb9ff]">
              {t(locale, "editorTitle")}
            </div>
            <div className="mt-1 text-lg font-semibold text-white">{roomLabel}</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0d141d] px-3 py-2 text-sm text-slate-300">
            <span className="text-slate-500">{t(locale, "selectedLabel")}:</span>{" "}
            <span className="text-white">{selectedLabel}</span>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0d141d] px-3 py-2 text-sm text-slate-300">
            {`${roomData.room.width.toFixed(2)}m x ${roomData.room.depth.toFixed(2)}m x ${roomData.room.height.toFixed(2)}m`}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-[#0d141d] p-1">
            <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Languages className="h-3.5 w-3.5" />
                {t(locale, "language")}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLocale("tr")}
              aria-pressed={locale === "tr"}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
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
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
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
                : "border-white/10 bg-[#0d141d] text-slate-300 hover:border-[#32516c] hover:text-white"
            }`}
          >
            <BoxSelect className="h-4 w-4" />
            Q {t(locale, "selectMode")}
          </button>
          <button
            type="button"
            onClick={() => setTransformMode("translate")}
            aria-pressed={transformMode === "translate"}
            className={`${modeButtonBase} ${
              transformMode === "translate"
                ? "border-[#ff8c42] bg-[#2a1910] text-[#ffb16a]"
                : "border-white/10 bg-[#0d141d] text-slate-300 hover:border-[#32516c] hover:text-white"
            }`}
          >
            <Move3d className="h-4 w-4" />
            W {t(locale, "moveMode")}
          </button>
          <button
            type="button"
            onClick={() => setTransformMode("rotate")}
            aria-pressed={transformMode === "rotate"}
            className={`${modeButtonBase} ${
              transformMode === "rotate"
                ? "border-[#ff8c42] bg-[#2a1910] text-[#ffb16a]"
                : "border-white/10 bg-[#0d141d] text-slate-300 hover:border-[#32516c] hover:text-white"
            }`}
          >
            <RefreshCw className="h-4 w-4" />
            E {t(locale, "rotateMode")}
          </button>

          <button
            type="button"
            onClick={() => setActiveSidebarTab("validation")}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
              validationWarnings.length
                ? "border-[#6d4a29] bg-[#25180f] text-[#f5c28b] hover:border-[#ffb16a]"
                : "border-[#24405a] bg-[#111924] text-[#8cb9ff] hover:border-[#4ea8ff] hover:text-white"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            {validationWarnings.length
              ? `${validationWarnings.length} ${t(locale, "validationWarnings")}`
              : t(locale, "sceneValidated")}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={historyPastLength === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#0d141d] px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-[#32516c] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Undo2 className="h-4 w-4" />
            {t(locale, "undo")}
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={historyFutureLength === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#0d141d] px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-[#32516c] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            <RotateCw className="h-4 w-4" />
            {t(locale, "redo")}
          </button>
          <button
            type="button"
            onClick={resetRoom}
            className="inline-flex items-center gap-2 rounded-xl border border-[#4f2b16] bg-[#2b170d] px-3 py-2 text-sm font-medium text-[#ffb16a] transition hover:border-[#ff8c42] hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
            {t(locale, "resetScene")}
          </button>
          <button
            type="button"
            onClick={saveRoomSnapshot}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#0d141d] px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-[#32516c] hover:text-white"
          >
            <Save className="h-4 w-4" />
            {t(locale, "saveRoom")}
          </button>
          <button
            type="button"
            onClick={randomizeLayout}
            className="inline-flex items-center gap-2 rounded-xl border border-[#1f4b65] bg-[#102234] px-3 py-2 text-sm font-medium text-[#8cb9ff] transition hover:border-[#4ea8ff] hover:text-white"
          >
            <Shuffle className="h-4 w-4" />
            {t(locale, "randomizeRoom")}
          </button>
        </div>
      </div>
    </header>
  );
}
