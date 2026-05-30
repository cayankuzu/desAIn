"use client";

import { useEffect } from "react";
import { t } from "@/lib/i18n/translations";
import { useUIStore } from "@/store/uiStore";
import { EditorHotkeys } from "@/components/layout/EditorHotkeys";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ViewportHud } from "@/components/layout/ViewportHud";
import { RoomScene } from "@/components/room/RoomScene";

export function AppShell() {
  const locale = useUIStore((state) => state.locale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t(locale, "appTitle");
  }, [locale]);

  return (
    <main className="h-dvh overflow-hidden px-3 py-3 md:px-4 md:py-4">
      <EditorHotkeys />
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1820px] flex-col gap-4">
        <Topbar />

        <section className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="editor-panel relative h-full min-h-0 overflow-hidden p-0">
            <div className="viewport-grid absolute inset-0 opacity-55" />
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
