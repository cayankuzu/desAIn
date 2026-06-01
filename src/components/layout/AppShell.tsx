"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Boxes, Lock, Monitor, Shuffle, Trash2, Ungroup } from "lucide-react";
import {
  t,
} from "@/lib/i18n/translations";
import {
  getInventoryTemplateById,
  INVENTORY_DRAG_MIME,
  type InventoryTemplate,
} from "@/lib/room/inventoryCatalog";
import {
  clampObjectPositionToRoom,
  getWallAttachedObjectTransform,
  isWallAttachedObject,
} from "@/lib/room/constraints";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { useRoomStore } from "@/store/roomStore";
import { useUIStore } from "@/store/uiStore";
import { EditorHotkeys } from "@/components/layout/EditorHotkeys";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ViewportHud } from "@/components/layout/ViewportHud";
import { MobileRoomViewportPreview } from "@/components/layout/MobileRoomViewportPreview";
import { RoomScene } from "@/components/room/RoomScene";
import { buildEditorStatusToast, buildStructureToast, type EditorToast } from "@/lib/editor/toasts";
import type { RoomData, RoomObject } from "@/types/room";

type DragPreviewState = {
  templateId: string | null;
  x: number;
  y: number;
  position: RoomObject["position"] | null;
};

const emptyDragPreview: DragPreviewState = {
  templateId: null,
  x: 0,
  y: 0,
  position: null,
};

function getMobileDesktopNoticeCopy(locale: "tr" | "en") {
  return locale === "en"
    ? {
        eyebrow: "Mobile preview",
        title: "Please open on desktop",
        body: "Editing and layout generation are available only on a computer. On mobile, you can only browse the room previews below.",
        note: "This notice cannot be closed.",
      }
    : {
        eyebrow: "Mobil \u00f6nizleme",
        title: "L\u00fctfen bilgisayardan a\u00e7\u0131n\u0131z",
        body: "D\u00fczenleme ve yerle\u015fim olu\u015fturma yaln\u0131zca bilgisayarda a\u00e7\u0131kt\u0131r. Telefondan sadece a\u015fa\u011f\u0131daki oda \u00f6nizlemeleri gezilebilir.",
        note: "Bu uyar\u0131 kapat\u0131lamaz.",
      };
}

const mobilePreviewPurposes = [
  "living",
  "kitchen",
  "bedroom",
  "kids",
  "study",
  "bathroom",
  "dining",
  "laundry",
  "entry",
  "balcony",
  "dressing",
] as const;

function MobileDesktopNotice({ locale }: { locale: "tr" | "en" }) {
  const copy = getMobileDesktopNoticeCopy(locale);

  return (
    <main className="mobile-desktop-gate relative h-dvh overflow-y-auto bg-[#080d12] px-4 pb-8 pt-36 text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 h-40 bg-gradient-to-b from-[#080d12] via-[#080d12]/92 to-transparent" />
      <section className="fixed left-3 right-3 top-3 z-50 mx-auto max-w-md rounded-[1.35rem] border border-white/14 bg-[#111922]/92 p-3.5 shadow-[0_18px_48px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#ffb36c]/35 bg-[#2a180c] text-[#ffd7a7]">
            <Monitor className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#ffb36c]">
              {copy.eyebrow}
            </div>
            <h1 className="mt-1 text-lg font-semibold leading-6 tracking-[-0.03em] text-white">
              {copy.title}
            </h1>
            <p className="mt-1.5 text-xs leading-5 text-slate-300">{copy.body}</p>
            <div className="mt-2 inline-flex rounded-full border border-[#ffb36c]/20 bg-[#2a180c]/80 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#ffd7a7]">
              {copy.note}
            </div>
          </div>
        </div>
      </section>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(255,179,108,0.2),transparent_28%),radial-gradient(circle_at_84%_14%,rgba(114,177,255,0.18),transparent_30%),linear-gradient(180deg,rgba(8,13,18,0.2),rgba(8,13,18,0.95))]" />
      <div className="relative z-10 space-y-4">
        <div className="px-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            {locale === "en" ? "View-only gallery" : "Sadece \u00f6nizleme galerisi"}
          </div>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-300">
            {locale === "en"
              ? "Room scenes keep moving under the notice, but all editing tools are locked on phones."
              : "Oda sahneleri uyar\u0131n\u0131n alt\u0131nda gezilebilir; telefonda d\u00fczenleme ara\u00e7lar\u0131 kapal\u0131d\u0131r."}
          </p>
        </div>
        {mobilePreviewPurposes.map((purpose) => (
          <MobileRoomViewportPreview key={purpose} locale={locale} purpose={purpose} />
        ))}
      </div>
    </main>
  );
}

