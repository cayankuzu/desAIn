"use client";

import { useEffect, useState } from "react";
import { t } from "@/lib/i18n/translations";
import { INVENTORY_DRAG_MIME } from "@/lib/room/inventoryCatalog";
import { useRoomStore } from "@/store/roomStore";
import { useUIStore } from "@/store/uiStore";
import { EditorHotkeys } from "@/components/layout/EditorHotkeys";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ViewportHud } from "@/components/layout/ViewportHud";
import { RoomScene } from "@/components/room/RoomScene";

export function AppShell() {
  const locale = useUIStore((state) => state.locale);
  const setActiveSidebarTab = useUIStore((state) => state.setActiveSidebarTab);
  const roomData = useRoomStore((state) => state.roomData);
  const addObjectFromTemplate = useRoomStore((state) => state.addObjectFromTemplate);
  const [isDropActive, setIsDropActive] = useState(false);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t(locale, "appTitle");
  }, [locale]);

  return (
    <main className="h-dvh overflow-hidden px-3 py-3 md:px-4 md:py-4">
      <EditorHotkeys />
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1820px] flex-col gap-4">
        <Topbar />

        <section className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div
            className={`editor-panel relative h-full min-h-0 overflow-hidden p-0 transition ${
              isDropActive ? "ring-2 ring-[#4ea8ff]/60 ring-offset-0" : ""
            }`}
            onDragOver={(event) => {
              if (event.dataTransfer.types.includes(INVENTORY_DRAG_MIME)) {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
                setIsDropActive(true);
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
              }
            }}
            onDrop={(event) => {
              const templateId = event.dataTransfer.getData(INVENTORY_DRAG_MIME);

              if (!templateId) {
                return;
              }

              event.preventDefault();
              setIsDropActive(false);

              const bounds = event.currentTarget.getBoundingClientRect();
              const ratioX = (event.clientX - bounds.left) / bounds.width;
              const ratioZ = (event.clientY - bounds.top) / bounds.height;

              addObjectFromTemplate(templateId, {
                x: ratioX * roomData.room.width,
                z: ratioZ * roomData.room.depth,
              });
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
