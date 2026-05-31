"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Boxes, Camera, Eye, Lock, Shuffle, Trash2, Ungroup } from "lucide-react";
import {
  formatEditorStatus,
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
import { useRoomStore } from "@/store/roomStore";
import { useUIStore } from "@/store/uiStore";
import { EditorHotkeys } from "@/components/layout/EditorHotkeys";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ViewportHud } from "@/components/layout/ViewportHud";
import { RoomScene } from "@/components/room/RoomScene";
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
  const setActiveSidebarTab = useUIStore((state) => state.setActiveSidebarTab);
  const setSelectedStructure = useUIStore((state) => state.setSelectedStructure);
  const multiSelectMenu = useUIStore((state) => state.multiSelectMenu);
  const setMultiSelectMenu = useUIStore((state) => state.setMultiSelectMenu);
  const roomData = useRoomStore((state) => state.roomData);
  const addObjectFromTemplate = useRoomStore((state) => state.addObjectFromTemplate);
  const lastEditorStatus = useRoomStore((state) => state.lastEditorStatus);
  const selectedObjectIds = useRoomStore((state) => state.selectedObjectIds);
  const selectedGroupId = useRoomStore((state) => state.selectedGroupId);
  const groupSelectedObjects = useRoomStore((state) => state.groupSelectedObjects);
  const ungroupSelectedObjects = useRoomStore((state) => state.ungroupSelectedObjects);
  const randomizeSelectedObjects = useRoomStore((state) => state.randomizeSelectedObjects);
  const deleteSelectedObjects = useRoomStore((state) => state.deleteSelectedObjects);
  const toggleSelectedObjectsLock = useRoomStore((state) => state.toggleSelectedObjectsLock);
  const [panelsHidden, setPanelsHidden] = useState(false);
  const [toast, setToast] = useState<{
    id: number;
    message: string;
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
                className="fixed z-50 w-56 rounded-2xl border border-white/10 bg-[#0d141d]/96 p-2 text-sm text-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.42)] backdrop-blur"
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
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-white/8 hover:text-white"
                  >
                    <Boxes className="h-4 w-4 text-[#8cb9ff]" />
                    {t(locale, "groupSelection")}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    randomizeSelectedObjects();
                    setMultiSelectMenu(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-white/8 hover:text-white"
                >
                  <Shuffle className="h-4 w-4 text-[#8cb9ff]" />
                  {t(locale, "randomizeSelection")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toggleSelectedObjectsLock();
                    setMultiSelectMenu(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-white/8 hover:text-white"
                >
                  <Lock className="h-4 w-4 text-[#8cb9ff]" />
                  {t(locale, "lockSelection")}
                </button>
                {shouldShowUngroup ? (
                  <button
                    type="button"
                    onClick={() => {
                      ungroupSelectedObjects();
                      setMultiSelectMenu(null);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-white/8 hover:text-white"
                  >
                    <Ungroup className="h-4 w-4 text-[#8cb9ff]" />
                    {t(locale, "ungroup")}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    deleteSelectedObjects();
                    setMultiSelectMenu(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[#ff9b9b] transition hover:bg-[#2a1313] hover:text-white"
                >
                  <Trash2 className="h-4 w-4" />
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
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-2xl border border-[#24405a] bg-[#102234]/95 px-4 py-3 text-sm font-medium text-[#dbeafe] shadow-[0_18px_45px_rgba(0,0,0,0.35)] backdrop-blur">
          {toast.message}
        </div>
      ) : null}
    </main>
  );
}
