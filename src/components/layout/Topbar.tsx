"use client";

import { RotateCcw, RotateCw, Sparkles, Target, Undo2 } from "lucide-react";
import { useRoomStore } from "@/store/roomStore";

const buttonBase =
  "rounded-full border px-3 py-2 text-sm font-medium transition";

export function Topbar() {
  const cameraMode = useRoomStore((state) => state.cameraMode);
  const setCameraMode = useRoomStore((state) => state.setCameraMode);
  const transformMode = useRoomStore((state) => state.transformMode);
  const setTransformMode = useRoomStore((state) => state.setTransformMode);
  const undo = useRoomStore((state) => state.undo);
  const redo = useRoomStore((state) => state.redo);
  const resetRoom = useRoomStore((state) => state.resetRoom);
  const historyPastLength = useRoomStore((state) => state.historyPast.length);
  const historyFutureLength = useRoomStore((state) => state.historyFuture.length);
  const lastLayoutSummary = useRoomStore((state) => state.lastLayoutSummary);

  return (
    <header className="panel rounded-[30px] px-5 py-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent-soft/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent-strong">
            <Sparkles className="h-3.5 w-3.5" />
            desAIn MVP
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Odani 3D&apos;ye cevir, AI ile yeniden tasarla.
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-foreground/70">
              Bu ilk prototip, JSON tabanli low-poly oda editoru ve mock AI layout chat akisini ayni ekranda test eder.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            aria-live="polite"
            className="rounded-full border border-border/80 bg-white/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60"
          >
            {lastLayoutSummary}
          </span>
          <button
            type="button"
            onClick={() => setCameraMode(cameraMode === "orbit" ? "top" : "orbit")}
            aria-pressed={cameraMode === "top"}
            className={`${buttonBase} border-border/80 bg-surface-strong hover:border-accent/40 hover:bg-accent-soft/30`}
          >
            {cameraMode === "orbit" ? "Kusbakisi Moda Gec" : "Serbest Kameraya Don"}
          </button>
          <button
            type="button"
            onClick={() =>
              setTransformMode(transformMode === "translate" ? "rotate" : "translate")
            }
            aria-pressed={transformMode === "rotate"}
            className={`${buttonBase} border-border/80 bg-surface-strong hover:border-accent/40 hover:bg-accent-soft/30`}
          >
            {transformMode === "translate" ? "Dondurme Modu" : "Tasima Modu"}
          </button>
          <button
            type="button"
            onClick={undo}
            disabled={historyPastLength === 0}
            className={`${buttonBase} inline-flex items-center gap-2 border-border/80 bg-surface-strong hover:border-accent/40 hover:bg-accent-soft/30 disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <Undo2 className="h-4 w-4" />
            Geri Al
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={historyFutureLength === 0}
            className={`${buttonBase} inline-flex items-center gap-2 border-border/80 bg-surface-strong hover:border-accent/40 hover:bg-accent-soft/30 disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <RotateCw className="h-4 w-4" />
            Ileri Al
          </button>
          <button
            type="button"
            onClick={resetRoom}
            className={`${buttonBase} inline-flex items-center gap-2 border-accent/25 bg-accent text-white hover:bg-accent-strong`}
          >
            <RotateCcw className="h-4 w-4" />
            Demo Odayi Sifirla
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-foreground/60">
        <span className="rounded-full border border-border/70 bg-white/60 px-3 py-1.5">
          <Target className="mr-1 inline h-3.5 w-3.5" />
          Surukle: gizmo ile
        </span>
        <span className="rounded-full border border-border/70 bg-white/60 px-3 py-1.5">
          Snap: 0.1m / 15 derece
        </span>
        <span className="rounded-full border border-border/70 bg-white/60 px-3 py-1.5">
          Kilitli obje AI ve gizmo ile oynamaz
        </span>
      </div>
    </header>
  );
}
