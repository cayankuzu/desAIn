"use client";

import { useEffect, useState } from "react";
import { getLocalizedObjectLabel, t } from "@/lib/i18n/translations";
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

  return (
    <main className="h-dvh overflow-hidden px-3 py-3 md:px-4 md:py-4">
      <EditorHotkeys />
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1820px] flex-col gap-4">
        <Topbar />

        <section className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_560px]">
          <div
            className={`editor-panel relative h-full min-h-0 overflow-hidden p-0 transition ${
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

          <Sidebar />
        </section>
      </div>
    </main>
  );
}
