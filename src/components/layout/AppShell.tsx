"use client";

import { EditorHotkeys } from "@/components/layout/EditorHotkeys";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ViewportHud } from "@/components/layout/ViewportHud";
import { RoomScene } from "@/components/room/RoomScene";

export function AppShell() {
  return (
    <main className="min-h-screen px-3 py-3 md:px-4 md:py-4">
      <EditorHotkeys />
      <div className="mx-auto flex w-full max-w-[1820px] flex-col gap-4">
        <Topbar />

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="editor-panel relative min-h-[760px] overflow-hidden p-0">
            <div className="viewport-grid absolute inset-0 opacity-55" />
            <ViewportHud />
            <div className="h-[760px]">
              <RoomScene />
            </div>
          </div>

          <Sidebar />
        </section>
      </div>
    </main>
  );
}
