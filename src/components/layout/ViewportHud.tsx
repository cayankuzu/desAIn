"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { formatWarning, t } from "@/lib/i18n/translations";
import { useRoomStore } from "@/store/roomStore";
import { useUIStore } from "@/store/uiStore";

const getWarningSignature = (
  warning: ReturnType<typeof useRoomStore.getState>["validationWarnings"][number],
) =>
  [
    warning.code,
    warning.level,
    warning.objectId ?? "none",
    warning.relatedObjectId ?? "none",
  ].join(":");

export function ViewportHud() {
  const locale = useUIStore((state) => state.locale);
  const setActiveSidebarTab = useUIStore((state) => state.setActiveSidebarTab);
  const setSelectedStructure = useUIStore((state) => state.setSelectedStructure);
  const roomData = useRoomStore((state) => state.roomData);
  const validationWarnings = useRoomStore((state) => state.validationWarnings);
  const setSelectedObjectId = useRoomStore((state) => state.setSelectedObjectId);
  const activeWarningSource = useMemo(
    () => validationWarnings.map(getWarningSignature).join("|"),
    [validationWarnings],
  );
  const [dismissedState, setDismissedState] = useState<{
    source: string;
    keys: string[];
  }>({
    source: "",
    keys: [],
  });

  const visibleWarnings =
    dismissedState.source === activeWarningSource
      ? validationWarnings.filter(
          (warning) => !dismissedState.keys.includes(getWarningSignature(warning)),
        )
      : validationWarnings;

  if (!visibleWarnings.length) {
    return null;
  }

  return (
    <div className="absolute bottom-4 left-4 z-20 flex max-w-md flex-col gap-3">
      {visibleWarnings.map((warning) => {
        const signature = getWarningSignature(warning);

        return (
          <div
            key={signature}
            onClick={() => {
              if (!warning.objectId) {
                return;
              }

              setSelectedStructure(null);
              setSelectedObjectId(warning.objectId);
              setActiveSidebarTab("details");
            }}
            className="group pointer-events-auto rounded-2xl border border-[#7b4f2c] bg-[#21150e]/92 px-4 py-3 text-sm text-[#f5c28b] shadow-[0_18px_45px_rgba(0,0,0,0.35)] backdrop-blur"
          >
            <div className="mb-1 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ffb16a]">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t(locale, "warnings")}
              </div>
              <button
                type="button"
                aria-label={t(locale, "dismissWarning")}
                onClick={(event) => {
                  event.stopPropagation();
                  setDismissedState((current) => ({
                    source: activeWarningSource,
                    keys:
                      current.source === activeWarningSource
                        ? [...current.keys, signature]
                        : [signature],
                  }));
                }}
                onPointerDown={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
                className="rounded-full border border-transparent p-1 text-[#f5c28b] opacity-0 transition hover:border-white/10 hover:bg-white/10 hover:text-white group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="leading-6">{formatWarning(locale, warning, roomData)}</p>
          </div>
        );
      })}
    </div>
  );
}