const getViewportRoomPosition = (
  roomData: RoomData,
  pointerX: number,
  pointerY: number,
  bounds: DOMRect,
): RoomObject["position"] => {
  const ratioX = Math.min(1, Math.max(0, pointerX / bounds.width));
  const ratioZ = Math.min(1, Math.max(0, pointerY / bounds.height));

  return {
    x: ratioX * roomData.room.width,
    z: ratioZ * roomData.room.depth,
  };
};

const createPreviewObjectFromTemplate = (
  template: InventoryTemplate,
  roomData: RoomData,
  position: RoomObject["position"],
): RoomObject => {
  const structural = Boolean(template.params.structural);
  const mountHeight =
    typeof template.params.mountHeight === "number" ? template.params.mountHeight : 0;
  const height = Math.min(
    template.dimensions.height,
    Math.max(0.05, roomData.room.height - mountHeight),
  );
  const previewObject: RoomObject = {
    id: `preview_${template.id}`,
    label: template.label,
    labelKey: template.labelKey,
    category: template.category,
    generator: template.generator,
    position,
    rotation: template.rotation ?? 0,
    dimensions: {
      ...template.dimensions,
      height,
    },
    color: template.color,
    movable: !structural,
    locked: structural,
    params: { ...template.params },
  };

  if (isWallAttachedObject(previewObject)) {
    const placement = getWallAttachedObjectTransform(
      roomData,
      previewObject,
      previewObject.position,
    );

    return {
      ...previewObject,
      position: placement.position,
      rotation: placement.rotation,
    };
  }

  return {
    ...previewObject,
    position: clampObjectPositionToRoom(
      roomData,
      previewObject,
      previewObject.position,
      previewObject.rotation,
    ),
  };
};

