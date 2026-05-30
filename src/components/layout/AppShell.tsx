"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { RoomScene } from "@/components/room/RoomScene";
import { useRoomStore } from "@/store/roomStore";

export function AppShell() {
  const validationWarnings = useRoomStore((state) => state.validationWarnings);

  return (
    <main className="min-h-screen px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4">
        <Topbar />

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="panel relative min-h-[720px] overflow-hidden rounded-[32px]">
            <div className="grid-paper absolute inset-0 opacity-40" />
            <div className="absolute left-5 top-5 z-10 max-w-sm rounded-[28px] border border-border/80 bg-white/75 px-4 py-3 backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent-strong">
                Phase 1 MVP
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                Low-poly 3D oda editoru
              </h2>
              <p className="mt-2 text-sm leading-6 text-foreground/70">
                Sec, tasi, dondur, kilitle. Sag panelde mock AI ile yeni layout iste ve JSON state&apos;in nasil degistigini canli izle.
              </p>
            </div>

            {validationWarnings.length ? (
              <div
                aria-live="polite"
                className="absolute bottom-5 left-5 z-10 max-w-md rounded-[28px] border border-warning/20 bg-warning/10 px-4 py-3 text-sm leading-6 text-warning backdrop-blur"
              >
                {validationWarnings[0]?.message}
              </div>
            ) : (
              <div
                aria-live="polite"
                className="absolute bottom-5 left-5 z-10 rounded-[28px] border border-success/20 bg-success/10 px-4 py-3 text-sm leading-6 text-success backdrop-blur"
              >
                Sahne validator&apos;dan gecti. Kapi ve pencere constraint&apos;leri aktif.
              </div>
            )}

            <div className="h-[720px]">
              <RoomScene />
            </div>
          </div>

          <Sidebar />
        </section>
      </div>
    </main>
  );
}
