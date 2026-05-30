"use client";

import { AlertTriangle, BoxSelect, Camera, Move3d, RotateCw, Ruler } from "lucide-react";
import {
  formatEditorStatus,
  formatWarning,
  getLocalizedObjectLabel,
  getLocalizedRoomLabel,
  t,
} from "@/lib/i18n/translations";
import { useRoomStore } from "@/store/roomStore";
import { useUIStore } from "@/store/uiStore";

export function ViewportHud() {
  const locale = useUIStore((state) => state.locale);
  const roomData = useRoomStore((state) => state.roomData);
  const selectedObjectId = useRoomStore((state) => state.selectedObjectId);
  const cameraMode = useRoomStore((state) => state.cameraMode);
  const transformMode = useRoomStore((state) => state.transformMode);
  const validationWarnings = useRoomStore((state) => state.validationWarnings);
  const lastEditorStatus = useRoomStore((state) => state.lastEditorStatus);

  const selectedObject =
    roomData.objects.find((object) => object.id === selectedObjectId) ?? null;
  const roomLabel = getLocalizedRoomLabel(locale, roomData.room);
  const statusText = formatEditorStatus(locale, lastEditorStatus, roomData);
  const warningText = validationWarnings.length
    ? formatWarning(locale, validationWarnings[0], roomData)
    : transformMode === "select"
      ? t(locale, "selectionModeActive")
      : transformMode === "translate"
        ? t(locale, "moveGizmoActive")
        : t(locale, "rotateGizmoActive");

  return (
    <>
      <div className="pointer-events-none absolute left-4 top-4 z-10 flex max-w-sm flex-col gap-2">
        <div className="rounded-2xl border border-white/10 bg-[#0f1722]/84 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8cb9ff]">
            <Camera className="h-3.5 w-3.5" />
            {t(locale, "viewport")}
          </div>
          <h2 className="mt-2 text-lg font-semibold text-white">{roomLabel}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            {cameraMode === "orbit"
              ? t(locale, "perspectiveView")
              : t(locale, "topView")}
          </p>
        </div>

        {selectedObject ? (
          <div className="rounded-2xl border border-white/10 bg-[#0f1722]/84 px-4 py-3 backdrop-blur">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ffb370]">
              <BoxSelect className="h-3.5 w-3.5" />
              {t(locale, "selection")}
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-200">
              <div className="font-semibold text-white">
                {getLocalizedObjectLabel(locale, selectedObject)}
              </div>
              <div>
                {`${t(locale, "widthShort")} ${selectedObject.dimensions.width.toFixed(2)}m  ${t(locale, "depthShort")} ${selectedObject.dimensions.depth.toFixed(2)}m  ${t(locale, "heightShort")} ${selectedObject.dimensions.height.toFixed(2)}m`}
              </div>
              <div>
                {`X ${selectedObject.position.x.toFixed(2)}  Z ${selectedObject.position.z.toFixed(2)}  ${t(locale, "rotation")} ${selectedObject.rotation.toFixed(0)}deg`}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="pointer-events-none absolute right-4 top-4 z-10 flex flex-col items-end gap-2">
        <div className="rounded-2xl border border-white/10 bg-[#0f1722]/84 px-4 py-3 text-right backdrop-blur">
          <div className="flex items-center justify-end gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8cb9ff]">
            <Ruler className="h-3.5 w-3.5" />
            {t(locale, "roomMetrics")}
          </div>
          <div className="mt-2 text-sm leading-6 text-slate-200">
            <div>{`${t(locale, "width")} ${roomData.room.width.toFixed(2)}m`}</div>
            <div>{`${t(locale, "depth")} ${roomData.room.depth.toFixed(2)}m`}</div>
            <div>{`${t(locale, "height")} ${roomData.room.height.toFixed(2)}m`}</div>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0f1722]/84 px-4 py-3 text-right text-xs tracking-[0.2em] text-slate-300 backdrop-blur">
          {statusText}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex flex-wrap gap-2">
        <span className="hud-chip">
          <BoxSelect className="h-3.5 w-3.5" />Q {t(locale, "selectMode")}
        </span>
        <span className="hud-chip">
          <Move3d className="h-3.5 w-3.5" />W {t(locale, "moveMode")}
        </span>
        <span className="hud-chip">
          <RotateCw className="h-3.5 w-3.5" />E {t(locale, "rotateMode")}
        </span>
        <span className="hud-chip">
          <Camera className="h-3.5 w-3.5" />R {t(locale, "viewMode")}
        </span>
      </div>

      <div className="pointer-events-none absolute bottom-4 right-4 z-10">
        <div
          className={`max-w-sm rounded-2xl border px-4 py-3 text-sm backdrop-blur ${
            validationWarnings.length
              ? "border-[#8b5a2b] bg-[#2a1d14]/84 text-[#f8c48f]"
              : "border-[#1f4b65] bg-[#0f1722]/84 text-[#8cb9ff]"
          }`}
        >
          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em]">
            <AlertTriangle className="h-3.5 w-3.5" />
            {validationWarnings.length
              ? t(locale, "warnings")
              : t(locale, "viewportStatus")}
          </div>
          <p>{warningText}</p>
        </div>
      </div>
    </>
  );
}