export function AppShell() {
  const locale = useUIStore((state) => state.locale);
  const setLocale = useUIStore((state) => state.setLocale);
  const selectedStructure = useUIStore((state) => state.selectedStructure);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const setActiveSidebarTab = useUIStore((state) => state.setActiveSidebarTab);
  const setSelectedStructure = useUIStore((state) => state.setSelectedStructure);
  const multiSelectMenu = useUIStore((state) => state.multiSelectMenu);
  const setMultiSelectMenu = useUIStore((state) => state.setMultiSelectMenu);
  const roomData = useRoomStore((state) => state.roomData);
  const selectedObjectId = useRoomStore((state) => state.selectedObjectId);
  const selectedObjectIds = useRoomStore((state) => state.selectedObjectIds);
  const selectedGroupId = useRoomStore((state) => state.selectedGroupId);
  const addObjectFromTemplate = useRoomStore((state) => state.addObjectFromTemplate);
  const lastEditorStatus = useRoomStore((state) => state.lastEditorStatus);
  const groupSelectedObjects = useRoomStore((state) => state.groupSelectedObjects);
  const ungroupSelectedObjects = useRoomStore((state) => state.ungroupSelectedObjects);
  const randomizeSelectedObjects = useRoomStore((state) => state.randomizeSelectedObjects);
  const deleteSelectedObjects = useRoomStore((state) => state.deleteSelectedObjects);
  const toggleSelectedObjectsLock = useRoomStore((state) => state.toggleSelectedObjectsLock);

  const [panelsHidden, setPanelsHidden] = useState(false);
  const [toast, setToast] = useState<{
    id: number;
    title: string;
    detail?: string;
    tone?: EditorToast["tone"];
  } | null>(null);
  const roomDataRef = useRef(roomData);
  const toastTimeoutRef = useRef<number | null>(null);
  const activeInventoryDragTemplateIdRef = useRef<string | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreviewState>(emptyDragPreview);
  const selectedIdsSet = useMemo(
    () => new Set(selectedObjectIds),
    [selectedObjectIds],
  );
  const selectedWholeGroup = useMemo(
    () =>
      roomData.groups?.find(
        (group) =>
          group.objectIds.length === selectedObjectIds.length &&
          group.objectIds.every((objectId) => selectedIdsSet.has(objectId)),
      ) ?? null,
    [roomData.groups, selectedIdsSet, selectedObjectIds.length],
  );
  const shouldShowUngroup = Boolean(selectedGroupId || selectedWholeGroup);
  const shouldShowGroup =
    selectedObjectIds.length > 1 && !selectedWholeGroup;
  const dragPreviewObject = useMemo(() => {
    if (!dragPreview.templateId || !dragPreview.position) {
      return null;
    }

    const template = getInventoryTemplateById(dragPreview.templateId);

    if (!template) {
      return null;
    }

    return createPreviewObjectFromTemplate(template, roomData, dragPreview.position);
  }, [dragPreview.position, dragPreview.templateId, roomData]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t(locale, "appTitle");
  }, [locale]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedLocale = window.localStorage.getItem("desain-locale");
    if (storedLocale === "tr" || storedLocale === "en") {
      setLocale(storedLocale);
    }
  }, [setLocale]);

  useEffect(() => {
    roomDataRef.current = roomData;
  }, [roomData]);

  useEffect(() => {
    if (selectedObjectIds.length < 2) {
      setMultiSelectMenu(null);
    }
  }, [selectedObjectIds.length, setMultiSelectMenu]);

  useEffect(() => {
    const handleDragStart = (event: Event) => {
      activeInventoryDragTemplateIdRef.current =
        (event as CustomEvent<string>).detail ?? null;
    };
    const handleDragEnd = () => {
      activeInventoryDragTemplateIdRef.current = null;
      setDragPreview(emptyDragPreview);
    };

    window.addEventListener("desain:inventory-drag-start", handleDragStart);
    window.addEventListener("desain:inventory-drag-end", handleDragEnd);

    return () => {
      window.removeEventListener("desain:inventory-drag-start", handleDragStart);
      window.removeEventListener("desain:inventory-drag-end", handleDragEnd);
    };
  }, []);

  const showToast = useCallback((nextToast: {
    title: string;
    detail?: string;
    tone?: EditorToast["tone"];
  }) => {
    const id = Date.now();

    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }

    setToast({ id, ...nextToast });
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
      toastTimeoutRef.current = null;
    }, 2800);
  }, []);

  useEffect(() => {
    if (lastEditorStatus.key === "selectionUpdated" && selectedStructure) {
      return;
    }

    const nextToast = buildEditorStatusToast({
      locale,
      status: lastEditorStatus,
      roomData: roomDataRef.current,
      selectedObjectId,
      selectedObjectIds,
      selectedGroupId,
      selectedStructure,
    });

    if (!nextToast) {
      return;
    }

    showToast(nextToast);
  }, [
    lastEditorStatus,
    locale,
    selectedObjectId,
    selectedObjectIds,
    selectedGroupId,
    selectedStructure,
    showToast,
  ]);

  useEffect(() => {
    const nextToast = buildStructureToast({
      locale,
      roomData: roomDataRef.current,
      selectedStructure,
    });

    if (!nextToast) {
      return;
    }

    showToast(nextToast);
  }, [locale, selectedStructure, showToast]);

  const captureScreenshot = () => {
    const canvas = document.querySelector<HTMLCanvasElement>(".room-canvas canvas");

    if (!canvas) {
      return;
    }

    const link = document.createElement("a");
    link.download = `isin-mutfagi-room-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast({ title: t(locale, "captureScreenshot"), tone: "success" });
  };

  const togglePanels = () => {
    setPanelsHidden((current) => {
      const next = !current;
      showToast({
        title: t(locale, next ? "hidePanels" : "showPanels"),
        tone: "info",
      });
      return next;
    });
  };

  if (isMobile) {
    return <MobileDesktopNotice locale={locale} />;
  }

  return (
    <main className="h-dvh overflow-hidden px-3 py-3 md:px-4 md:py-4">
      <EditorHotkeys />
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1820px] flex-col gap-3 md:gap-4">
        <Topbar
          panelsHidden={panelsHidden}
          onTogglePanels={togglePanels}
          onCaptureScreenshot={captureScreenshot}
        />

        <section
          className={`grid min-h-0 flex-1 gap-4 ${
            panelsHidden
              ? "grid-cols-1"
              : "grid-rows-[minmax(320px,44vh)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_560px] xl:grid-rows-none"
          }`}
        >
          <div
              className="editor-panel room-canvas relative h-full min-h-0 overflow-hidden p-0"
              onDragOver={(event) => {
                const templateId =
                  activeInventoryDragTemplateIdRef.current ||
                  event.dataTransfer.getData(INVENTORY_DRAG_MIME) ||
                  event.dataTransfer.getData("text/plain");

                if (!templateId) {
                  return;
                }

                const bounds = event.currentTarget.getBoundingClientRect();
                const pointerX = event.clientX - bounds.left;
                const pointerY = event.clientY - bounds.top;
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
                setDragPreview({
                  templateId,
                  x: pointerX,
                  y: pointerY,
                  position: getViewportRoomPosition(roomData, pointerX, pointerY, bounds),
                });
              }}
              onDragLeave={(event) => {
                const bounds = event.currentTarget.getBoundingClientRect();
                const outside =
                  event.clientX <= bounds.left ||
                  event.clientX >= bounds.right ||
                  event.clientY <= bounds.top ||
                  event.clientY >= bounds.bottom;

                if (outside) {
                  setDragPreview(emptyDragPreview);
                }
              }}
              onDrop={(event) => {
                const templateId =
                  activeInventoryDragTemplateIdRef.current ||
                  event.dataTransfer.getData(INVENTORY_DRAG_MIME) ||
                  event.dataTransfer.getData("text/plain");

                if (!templateId) {
                  return;
                }

                event.preventDefault();

                const bounds = event.currentTarget.getBoundingClientRect();
                const pointerX = event.clientX - bounds.left;
                const pointerY = event.clientY - bounds.top;
                const position = getViewportRoomPosition(roomData, pointerX, pointerY, bounds);
                activeInventoryDragTemplateIdRef.current = null;
                setDragPreview(emptyDragPreview);

                const added = addObjectFromTemplate(templateId, position);

                if (added?.type === "wall") {
                  setSelectedStructure({ type: "wall", id: added.id });
                } else {
                  setSelectedStructure(null);
                }

                setActiveSidebarTab("details");
              }}
            >
            <div className="viewport-grid absolute inset-0 opacity-55" />
            {multiSelectMenu && selectedObjectIds.length > 1 ? (
              <div
                className="fixed z-50 w-56 rounded-xl border border-white/10 bg-[#0d141d]/96 p-2 text-xs font-semibold text-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.42)] backdrop-blur"
                style={{
                  left: Math.min(multiSelectMenu.x, window.innerWidth - 260),
                  top: Math.min(multiSelectMenu.y, window.innerHeight - 260),
                }}
              >
                <div className="px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8cb9ff]">
                  {`${selectedObjectIds.length} ${t(locale, "selectedItems")}`}
                </div>
                {shouldShowGroup ? (
                  <button
                    type="button"
                    onClick={() => {
                      groupSelectedObjects();
                      setMultiSelectMenu(null);
                      setActiveSidebarTab("outliner");
                    }}
                    className="flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-left transition hover:bg-white/8 hover:text-white"
                  >
                    <Boxes className="h-3.5 w-3.5 text-[#8cb9ff]" />
                    {t(locale, "groupSelection")}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    randomizeSelectedObjects();
                    setMultiSelectMenu(null);
                  }}
                  className="flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-left transition hover:bg-white/8 hover:text-white"
                >
                  <Shuffle className="h-3.5 w-3.5 text-[#8cb9ff]" />
                  {t(locale, "randomizeSelection")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toggleSelectedObjectsLock();
                    setMultiSelectMenu(null);
                  }}
                  className="flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-left transition hover:bg-white/8 hover:text-white"
                >
                  <Lock className="h-3.5 w-3.5 text-[#8cb9ff]" />
                  {t(locale, "lockSelection")}
                </button>
                {shouldShowUngroup ? (
                  <button
                    type="button"
                    onClick={() => {
                      ungroupSelectedObjects();
                      setMultiSelectMenu(null);
                    }}
                    className="flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-left transition hover:bg-white/8 hover:text-white"
                  >
                    <Ungroup className="h-3.5 w-3.5 text-[#8cb9ff]" />
                    {t(locale, "ungroup")}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    deleteSelectedObjects();
                    setMultiSelectMenu(null);
                  }}
                  className="flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[#ff9b9b] transition hover:bg-[#2a1313] hover:text-white"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t(locale, "deleteSelection")}
                </button>
              </div>
            ) : null}
            <ViewportHud />
            <div className="h-full">
              <RoomScene previewObject={dragPreviewObject} />
            </div>
          </div>

          {panelsHidden ? null : <Sidebar />}
        </section>
      </div>
      {toast ? (
        <div
          className={`fixed bottom-4 right-4 z-50 w-[min(420px,calc(100vw-2rem))] rounded-2xl border px-4 py-3 shadow-[0_18px_45px_rgba(0,0,0,0.38)] backdrop-blur ${
            toast.tone === "success"
              ? "border-[#1f6b45] bg-[#102416]/96 text-[#d7f7e6]"
              : toast.tone === "warning"
                ? "border-[#6d4a29] bg-[#25180f]/96 text-[#f5c28b]"
                : "border-[#24405a] bg-[#102234]/96 text-[#dbeafe]"
          }`}
        >
          <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/60">
            İşin Mutfağı
          </div>
          <div className="mt-1 text-sm font-semibold text-white">{toast.title}</div>
          {toast.detail ? (
            <div className="mt-1 text-sm leading-6 text-white/80">{toast.detail}</div>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
