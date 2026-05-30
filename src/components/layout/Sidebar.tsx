"use client";

import { Code2, MessageSquareMore, Move3d } from "lucide-react";
import { AIChatPanel } from "@/components/chat/AIChatPanel";
import { useRoomStore } from "@/store/roomStore";
import { useUIStore } from "@/store/uiStore";

const tabItems = [
  { id: "inspector", label: "Inspector", icon: Move3d },
  { id: "chat", label: "AI Chat", icon: MessageSquareMore },
  { id: "json", label: "JSON", icon: Code2 },
] as const;

export function Sidebar() {
  const activeSidebarTab = useUIStore((state) => state.activeSidebarTab);
  const setActiveSidebarTab = useUIStore((state) => state.setActiveSidebarTab);
  const roomData = useRoomStore((state) => state.roomData);
  const selectedObjectId = useRoomStore((state) => state.selectedObjectId);
  const rotateObjectBy = useRoomStore((state) => state.rotateObjectBy);
  const toggleObjectLock = useRoomStore((state) => state.toggleObjectLock);
  const setSelectedObjectId = useRoomStore((state) => state.setSelectedObjectId);
  const validationWarnings = useRoomStore((state) => state.validationWarnings);
  const cameraMode = useRoomStore((state) => state.cameraMode);

  const selectedObject =
    roomData.objects.find((object) => object.id === selectedObjectId) ?? null;

  return (
    <aside className="panel flex min-h-[720px] flex-col rounded-[30px]">
      <div className="border-b border-border/70 px-4 py-4">
        <div className="mb-3 flex gap-2">
          {tabItems.map((tab) => {
            const Icon = tab.icon;
            const active = activeSidebarTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSidebarTab(tab.id)}
                aria-pressed={active}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-accent text-white"
                    : "bg-white/60 text-foreground/70 hover:bg-accent-soft/30"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {validationWarnings.length > 0 ? (
          <div className="rounded-3xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm leading-6 text-warning">
            {validationWarnings.length} validator uyarisi var. Inspector veya JSON sekmesinden detaya bakabilirsin.
          </div>
        ) : (
          <div className="rounded-3xl border border-success/20 bg-success/10 px-4 py-3 text-sm leading-6 text-success">
            Validator su an kritik bir cakisma gormuyor. Kapi, pencere ve kilitli obje kurallari aktif.
          </div>
        )}
      </div>

      <div className="scroll-area min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {activeSidebarTab === "chat" ? <AIChatPanel /> : null}

        {activeSidebarTab === "json" ? (
          <div className="space-y-4">
            <div className="rounded-[28px] border border-border/80 bg-surface-strong px-4 py-3">
              <h2 className="text-base font-semibold">Guncel Oda JSON&apos;u</h2>
              <p className="mt-1 text-sm leading-6 text-foreground/70">
                Sahnedeki her hareket ayni veri modeline yaziliyor. Bu yapi ileride AI analiz, kayit ve export akisi icin merkez olacak.
              </p>
            </div>
            <pre className="overflow-x-auto rounded-[28px] border border-border/80 bg-[#fffdf9] p-4 text-xs leading-6 text-foreground/80">
              {JSON.stringify(roomData, null, 2)}
            </pre>
            {validationWarnings.length ? (
              <div className="rounded-[28px] border border-warning/20 bg-warning/10 p-4 text-sm leading-6 text-warning">
                {validationWarnings.map((warning) => warning.message).join(" ")}
              </div>
            ) : null}
          </div>
        ) : null}

        {activeSidebarTab === "inspector" ? (
          <div className="space-y-4">
            <section className="rounded-[28px] border border-border/80 bg-surface-strong p-4">
              <h2 className="text-base font-semibold">Oda Ozeti</h2>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-white/60 p-3">
                  <dt className="text-foreground/60">Boyut</dt>
                  <dd className="mt-1 font-medium">
                    {roomData.room.width}m x {roomData.room.depth}m
                  </dd>
                </div>
                <div className="rounded-2xl bg-white/60 p-3">
                  <dt className="text-foreground/60">Kamera</dt>
                  <dd className="mt-1 font-medium">
                    {cameraMode === "orbit" ? "Serbest" : "Kusbakisi"}
                  </dd>
                </div>
                <div className="rounded-2xl bg-white/60 p-3">
                  <dt className="text-foreground/60">Aciklik</dt>
                  <dd className="mt-1 font-medium">
                    {roomData.room.openings.length} constraint
                  </dd>
                </div>
                <div className="rounded-2xl bg-white/60 p-3">
                  <dt className="text-foreground/60">Obje Sayisi</dt>
                  <dd className="mt-1 font-medium">{roomData.objects.length}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-[28px] border border-border/80 bg-surface-strong p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Secili Obje</h2>
                  <p className="text-sm text-foreground/60">
                    Tasima ve dondurme kontrolu secili obje uzerinden calisir.
                  </p>
                </div>
              </div>

              {selectedObject ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-3xl bg-white/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">{selectedObject.label}</h3>
                        <p className="text-sm capitalize text-foreground/60">
                          {selectedObject.category.replace("_", " ")}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          selectedObject.locked
                            ? "bg-foreground text-white"
                            : "bg-accent-soft text-accent-strong"
                        }`}
                      >
                        {selectedObject.locked ? "Locked" : "Movable"}
                      </span>
                    </div>

                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-foreground/60">Pozisyon</dt>
                        <dd className="mt-1 font-medium">
                          x {selectedObject.position.x.toFixed(2)} / z{" "}
                          {selectedObject.position.z.toFixed(2)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-foreground/60">Donus</dt>
                        <dd className="mt-1 font-medium">
                          {selectedObject.rotation.toFixed(0)} derece
                        </dd>
                      </div>
                      <div>
                        <dt className="text-foreground/60">Olcu</dt>
                        <dd className="mt-1 font-medium">
                          {selectedObject.dimensions.width} x {selectedObject.dimensions.depth}m
                        </dd>
                      </div>
                      <div>
                        <dt className="text-foreground/60">Generator</dt>
                        <dd className="mt-1 font-medium">{selectedObject.generator}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => rotateObjectBy(selectedObject.id, -15)}
                      className="rounded-full border border-border/80 bg-white/70 px-4 py-2 text-sm font-medium hover:border-accent/40 hover:bg-accent-soft/25"
                    >
                      -15 derece
                    </button>
                    <button
                      type="button"
                      onClick={() => rotateObjectBy(selectedObject.id, 15)}
                      className="rounded-full border border-border/80 bg-white/70 px-4 py-2 text-sm font-medium hover:border-accent/40 hover:bg-accent-soft/25"
                    >
                      +15 derece
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleObjectLock(selectedObject.id)}
                      className="rounded-full border border-border/80 bg-white/70 px-4 py-2 text-sm font-medium hover:border-accent/40 hover:bg-accent-soft/25"
                    >
                      {selectedObject.locked ? "Kilidi Ac" : "Kilitle"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-3xl border border-dashed border-border/80 px-4 py-6 text-sm leading-6 text-foreground/60">
                  Sahnedeki bir objeye tiklayarak sec. Secilen obje icin sag panelde kilit ve rotasyon kontrolleri acilir.
                </div>
              )}
            </section>

            <section className="rounded-[28px] border border-border/80 bg-surface-strong p-4">
              <h2 className="text-base font-semibold">Mobilya Listesi</h2>
              <div className="mt-4 space-y-2">
                {roomData.objects.map((object) => (
                  <button
                    key={object.id}
                    type="button"
                    onClick={() => setSelectedObjectId(object.id)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition ${
                      selectedObjectId === object.id
                        ? "border-accent bg-accent-soft/25"
                        : "border-border/80 bg-white/60 hover:border-accent/40 hover:bg-accent-soft/20"
                    }`}
                  >
                    <div>
                      <p className="font-medium">{object.label}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-foreground/50">
                        {object.generator}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        object.locked
                          ? "bg-foreground text-white"
                          : "bg-accent-soft text-accent-strong"
                      }`}
                    >
                      {object.locked ? "Locked" : "Open"}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {validationWarnings.length ? (
              <section className="rounded-[28px] border border-warning/20 bg-warning/10 p-4 text-sm leading-6 text-warning">
                <h2 className="font-semibold">Validator Uyarilari</h2>
                <ul className="mt-3 space-y-2">
                  {validationWarnings.map((warning, index) => (
                    <li key={`${warning.code}-${index}`}>{warning.message}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
