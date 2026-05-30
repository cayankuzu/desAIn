"use client";

import {
  BoxSelect,
  Camera,
  Move3d,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Undo2,
} from "lucide-react";
import { useRoomStore } from "@/store/roomStore";

const modeButtonBase =
  "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition";

export function Topbar() {
  const roomData = useRoomStore((state) => state.roomData);
  const selectedObjectId = useRoomStore((state) => state.selectedObjectId);
  const cameraMode = useRoomStore((state) => state.cameraMode);
  const setCameraMode = useRoomStore((state) => state.setCameraMode);
  const transformMode = useRoomStore((state) => state.transformMode);
  const setTransformMode = useRoomStore((state) => state.setTransformMode);
  const undo = useRoomStore((state) => state.undo);
  const redo = useRoomStore((state) => state.redo);
  const resetRoom = useRoomStore((state) => state.resetRoom);
  const historyPastLength = useRoomStore((state) => state.historyPast.length);
  const historyFutureLength = useRoomStore((state) => state.historyFuture.length);
  const validationWarnings = useRoomStore((state) => state.validationWarnings);

  const selectedObject =
    roomData.objects.find((object) => object.id === selectedObjectId) ?? null;

  return (
    <header className="editor-panel px-4 py-3">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-white/10 bg-[#0d141d] px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8cb9ff]">
              desAIn Editor
            </div>
            <div className="mt-1 text-lg font-semibold text-white">
              {roomData.room.label}
            </div>
          </div>
          <div className="hidden rounded-xl border border-white/10 bg-[#0d141d] px-3 py-2 text-sm text-slate-300 lg:block">
            {selectedObject
              ? `${selectedObject.label} selected`
              : "No object selected"}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            Q Select
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
            W Move
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
            E Rotate
          </button>
          <button
            type="button"
            onClick={() => setCameraMode(cameraMode === "orbit" ? "top" : "orbit")}
            aria-pressed={cameraMode === "top"}
            className={`${modeButtonBase} ${
              cameraMode === "top"
                ? "border-[#4ea8ff] bg-[#102234] text-[#8cb9ff]"
                : "border-white/10 bg-[#0d141d] text-slate-300 hover:border-[#32516c] hover:text-white"
            }`}
          >
            <Camera className="h-4 w-4" />
            R View
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
            Undo
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={historyFutureLength === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#0d141d] px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-[#32516c] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            <RotateCw className="h-4 w-4" />
            Redo
          </button>
          <button
            type="button"
            onClick={resetRoom}
            className="inline-flex items-center gap-2 rounded-xl border border-[#4f2b16] bg-[#2b170d] px-3 py-2 text-sm font-medium text-[#ffb16a] transition hover:border-[#ff8c42] hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Scene
          </button>
          <div className="rounded-xl border border-white/10 bg-[#0d141d] px-3 py-2 text-sm text-slate-300">
            {validationWarnings.length
              ? `${validationWarnings.length} validation warnings`
              : "Scene validated"}
          </div>
        </div>
      </div>
    </header>
  );
}
