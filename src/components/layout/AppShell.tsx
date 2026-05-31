"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Eye } from "lucide-react";
import {
  formatEditorStatus,
  getLocalizedObjectLabel,
  t,
} from "@/lib/i18n/translations";
import {
  getInventoryTemplateById,
  INVENTORY_DRAG_MIME,
} from "@/lib/room/inventoryCatalog";
import { useRoomStore } from "@/store/roomStore";
import { useUIStore } from "@/store/uiStore";
import { EditorHotkeys } from "@/components/layout/EditorHotkeys";
import { InventoryPreview } from "@/components/layout/InventoryPreview";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ViewportHud } from "@/components/layout/ViewportHud";
import { RoomScene } from "@/components/room/RoomScene";

export function AppShell() {
  const locale = useUIStore((state) => state.locale);
  const setActiveSidebarTab = useUIStore((state) => state.setActiveSidebarTab);
  const setSelectedStructure = useUIStore((state) => state.setSelectedStructure);
  const roomData = useRoomStore((state) => state.roomData);
  const addObjectFromTemplate = useRoomStore((state) => state.addObjectFromTemplate);
  const lastEditorStatus = useRoomStore((state) => state.lastEditorStatus);
  const [panelsHidden, setPanelsHidden] = useState(false);
  const [toast, setToast] = useState<{
    id: number;
    message: string;
  } | null>(null);
  const roomDataRef = useRef(roomData);
  const toastTimeoutRef = useRef<number | null>(null);
  const [isDropActive, setIsDropActive] = useState(false);
  const [dragPreview, setDragPreview] = useState<{
    templateId: string | null;
    x: number;
    y: number;
  }>({
    templateId: null,
    x: 0,
    y: 0,
  });

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t(locale, "appTitle");
  }, [locale]);

  useEffect(() => {
    roomDataRef.current = roomData;
  }, [roomData]);

  const showToast = useCallback((message: string) => {
    const id = Date.now();

    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }

    setToast({ id, message });
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
      toastTimeoutRef.current = null;
    }, 2800);
  }, []);

  useEffect(() => {
    const message = formatEditorStatus(locale, lastEditorStatus, roomDataRef.current);

    if (!message) {
      return;
    }

    showToast(message);
  }, [lastEditorStatus, locale, showToast]);

  const captureScreenshot = () => {
    const canvas = document.querySelector<HTMLCanvasElement>(".room-canvas canvas");

    if (!canvas) {
      return;
    }

    const link = document.createElement("a");
    link.download = `desain-room-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast(t(locale, "captureScreenshot"));
  };

  const togglePanels = () => {
    setPanelsHidden((current) => {
      const next = !current;
      showToast(t(locale, next ? "hidePanels" : "showPanels"));
      return next;
    });
  };

  return (
    <main className="h-dvh overflow-hidden px-3 py-3 md:px-4 md:py-4">
      <EditorHotkeys />
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1820px] flex-col gap-4">
        {panelsHidden ? (
          <div className="fixed right-4 top-4 z-50 flex items-center gap-2">
            <button
              type="button"
              onClick={captureScreenshot}
              title={t(locale, "captureScreenshot")}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#0d141d]/92 text-slate-200 shadow-[0_18px_45px_rgba(0,0,0,0.35)] backdrop-blur transition hover:border-[#4ea8ff] hover:text-white"
            >
              <Camera className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={togglePanels}
              title={t(locale, "showPanels")}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#0d141d]/92 text-slate-200 shadow-[0_18px_45px_rgba(0,0,0,0.35)] backdrop-blur transition hover:border-[#4ea8ff] hover:text-white"
            >
              <Eye className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <Topbar
            panelsHidden={panelsHidden}
            onTogglePanels={togglePanels}
            onCaptureScreenshot={captureScreenshot}
          />
        )}

        <section
          className={`grid min-h-0 flex-1 gap-4 ${
            panelsHidden ? "grid-cols-1" : "xl:grid-cols-[minmax(0,1fr)_560px]"
          }`}
        >
          <div
            className={`editor-panel room-canvas relative h-full min-h-0 overflow-hidden p-0 transition ${
              isDropActive ? "ring-2 ring-[#4ea8ff]/60 ring-offset-0" : ""
            }`}
            onDragOver={(event) => {
              if (event.dataTransfer.types.includes(INVENTORY_DRAG_MIME)) {
                const bounds = event.currentTarget.getBoundingClientRect();
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
                setIsDropActive(true);
                setDragPreview({
                  templateId:
                    event.dataTransfer.getData(INVENTORY_DRAG_MIME) ||
                    event.dataTransfer.getData("text/plain") ||
                    null,
                  x: event.clientX - bounds.left,
                  y: event.clientY - bounds.top,
                });
              }
            }}
            onDragLeave={(event) => {
              const bounds = event.currentTarget.getBoundingClientRect();
              const outside =
                event.clientX <= bounds.left ||
                event.clientX >= bounds.right ||
                event.clientY <= bounds.top ||
                event.clientY >= bounds.bottom;

              if (outside) {
                setIsDropActive(false);
                setDragPreview({ templateId: null, x: 0, y: 0 });
              }
            }}
            onDrop={(event) => {
              const templateId =
                event.dataTransfer.getData(INVENTORY_DRAG_MIME) ||
                event.dataTransfer.getData("text/plain");

              if (!templateId) {
                return;
              }

              event.preventDefault();
              setIsDropActive(false);
              setDragPreview({ templateId: null, x: 0, y: 0 });

              const bounds = event.currentTarget.getBoundingClientRect();
              const ratioX = (event.clientX - bounds.left) / bounds.width;
              const ratioZ = (event.clientY - bounds.top) / bounds.height;

              addObjectFromTemplate(templateId, {
                x: ratioX * roomData.room.width,
                z: ratioZ * roomData.room.depth,
              });
              setSelectedStructure(null);
              setActiveSidebarTab("details");
            }}
          >
            <div className="viewport-grid absolute inset-0 opacity-55" />
            {isDropActive ? (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[#0b1016]/40 backdrop-blur-sm">
                <div className="rounded-2xl border border-[#4ea8ff] bg-[#102234]/90 px-6 py-4 text-center text-sm font-medium text-white shadow-[0_18px_45px_rgba(0,0,0,0.32)]">
                  {t(locale, "dropToViewport")}
                </div>
              </div>
            ) : null}
            {dragPreview.templateId ? (
              (() => {
                const template = getInventoryTemplateById(dragPreview.templateId);

                if (!template) {
                  return null;
                }

                return (
                  <div
                    className="pointer-events-none absolute z-20 w-44 -translate-x-1/2 -translate-y-[115%] rounded-2xl border border-[#4ea8ff]/55 bg-[#102234]/92 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.32)] backdrop-blur"
                    style={{
                      left: dragPreview.x,
                      top: dragPreview.y,
                    }}
                  >
                    <InventoryPreview item={template} />
                    <div className="mt-2 text-sm font-medium text-white">
                      {getLocalizedObjectLabel(locale, template)}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[#8cb9ff]">
                      {`${template.dimensions.width.toFixed(1)} x ${template.dimensions.depth.toFixed(1)}m`}
                    </div>
                  </div>
                );
              })()
            ) : null}
            <ViewportHud />
            <div className="h-full">
              <RoomScene />
            </div>
          </div>

          {panelsHidden ? null : <Sidebar />}
        </section>
      </div>
      {toast ? (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-2xl border border-[#24405a] bg-[#102234]/95 px-4 py-3 text-sm font-medium text-[#dbeafe] shadow-[0_18px_45px_rgba(0,0,0,0.35)] backdrop-blur">
          {toast.message}
        </div>
      ) : null}
    </main>
  );
}
