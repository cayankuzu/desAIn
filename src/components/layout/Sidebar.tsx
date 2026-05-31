"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  BoxSelect,
  Check,
  ClipboardPaste,
  Copy,
  RefreshCw,
  Lock,
  Move3d,
  Package2,
  PanelRight,
  Plus,
  Ruler,
  Save,
  Scissors,
  Search,
  Shuffle,
  Trash2,
  Undo2,
  Unlock,
  RotateCw,
} from "lucide-react";
import {
  curatedInventoryCatalog,
  featuredInventory,
  INVENTORY_DRAG_MIME,
  type InventoryTemplate,
} from "@/lib/room/inventoryCatalog";
import { isOpeningLocked, isWallLocked } from "@/lib/room/roomGeometry";
import { roomPurposeOptions } from "@/lib/room/roomPresets";
import {
  formatWarning,
  getLocalizedCategoryLabel,
  getLocalizedObjectLabel,
  getLocalizedOpeningType,
  t,
  type Locale,
  type MessageKey,
} from "@/lib/i18n/translations";
import { useRoomStore } from "@/store/roomStore";
import { useUIStore } from "@/store/uiStore";
import type { SidebarTab } from "@/store/uiStore";
import type {
  Opening,
  RoomDefinition,
  RoomObject,
  RoomObjectGroup,
  RoomPurpose,
  RoomShape,
} from "@/types/room";
import { InventoryPreview } from "./InventoryPreview";

const sidebarTabs: Array<{
  id: SidebarTab;
  labelKey: MessageKey;
  icon: typeof Move3d;
}> = [
  { id: "room", labelKey: "roomSettings", icon: Ruler },
  { id: "details", labelKey: "details", icon: Move3d },
  { id: "outliner", labelKey: "outliner", icon: Boxes },
  { id: "inventory", labelKey: "inventory", icon: Package2 },
  { id: "random", labelKey: "randomLayouts", icon: Shuffle },
  { id: "validation", labelKey: "validate", icon: AlertTriangle },
  { id: "shortcuts", labelKey: "shortcuts", icon: Scissors },
];

type WallControlSpec = {
  linkedLabelKey: MessageKey;
  wallLength: number;
  updatePayload: (value: number) => {
    width?: number;
    depth?: number;
    height?: number;
    shape?: RoomShape;
    cutoutWidth?: number;
    cutoutDepth?: number;
  };
};

type InventoryCategoryId =
  | "all"
  | "living"
  | "kitchen"
  | "appliance"
  | "seating"
  | "table"
  | "storage"
  | "bedroom"
  | "bath"
  | "decor"
  | "opening"
  | "stairs"
  | "structure";

const inventoryCategories: Array<{
  id: InventoryCategoryId;
  label: Record<Locale, string>;
}> = [
  { id: "all", label: { en: "All", tr: "Tümü" } },
  { id: "living", label: { en: "Living", tr: "Salon" } },
  { id: "kitchen", label: { en: "Kitchen", tr: "Mutfak" } },
  { id: "appliance", label: { en: "Appliances", tr: "Beyaz Eşya" } },
  { id: "seating", label: { en: "Seating", tr: "Oturma" } },
  { id: "table", label: { en: "Tables", tr: "Masalar" } },
  { id: "storage", label: { en: "Storage", tr: "Dolap" } },
  { id: "bedroom", label: { en: "Bedroom", tr: "Yatak" } },
  { id: "bath", label: { en: "Bath", tr: "Banyo" } },
  { id: "decor", label: { en: "Decor", tr: "Dekor" } },
  { id: "opening", label: { en: "Openings", tr: "Kapı/Pencere" } },
  { id: "stairs", label: { en: "Stairs", tr: "Merdiven" } },
  { id: "structure", label: { en: "Structure", tr: "Yapı" } },
];

const inventoryCategoryLabels = new Map(
  inventoryCategories.map((category) => [category.id, category.label]),
);

const compactActionButtonBase =
  "inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 text-[11px] font-semibold uppercase tracking-[0.11em] transition";
const neutralActionButtonClass =
  "border-white/10 bg-[#111924] text-slate-200 hover:border-[#32516c] hover:text-white";
const lockedActionButtonClass =
  "border-[#6d4a29] bg-[#25180f] text-[#f5c28b] hover:border-[#ffb16a] hover:text-white";
const primaryActionButtonClass =
  "border-[#24405a] bg-[#102234] text-[#8cb9ff] hover:border-[#4ea8ff] hover:text-white";
const dangerActionButtonClass =
  "border-[#6e2a2a] bg-[#2a1313] text-[#ff8e8e] hover:border-[#ff5a5a] hover:text-white";

const hasInventoryTag = (item: InventoryTemplate, tags: string[]) =>
  tags.some((tag) =>
    item.tags.some((itemTag) => itemTag.toLowerCase().includes(tag)),
  );

const getInventoryCategoryIds = (item: InventoryTemplate): InventoryCategoryId[] => {
  const categories = new Set<InventoryCategoryId>();

  if (
    item.category === "sofa" ||
    item.category === "tv_unit" ||
    item.category === "carpet" ||
    hasInventoryTag(item, ["living", "media", "piano", "music"])
  ) {
    categories.add("living");
  }

  if (
    item.previewType === "kitchen" ||
    hasInventoryTag(item, ["kitchen", "sink", "cabinet", "hood"])
  ) {
    categories.add("kitchen");
  }

  if (
    item.previewType === "appliance" ||
    hasInventoryTag(item, [
      "appliance",
      "fridge",
      "oven",
      "dishwasher",
      "washer",
      "microwave",
      "radiator",
      "ac",
    ])
  ) {
    categories.add("appliance");
  }

  if (
    item.category === "chair" ||
    item.category === "sofa" ||
    item.previewType === "chair" ||
    item.previewType === "sofa" ||
    hasInventoryTag(item, ["seat", "stool", "bench"])
  ) {
    categories.add("seating");
  }

  if (item.category === "table" || item.previewType === "table") {
    categories.add("table");
  }

  if (
    item.category === "wardrobe" ||
    item.previewType === "storage" ||
    item.previewType === "wardrobe" ||
    hasInventoryTag(item, ["storage", "cabinet", "rack", "wardrobe", "dresser", "bookshelf"])
  ) {
    categories.add("storage");
  }

  if (
    item.category === "bed" ||
    hasInventoryTag(item, ["bed", "bedside", "nightstand", "dresser", "wardrobe"])
  ) {
    categories.add("bedroom");
  }

  if (item.previewType === "bath" || hasInventoryTag(item, ["bathroom", "toilet", "shower"])) {
    categories.add("bath");
  }

  if (
    item.previewType === "decor" ||
    item.previewType === "plant" ||
    item.previewType === "instrument" ||
    item.previewType === "lighting" ||
    item.previewType === "lamp" ||
    hasInventoryTag(item, ["decor", "art", "mirror", "clock", "plant", "light", "shelf"])
  ) {
    categories.add("decor");
  }

  if (
    item.previewType === "door" ||
    item.previewType === "window" ||
    hasInventoryTag(item, ["door", "window", "curtain"])
  ) {
    categories.add("opening");
  }

  if (item.previewType === "stairs" || hasInventoryTag(item, ["stairs", "ladder"])) {
    categories.add("stairs");
  }

  if (
    item.previewType === "cube" ||
    item.previewType === "column" ||
    item.previewType === "wall" ||
    hasInventoryTag(item, ["column", "support", "primitive", "partition", "wall", "divider", "structure"])
  ) {
    categories.add("structure");
  }

  return [...categories];
};

const dedupeInventoryTemplates = (templates: InventoryTemplate[]) => {
  const seen = new Set<string>();

  return templates.filter((item) => {
    const signature = [
      item.labelKey,
      item.category,
      item.generator,
      item.previewType,
      item.dimensions.width,
      item.dimensions.depth,
      item.dimensions.height,
    ].join(":");

    if (seen.has(signature)) {
      return false;
    }

    seen.add(signature);
    return true;
  });
};

const uniqueInventoryCatalog = dedupeInventoryTemplates(curatedInventoryCatalog);
const featuredInventoryIdSet = new Set(featuredInventory.map((item) => item.id));
const uniqueFeaturedInventory = uniqueInventoryCatalog.filter((item) =>
  featuredInventoryIdSet.has(item.id),
);

const formatWallLabel = (locale: Locale, wallId: string) => {
  const wallNumber = wallId.replace("wall_", "");

  return `${t(locale, "wallNumber")} ${wallNumber}`;
};

const formatOpeningLabel = (locale: Locale, opening: Opening) => {
  const openingNumber = opening.id.replace(`${opening.type}_`, "").replace("_", " ");

  return `${getLocalizedOpeningType(locale, opening.type)} ${openingNumber}`;
};

export function Sidebar() {
  const locale = useUIStore((state) => state.locale);
  const activeSidebarTab = useUIStore((state) => state.activeSidebarTab);
  const setActiveSidebarTab = useUIStore((state) => state.setActiveSidebarTab);
  const setSelectedStructure = useUIStore((state) => state.setSelectedStructure);
  const selectedStructure = useUIStore((state) => state.selectedStructure);
  const roomData = useRoomStore((state) => state.roomData);
  const selectedObjectId = useRoomStore((state) => state.selectedObjectId);
  const selectedObjectIds = useRoomStore((state) => state.selectedObjectIds);
  const selectedGroupId = useRoomStore((state) => state.selectedGroupId);
  const setSelectedObjectId = useRoomStore((state) => state.setSelectedObjectId);
  const selectGroup = useRoomStore((state) => state.selectGroup);
  const validationWarnings = useRoomStore((state) => state.validationWarnings);

  const selectedObject =
    roomData.objects.find((object) => object.id === selectedObjectId) ?? null;
  const selectedGroup =
    roomData.groups?.find((group) => group.id === selectedGroupId) ?? null;
  const selectedOpening =
    selectedStructure?.type === "opening"
      ? roomData.room.openings.find((opening) => opening.id === selectedStructure.id) ?? null
      : null;
  const detailsLabel = selectedGroup
    ? selectedGroup.label
    : selectedObject
    ? t(locale, "objectDetails")
    : selectedStructure?.type === "wall"
      ? t(locale, "wallDetails")
      : selectedOpening
        ? t(locale, "openingDetails")
        : t(locale, "details");

  return (
    <aside className="editor-panel flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-white/8 px-4 py-4">
        <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8cb9ff]">
          <PanelRight className="h-3.5 w-3.5" />
          {t(locale, "inspectorPanel")}
        </div>
        <div className="flex flex-wrap gap-2">
          {sidebarTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeSidebarTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSidebarTab(tab.id)}
                aria-pressed={active}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition ${
                  active
                    ? "border-[#4ea8ff] bg-[#102234] text-white"
                    : "border-white/10 bg-[#0d141d] text-slate-300 hover:border-[#32516c] hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t(locale, tab.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="scroll-area min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {activeSidebarTab === "room" ? <RoomSettingsEditor locale={locale} /> : null}

        {activeSidebarTab === "details" ? (
          <section className="rounded-2xl border border-white/10 bg-[#0d141d] p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ffb16a]">
              <Move3d className="h-3.5 w-3.5" />
              {detailsLabel}
            </div>

            {selectedGroup ? (
              <SelectedGroupEditor
                locale={locale}
                group={selectedGroup}
                objects={roomData.objects.filter((object) =>
                  selectedGroup.objectIds.includes(object.id),
                )}
              />
            ) : selectedObject ? (
              <SelectedObjectEditor object={selectedObject} locale={locale} />
            ) : selectedStructure?.type === "wall" ? (
              <SelectedWallEditor locale={locale} wallId={selectedStructure.id} />
            ) : selectedOpening ? (
              <SelectedOpeningEditor
                locale={locale}
                opening={selectedOpening}
                wallIds={roomData.room.walls.map((wall) => wall.id)}
              />
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm leading-6 text-slate-400">
                {t(locale, "selectObjectHint")}
              </div>
            )}
          </section>
        ) : null}

        {activeSidebarTab === "outliner" ? (
          <OutlinerPanel
            locale={locale}
            selectedObjectId={selectedObjectId}
            selectedObjectIds={selectedObjectIds}
            selectedGroupId={selectedGroupId}
            setSelectedObjectId={(objectId) => {
              setSelectedStructure(null);
              setSelectedObjectId(objectId);
              setActiveSidebarTab("details");
            }}
            selectGroup={(groupId) => {
              setSelectedStructure(null);
              selectGroup(groupId);
              setActiveSidebarTab("details");
            }}
          />
        ) : null}

        {activeSidebarTab === "inventory" ? <InventoryPanel locale={locale} /> : null}

        {activeSidebarTab === "random" ? <RandomLayoutsPanel locale={locale} /> : null}

        {activeSidebarTab === "validation" ? (
          <ValidationPanel
            locale={locale}
            validationWarnings={validationWarnings}
            setSelectedObjectId={(objectId) => {
              setSelectedStructure(null);
              setSelectedObjectId(objectId);
              setActiveSidebarTab("details");
            }}
          />
        ) : null}

        {activeSidebarTab === "shortcuts" ? (
          <ShortcutActionsPanel locale={locale} />
        ) : null}
      </div>
    </aside>
  );
}

function RoomSettingsEditor({ locale }: { locale: Locale }) {
  const roomData = useRoomStore((state) => state.roomData);
  const updateRoomProperties = useRoomStore((state) => state.updateRoomProperties);
  const addDividerWall = useRoomStore((state) => state.addDividerWall);
  const selectedStructure = useUIStore((state) => state.selectedStructure);
  const setSelectedStructure = useUIStore((state) => state.setSelectedStructure);
  const setActiveSidebarTab = useUIStore((state) => state.setActiveSidebarTab);
  const setSelectedObjectId = useRoomStore((state) => state.setSelectedObjectId);
  const currentPurpose = roomData.room.purpose ?? "living";

  const handleDimensionChange = (
    key: "width" | "depth" | "height",
    value: number,
  ) => {
    if (Number.isNaN(value)) {
      return;
    }

    updateRoomProperties({ [key]: value });
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0d141d] p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8cb9ff]">
        <Ruler className="h-3.5 w-3.5" />
        {t(locale, "roomSettings")}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
            {t(locale, "shape")}
          </span>
          <select
            value={roomData.room.shape}
            onChange={(event) =>
              updateRoomProperties({
                shape: event.target.value as RoomShape,
                purpose: currentPurpose,
              })
            }
            className="w-full rounded-xl border border-white/10 bg-[#111924] px-3 py-2 text-white outline-none transition focus:border-[#4ea8ff]"
          >
            <option value="rectangle">{t(locale, "rectangle")}</option>
            <option value="square">{t(locale, "square")}</option>
            <option value="l_shape">{t(locale, "lShape")}</option>
            <option value="custom">{t(locale, "customShape")}</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
            {t(locale, "roomPurpose")}
          </span>
          <select
            value={currentPurpose}
            onChange={(event) =>
              updateRoomProperties({
                purpose: event.target.value as RoomPurpose,
              })
            }
            className="w-full rounded-xl border border-white/10 bg-[#111924] px-3 py-2 text-white outline-none transition focus:border-[#4ea8ff]"
          >
            {roomPurposeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label[locale]}
              </option>
            ))}
          </select>
        </label>

        <div className="col-span-2 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-slate-500">{t(locale, "objectCount")}</div>
              <div className="mt-1 font-semibold text-white">{roomData.objects.length}</div>
            </div>
            <div className="max-w-[72%] text-right text-xs leading-5 text-slate-400">
              {
                roomPurposeOptions.find((option) => option.id === currentPurpose)
                  ?.description[locale]
              }
            </div>
          </div>
        </div>

        <label className="space-y-1">
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
            {t(locale, "width")}
          </span>
          <input
            type="number"
            min="2.4"
            step="0.1"
            value={roomData.room.width}
            onChange={(event) =>
              handleDimensionChange("width", event.currentTarget.valueAsNumber)
            }
            className="w-full rounded-xl border border-white/10 bg-[#111924] px-3 py-2 text-white outline-none transition focus:border-[#4ea8ff]"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
            {t(locale, "depth")}
          </span>
          <input
            type="number"
            min="2.4"
            step="0.1"
            value={roomData.room.depth}
            onChange={(event) =>
              handleDimensionChange("depth", event.currentTarget.valueAsNumber)
            }
            className="w-full rounded-xl border border-white/10 bg-[#111924] px-3 py-2 text-white outline-none transition focus:border-[#4ea8ff]"
          />
        </label>
        <label className="space-y-1 col-span-2">
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
            {t(locale, "height")}
          </span>
          <input
            type="number"
            min="2.2"
            step="0.1"
            value={roomData.room.height}
            onChange={(event) =>
              handleDimensionChange("height", event.currentTarget.valueAsNumber)
            }
            className="w-full rounded-xl border border-white/10 bg-[#111924] px-3 py-2 text-white outline-none transition focus:border-[#4ea8ff]"
          />
        </label>

        {roomData.room.shape === "l_shape" ? (
          <>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {t(locale, "cutoutWidth")}
              </span>
              <input
                type="number"
                min="0.8"
                step="0.1"
                value={roomData.room.cutoutWidth}
                onChange={(event) =>
                  updateRoomProperties({
                    cutoutWidth: event.currentTarget.valueAsNumber,
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-[#111924] px-3 py-2 text-white outline-none transition focus:border-[#4ea8ff]"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {t(locale, "cutoutDepth")}
              </span>
              <input
                type="number"
                min="0.8"
                step="0.1"
                value={roomData.room.cutoutDepth}
                onChange={(event) =>
                  updateRoomProperties({
                    cutoutDepth: event.currentTarget.valueAsNumber,
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-[#111924] px-3 py-2 text-white outline-none transition focus:border-[#4ea8ff]"
              />
            </label>
          </>
        ) : null}
      </div>

      <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="text-xs leading-5 text-slate-400">
          {t(locale, "dividerWallHint")}
        </div>
        <button
          type="button"
          onClick={() => {
            const wallId = addDividerWall();

            if (!wallId) {
              return;
            }

            setSelectedObjectId(null);
            setSelectedStructure({ type: "wall", id: wallId });
            setActiveSidebarTab("details");
          }}
          className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#24405a] bg-[#102234] px-3 text-xs font-semibold text-[#8cb9ff] transition hover:border-[#4ea8ff] hover:text-white"
        >
          <Plus className="h-4 w-4" />
          {t(locale, "addDividerWall")}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-300">
        {roomData.room.walls.map((wall) => {
          const selected =
            selectedStructure?.type === "wall" && selectedStructure.id === wall.id;
          const length = Math.hypot(
            wall.to[0] - wall.from[0],
            wall.to[1] - wall.from[1],
          );

          return (
            <button
              key={wall.id}
              type="button"
              onClick={() => {
                setSelectedObjectId(null);
                setSelectedStructure({ type: "wall", id: wall.id });
                setActiveSidebarTab("details");
              }}
              className={`rounded-xl border p-3 text-left transition ${
                selected
                  ? "border-[#4ea8ff] bg-[#102234]"
                  : "border-white/10 bg-white/5 hover:border-[#32516c] hover:text-white"
              }`}
            >
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {formatWallLabel(locale, wall.id)}
              </div>
              <div className="mt-1 font-semibold text-white">{`${length.toFixed(2)}m`}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function OpeningEditor({
  locale,
  opening,
  wallIds,
  selected,
  disabled = false,
  onSelect,
  onChange,
}: {
  locale: Locale;
  opening: Opening;
  wallIds: string[];
  selected: boolean;
  disabled?: boolean;
  onSelect?: () => void;
  onChange: (
    payload: Partial<
      Pick<Opening, "wallId" | "position" | "width" | "height" | "sillHeight" | "rotation">
    >,
  ) => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border p-3 text-sm text-slate-300 ${
        selected
          ? "border-[#4ea8ff] bg-[#102234]"
          : "border-white/10 bg-white/5"
      }`}
    >
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {formatOpeningLabel(locale, opening)}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            {t(locale, "wall")}
          </span>
          <select
            value={opening.wallId}
            disabled={disabled}
            onChange={(event) => onChange({ wallId: event.target.value })}
            className="w-full rounded-lg border border-white/10 bg-[#111924] px-2 py-2 text-white outline-none transition focus:border-[#4ea8ff] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {wallIds.map((wallId) => (
              <option key={wallId} value={wallId}>
                {formatWallLabel(locale, wallId)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            {t(locale, "positionX")}
          </span>
          <input
            type="number"
            step="0.05"
            value={opening.position}
            disabled={disabled}
            onChange={(event) => onChange({ position: event.currentTarget.valueAsNumber })}
            className="w-full rounded-lg border border-white/10 bg-[#111924] px-2 py-2 text-white outline-none transition focus:border-[#4ea8ff] disabled:cursor-not-allowed disabled:opacity-45"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            {t(locale, "positionY")}
          </span>
          <input
            type="number"
            step="0.05"
            min="0"
            value={opening.sillHeight ?? 0}
            disabled={disabled}
            onChange={(event) => {
              const value = event.currentTarget.valueAsNumber;

              if (!Number.isNaN(value)) {
                onChange({ sillHeight: value });
              }
            }}
            className="w-full rounded-lg border border-white/10 bg-[#111924] px-2 py-2 text-white outline-none transition focus:border-[#4ea8ff] disabled:cursor-not-allowed disabled:opacity-45"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            {t(locale, "width")}
          </span>
          <input
            type="number"
            step="0.05"
            min="0.3"
            value={opening.width}
            disabled={disabled}
            onChange={(event) => onChange({ width: event.currentTarget.valueAsNumber })}
            className="w-full rounded-lg border border-white/10 bg-[#111924] px-2 py-2 text-white outline-none transition focus:border-[#4ea8ff] disabled:cursor-not-allowed disabled:opacity-45"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            {t(locale, "height")}
          </span>
          <input
            type="number"
            step="0.05"
            min="0.2"
            value={opening.height ?? ""}
            disabled={disabled}
            onChange={(event) => {
              const value = event.currentTarget.valueAsNumber;

              if (!Number.isNaN(value)) {
                onChange({ height: value });
              }
            }}
            className="w-full rounded-lg border border-white/10 bg-[#111924] px-2 py-2 text-white outline-none transition focus:border-[#4ea8ff] disabled:cursor-not-allowed disabled:opacity-45"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            {t(locale, "rotation")}
          </span>
          <input
            type="number"
            step="15"
            value={opening.rotation ?? 0}
            disabled={disabled}
            onChange={(event) => onChange({ rotation: event.currentTarget.valueAsNumber })}
            className="w-full rounded-lg border border-white/10 bg-[#111924] px-2 py-2 text-white outline-none transition focus:border-[#4ea8ff] disabled:cursor-not-allowed disabled:opacity-45"
          />
        </label>
      </div>
    </div>
  );
}

function SelectedOpeningEditor({
  locale,
  opening,
  wallIds,
}: {
  locale: Locale;
  opening: Opening;
  wallIds: string[];
}) {
  const updateOpening = useRoomStore((state) => state.updateOpening);
  const toggleOpeningLock = useRoomStore((state) => state.toggleOpeningLock);
  const deleteOpening = useRoomStore((state) => state.deleteOpening);
  const setSelectedStructure = useUIStore((state) => state.setSelectedStructure);
  const openingLocked = isOpeningLocked(opening);
  const openingLockLabel = openingLocked ? t(locale, "unlock") : t(locale, "lock");

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">
            {formatOpeningLabel(locale, opening)}
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">
            {openingLocked ? t(locale, "locked") : t(locale, "editable")}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            title={openingLockLabel}
            aria-label={openingLockLabel}
            onClick={() => toggleOpeningLock(opening.id)}
            className={`${compactActionButtonBase} ${
              openingLocked ? lockedActionButtonClass : neutralActionButtonClass
            }`}
          >
            {openingLocked ? (
              <Unlock className="h-3.5 w-3.5" />
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )}
            {openingLockLabel}
          </button>
          <button
            type="button"
            title={t(locale, "deleteObject")}
            aria-label={t(locale, "deleteObject")}
            onClick={() => {
              deleteOpening(opening.id);
              setSelectedStructure(null);
            }}
            className={`${compactActionButtonBase} ${dangerActionButtonClass}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t(locale, "deleteObject")}
          </button>
        </div>
      </div>
      <OpeningEditor
        locale={locale}
        opening={opening}
        wallIds={wallIds}
        selected
        disabled={openingLocked}
        onSelect={undefined}
        onChange={(payload) => updateOpening(opening.id, payload)}
      />
      {openingLocked ? (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-3 text-xs leading-5 text-amber-100">
          {t(locale, "lockedEditHint")}
        </div>
      ) : null}
    </div>
  );
}

function SelectedWallEditor({
  locale,
  wallId,
}: {
  locale: Locale;
  wallId: string;
}) {
  const roomData = useRoomStore((state) => state.roomData);
  const updateRoomProperties = useRoomStore((state) => state.updateRoomProperties);
  const updateWallSegment = useRoomStore((state) => state.updateWallSegment);
  const toggleWallLock = useRoomStore((state) => state.toggleWallLock);
  const splitWall = useRoomStore((state) => state.splitWall);
  const wall = roomData.room.walls.find((entry) => entry.id === wallId) ?? null;
  const controlSpec = wall ? getWallControlSpec(roomData.room, wallId) : null;

  if (!wall) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm leading-6 text-slate-400">
        {t(locale, "selectObjectHint")}
      </div>
    );
  }

  const wallLocked = isWallLocked(wall);
  const wallLockLabel = wallLocked ? t(locale, "unlock") : t(locale, "lock");

  return (
    <div className="mt-4 space-y-4 text-sm text-slate-300">
      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-semibold text-white">
              {formatWallLabel(locale, wall.id)}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">
              {`${t(locale, "wall")} / ${wallLocked ? t(locale, "locked") : t(locale, "editable")}`}
            </div>
          </div>
          <button
            type="button"
            title={wallLockLabel}
            aria-label={wallLockLabel}
            onClick={() => toggleWallLock(wall.id)}
            className={`${compactActionButtonBase} ${
              wallLocked ? lockedActionButtonClass : primaryActionButtonClass
            }`}
          >
            {wallLocked ? (
              <Unlock className="h-3.5 w-3.5" />
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )}
            {wallLockLabel}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <ReadonlyField
            label={t(locale, "wallStart")}
            value={`${wall.from[0].toFixed(2)}m, ${wall.from[1].toFixed(2)}m`}
          />
          <ReadonlyField
            label={t(locale, "wallEnd")}
            value={`${wall.to[0].toFixed(2)}m, ${wall.to[1].toFixed(2)}m`}
          />
          {controlSpec ? (
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {t(locale, "wallLength")}
              </span>
              <input
                type="number"
                min="0.8"
                step="0.1"
                value={Number(controlSpec.wallLength.toFixed(2))}
                disabled={wallLocked}
                onChange={(event) => {
                  const value = event.currentTarget.valueAsNumber;

                  if (Number.isNaN(value)) {
                    return;
                  }

                  updateRoomProperties(controlSpec.updatePayload(value));
                }}
                className={`w-full rounded-xl border border-white/10 bg-[#111924] px-3 py-2 text-white outline-none transition focus:border-[#4ea8ff] ${
                  wallLocked ? "cursor-not-allowed opacity-60" : ""
                }`}
              />
            </label>
          ) : null}
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
              {t(locale, "height")}
            </span>
            <input
              type="number"
              min="2.2"
              step="0.1"
              value={roomData.room.height}
              disabled={wallLocked}
              onChange={(event) => {
                const value = event.currentTarget.valueAsNumber;

                if (Number.isNaN(value)) {
                  return;
                }

                updateRoomProperties({ height: value });
              }}
              className={`w-full rounded-xl border border-white/10 bg-[#111924] px-3 py-2 text-white outline-none transition focus:border-[#4ea8ff] ${
                wallLocked ? "cursor-not-allowed opacity-60" : ""
              }`}
            />
          </label>
        </div>

        {roomData.room.shape === "custom" ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <WallPointInput
              label={t(locale, "wallStartX")}
              value={wall.from[0]}
              disabled={wallLocked}
              onChange={(value) => updateWallSegment(wall.id, { from: [value, wall.from[1]] })}
            />
            <WallPointInput
              label={t(locale, "wallStartZ")}
              value={wall.from[1]}
              disabled={wallLocked}
              onChange={(value) => updateWallSegment(wall.id, { from: [wall.from[0], value] })}
            />
            <WallPointInput
              label={t(locale, "wallEndX")}
              value={wall.to[0]}
              disabled={wallLocked}
              onChange={(value) => updateWallSegment(wall.id, { to: [value, wall.to[1]] })}
            />
            <WallPointInput
              label={t(locale, "wallEndZ")}
              value={wall.to[1]}
              disabled={wallLocked}
              onChange={(value) => updateWallSegment(wall.id, { to: [wall.to[0], value] })}
            />
          </div>
        ) : null}

        {wallLocked ? (
          <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-3 text-xs leading-5 text-amber-100">
            {t(locale, "lockedEditHint")}
          </div>
        ) : null}

        {controlSpec ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-[#111924] px-3 py-3 text-xs uppercase tracking-[0.18em] text-slate-400">
            {`${t(locale, "linkedSetting")}: ${t(locale, controlSpec.linkedLabelKey)}`}
          </div>
        ) : null}

        <button
          type="button"
          disabled={wallLocked}
          onClick={() => splitWall(wall.id)}
          className={`mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#24405a] bg-[#102234] px-3 text-xs font-semibold text-[#8cb9ff] transition hover:border-[#4ea8ff] hover:text-white ${
            wallLocked ? "cursor-not-allowed opacity-50" : ""
          }`}
        >
          <BoxSelect className="h-4 w-4" />
          {t(locale, "splitWall")}
        </button>
      </div>
    </div>
  );
}

function WallPointInput({
  label,
  value,
  disabled = false,
  onChange,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <input
        type="number"
        min="0"
        step="0.1"
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const nextValue = event.currentTarget.valueAsNumber;

          if (!Number.isNaN(nextValue)) {
            onChange(nextValue);
          }
        }}
        className={`w-full rounded-xl border border-white/10 bg-[#111924] px-3 py-2 text-white outline-none transition focus:border-[#4ea8ff] ${
          disabled ? "cursor-not-allowed opacity-60" : ""
        }`}
      />
    </label>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#111924] px-3 py-2">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-1 font-medium text-white">{value}</div>
    </div>
  );
}

function getWallControlSpec(room: RoomDefinition, wallId: string): WallControlSpec | null {
  if (room.shape === "rectangle" || room.shape === "square") {
    if (wallId === "wall_1" || wallId === "wall_3") {
      return {
        linkedLabelKey: "width",
        wallLength: room.width,
        updatePayload: (value) => ({ width: value }),
      };
    }

    if (wallId === "wall_2" || wallId === "wall_4") {
      return {
        linkedLabelKey: "depth",
        wallLength: room.depth,
        updatePayload: (value) => ({ depth: value }),
      };
    }
  }

  if (room.shape === "l_shape") {
    switch (wallId) {
      case "wall_1":
        return {
          linkedLabelKey: "width",
          wallLength: room.width,
          updatePayload: (value) => ({ width: value }),
        };
      case "wall_2":
        return {
          linkedLabelKey: "cutoutDepth",
          wallLength: room.depth - room.cutoutDepth,
          updatePayload: (value) => ({ cutoutDepth: room.depth - value }),
        };
      case "wall_3":
        return {
          linkedLabelKey: "cutoutWidth",
          wallLength: room.cutoutWidth,
          updatePayload: (value) => ({ cutoutWidth: value }),
        };
      case "wall_4":
        return {
          linkedLabelKey: "cutoutDepth",
          wallLength: room.cutoutDepth,
          updatePayload: (value) => ({ cutoutDepth: value }),
        };
      case "wall_5":
        return {
          linkedLabelKey: "cutoutWidth",
          wallLength: room.width - room.cutoutWidth,
          updatePayload: (value) => ({ cutoutWidth: room.width - value }),
        };
      case "wall_6":
        return {
          linkedLabelKey: "depth",
          wallLength: room.depth,
          updatePayload: (value) => ({ depth: value }),
        };
      default:
        return null;
    }
  }

  return null;
}

function SelectedGroupEditor({
  locale,
  group,
  objects,
}: {
  locale: Locale;
  group: RoomObjectGroup;
  objects: RoomObject[];
}) {
  const randomizeSelectedObjects = useRoomStore((state) => state.randomizeSelectedObjects);
  const groupSelectedObjects = useRoomStore((state) => state.groupSelectedObjects);
  const ungroupSelectedObjects = useRoomStore((state) => state.ungroupSelectedObjects);
  const toggleSelectedObjectsLock = useRoomStore((state) => state.toggleSelectedObjectsLock);
  const deleteSelectedObjects = useRoomStore((state) => state.deleteSelectedObjects);

  return (
    <div className="mt-4 space-y-4 text-sm text-slate-300">
      <div className="rounded-xl border border-white/10 bg-[#101822] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-white">{group.label}</div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {`${objects.length} ${t(locale, "selectedItems")}`}
            </div>
          </div>
          <span className="rounded-full border border-white/10 bg-[#102234] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8cb9ff]">
            {t(locale, "group")}
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <ShortcutTile
            icon={Shuffle}
            label={t(locale, "randomizeSelection")}
            keyLabel={null}
            onClick={randomizeSelectedObjects}
          />
          <ShortcutTile
            icon={Lock}
            label={t(locale, "lockSelection")}
            keyLabel={null}
            onClick={() => toggleSelectedObjectsLock(true)}
          />
          <ShortcutTile
            icon={Scissors}
            label={t(locale, "ungroup")}
            keyLabel={null}
            onClick={ungroupSelectedObjects}
          />
          <ShortcutTile
            icon={Trash2}
            label={t(locale, "deleteSelection")}
            keyLabel={null}
            onClick={deleteSelectedObjects}
          />
          <ShortcutTile
            icon={Boxes}
            label={t(locale, "groupSelection")}
            keyLabel={null}
            onClick={groupSelectedObjects}
          />
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#101822] p-3">
        {objects.map((object) => (
          <div
            key={object.id}
            className="flex items-center justify-between border-b border-white/8 px-2 py-2 last:border-b-0"
          >
            <span className="font-medium text-white">
              {getLocalizedObjectLabel(locale, object)}
            </span>
            <span className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
              {getLocalizedCategoryLabel(locale, object.category)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SelectedObjectEditor({
  locale,
  object,
}: {
  locale: Locale;
  object: RoomObject;
}) {
  const toggleObjectLock = useRoomStore((state) => state.toggleObjectLock);
  const updateObjectProperties = useRoomStore((state) => state.updateObjectProperties);
  const deleteObject = useRoomStore((state) => state.deleteObject);
  const roomHeight = useRoomStore((state) => state.roomData.room.height);
  const mountHeight =
    typeof object.params.mountHeight === "number" ? object.params.mountHeight : 0;
  const maxObjectHeight = Math.max(0.05, Number((roomHeight - mountHeight).toFixed(2)));
  const objectLockLabel = object.locked ? t(locale, "unlock") : t(locale, "lock");

  const updateNumericProperty = (
    value: number,
    payload: Parameters<typeof updateObjectProperties>[1],
  ) => {
    if (Number.isNaN(value)) {
      return;
    }

    updateObjectProperties(object.id, payload);
  };

  return (
    <div className="mt-4 space-y-4 text-sm text-slate-300">
      <div className="rounded-xl border border-white/10 bg-[#101822] p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-semibold text-white">
              {getLocalizedObjectLabel(locale, object)}
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]">
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-400">
                {getLocalizedCategoryLabel(locale, object.category)}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 ${
                  object.movable
                    ? "bg-[#102234] text-[#8cb9ff]"
                    : "bg-[#25180f] text-[#f5c28b]"
                }`}
              >
                {object.movable ? t(locale, "movableObject") : t(locale, "fixedObject")}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              title={objectLockLabel}
              aria-label={objectLockLabel}
              onClick={() => toggleObjectLock(object.id)}
              className={`${compactActionButtonBase} ${
                object.locked ? lockedActionButtonClass : neutralActionButtonClass
              }`}
            >
              {object.locked ? (
                <Unlock className="h-3.5 w-3.5" />
              ) : (
                <Lock className="h-3.5 w-3.5" />
              )}
              {objectLockLabel}
            </button>
            <button
              type="button"
              title={t(locale, "deleteObject")}
              aria-label={t(locale, "deleteObject")}
              onClick={() => deleteObject(object.id)}
              className={`${compactActionButtonBase} ${dangerActionButtonClass}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t(locale, "deleteObject")}
            </button>
          </div>
        </div>

        <div className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-[#8cb9ff]">
          {t(locale, "placement")}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
              {t(locale, "positionX")}
            </span>
            <input
              type="number"
              step="0.05"
              value={object.position.x}
              disabled={object.locked}
              onChange={(event) =>
                updateNumericProperty(event.currentTarget.valueAsNumber, {
                  position: { x: event.currentTarget.valueAsNumber },
                })
              }
              className="w-full rounded-xl border border-white/10 bg-[#111924] px-3 py-2 text-white outline-none transition focus:border-[#4ea8ff] disabled:cursor-not-allowed disabled:opacity-45"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
              {t(locale, "positionZ")}
            </span>
            <input
              type="number"
              step="0.05"
              value={object.position.z}
              disabled={object.locked}
              onChange={(event) =>
                updateNumericProperty(event.currentTarget.valueAsNumber, {
                  position: { z: event.currentTarget.valueAsNumber },
                })
              }
              className="w-full rounded-xl border border-white/10 bg-[#111924] px-3 py-2 text-white outline-none transition focus:border-[#4ea8ff] disabled:cursor-not-allowed disabled:opacity-45"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
              {t(locale, "rotation")}
            </span>
            <input
              type="number"
              step="15"
              value={object.rotation}
              disabled={object.locked}
              onChange={(event) =>
                updateNumericProperty(event.currentTarget.valueAsNumber, {
                  rotation: event.currentTarget.valueAsNumber,
                })
              }
              className="w-full rounded-xl border border-white/10 bg-[#111924] px-3 py-2 text-white outline-none transition focus:border-[#4ea8ff] disabled:cursor-not-allowed disabled:opacity-45"
            />
          </label>
        </div>

        <div className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-[#8cb9ff]">
          {t(locale, "appearance")}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
              {t(locale, "color")}
            </span>
            <input
              type="color"
              value={object.color}
              disabled={object.locked}
              onChange={(event) =>
                updateObjectProperties(object.id, {
                  color: event.currentTarget.value,
                })
              }
              className="h-11 w-full rounded-xl border border-white/10 bg-[#111924] px-2 py-2 outline-none transition focus:border-[#4ea8ff] disabled:cursor-not-allowed disabled:opacity-45"
            />
          </label>
          <div className="rounded-xl border border-white/10 bg-[#111924] px-3 py-2">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
              {t(locale, "itemState")}
            </div>
            <div className="mt-1 font-medium text-white">
              {object.locked ? t(locale, "locked") : t(locale, "editable")}
            </div>
          </div>
        </div>

        <div className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-[#8cb9ff]">
          {t(locale, "dimensions")}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
              {t(locale, "width")}
            </span>
            <input
              type="number"
              step="0.05"
              min="0.05"
              value={object.dimensions.width}
              disabled={object.locked}
              onChange={(event) =>
                updateNumericProperty(event.currentTarget.valueAsNumber, {
                  dimensions: { width: event.currentTarget.valueAsNumber },
                })
              }
              className="w-full rounded-xl border border-white/10 bg-[#111924] px-3 py-2 text-white outline-none transition focus:border-[#4ea8ff] disabled:cursor-not-allowed disabled:opacity-45"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
              {t(locale, "depth")}
            </span>
            <input
              type="number"
              step="0.05"
              min="0.05"
              value={object.dimensions.depth}
              disabled={object.locked}
              onChange={(event) =>
                updateNumericProperty(event.currentTarget.valueAsNumber, {
                  dimensions: { depth: event.currentTarget.valueAsNumber },
                })
              }
              className="w-full rounded-xl border border-white/10 bg-[#111924] px-3 py-2 text-white outline-none transition focus:border-[#4ea8ff] disabled:cursor-not-allowed disabled:opacity-45"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
              {t(locale, "height")}
            </span>
            <input
              type="number"
              step="0.05"
              min="0.05"
              max={maxObjectHeight}
              value={object.dimensions.height}
              disabled={object.locked}
              onChange={(event) =>
                updateNumericProperty(event.currentTarget.valueAsNumber, {
                  dimensions: { height: event.currentTarget.valueAsNumber },
                })
              }
              className="w-full rounded-xl border border-white/10 bg-[#111924] px-3 py-2 text-white outline-none transition focus:border-[#4ea8ff] disabled:cursor-not-allowed disabled:opacity-45"
            />
          </label>
          <div className="rounded-xl border border-white/10 bg-[#111924] px-3 py-2">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
              {t(locale, "maxHeight")}
            </div>
            <div className="mt-1 font-medium text-white">{`${maxObjectHeight.toFixed(2)}m`}</div>
          </div>
        </div>
      </div>

      {object.locked ? (
        <div className="rounded-xl border border-[#6d4a29] bg-[#25180f] px-3 py-3 text-sm text-[#f5c28b]">
          {t(locale, "lockedEditHint")}
        </div>
      ) : null}
    </div>
  );
}

function OutlinerPanel({
  locale,
  selectedObjectId,
  selectedObjectIds,
  selectedGroupId,
  setSelectedObjectId,
  selectGroup,
}: {
  locale: Locale;
  selectedObjectId: string | null;
  selectedObjectIds: string[];
  selectedGroupId: string | null;
  setSelectedObjectId: (objectId: string) => void;
  selectGroup: (groupId: string) => void;
}) {
  const roomData = useRoomStore((state) => state.roomData);
  const groups = roomData.groups ?? [];
  const groupedObjectIds = new Set(groups.flatMap((group) => group.objectIds));
  const ungroupedObjects = roomData.objects.filter(
    (object) => !groupedObjectIds.has(object.id),
  );

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0d141d] p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8cb9ff]">
        <Boxes className="h-3.5 w-3.5" />
        {t(locale, "worldOutliner")}
      </div>
      <div className="mt-4 space-y-3">
        {groups.length ? (
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              {t(locale, "groups")}
            </div>
            {groups.map((group) => {
              const groupObjects = group.objectIds
                .map((objectId) => roomData.objects.find((object) => object.id === objectId))
                .filter((object): object is RoomObject => Boolean(object));
              const selected = selectedGroupId === group.id;

              return (
                <div
                  key={group.id}
                  className={`rounded-xl border ${
                    selected
                      ? "border-[#4ea8ff] bg-[#102234]"
                      : "border-white/10 bg-[#111924]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectGroup(group.id)}
                    className="flex w-full items-center justify-between px-3 py-3 text-left transition hover:text-white"
                  >
                    <div>
                      <div className="font-semibold text-white">{group.label}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        {`${groupObjects.length} ${t(locale, "selectedItems")}`}
                      </div>
                    </div>
                    <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-[#8cb9ff]">
                      {t(locale, "group")}
                    </span>
                  </button>
                  <div className="border-t border-white/8 px-2 pb-2">
                    {groupObjects.map((object) => (
                      <OutlinerObjectRow
                        key={object.id}
                        locale={locale}
                        object={object}
                        selected={
                          selectedObjectId === object.id ||
                          selectedObjectIds.includes(object.id)
                        }
                        onClick={() => setSelectedObjectId(object.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            {t(locale, "worldOutliner")}
          </div>
          {[...ungroupedObjects].map((object) => (
            <OutlinerObjectRow
              key={object.id}
              locale={locale}
              object={object}
              selected={
                selectedObjectId === object.id || selectedObjectIds.includes(object.id)
              }
              onClick={() => setSelectedObjectId(object.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function OutlinerObjectRow({
  locale,
  object,
  selected,
  onClick,
}: {
  locale: Locale;
  object: RoomObject;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mt-2 flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition ${
        selected
          ? "border-[#ff8c42] bg-[#2a1910] text-white"
          : "border-white/10 bg-[#0d141d] text-slate-300 hover:border-[#32516c] hover:text-white"
      }`}
    >
      <div>
        <div className="font-medium">{getLocalizedObjectLabel(locale, object)}</div>
        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
          {getLocalizedCategoryLabel(locale, object.category)}
        </div>
      </div>
      <span
        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          object.locked
            ? "bg-[#2f1b11] text-[#ffb16a]"
            : "bg-[#102234] text-[#8cb9ff]"
        }`}
      >
        {object.locked ? t(locale, "locked") : t(locale, "open")}
      </span>
    </button>
  );
}

function InventoryPanel({ locale }: { locale: Locale }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<InventoryCategoryId>("all");
  const hasQuery = query.trim().length > 0;
  const categoryCounts = useMemo(
    () =>
      inventoryCategories.map((category) => ({
        ...category,
        count:
          category.id === "all"
            ? uniqueInventoryCatalog.length
            : uniqueInventoryCatalog.filter((item) =>
                getInventoryCategoryIds(item).includes(category.id),
              ).length,
      })),
    [],
  );

  const filteredInventory = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const categoryFiltered =
      activeCategory === "all"
        ? uniqueInventoryCatalog
        : uniqueInventoryCatalog.filter((item) =>
            getInventoryCategoryIds(item).includes(activeCategory),
          );

    if (!normalizedQuery) {
      return categoryFiltered;
    }

    return categoryFiltered.filter((item) => {
      const localizedLabel = getLocalizedObjectLabel(locale, item).toLowerCase();
      const localizedCategory = getLocalizedCategoryLabel(locale, item.category).toLowerCase();
      const inventoryCategoryMatch = getInventoryCategoryIds(item).some((categoryId) =>
        (inventoryCategoryLabels.get(categoryId)?.[locale] ?? "")
          .toLowerCase()
          .includes(normalizedQuery),
      );
      const tagMatch = item.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));

      return (
        localizedLabel.includes(normalizedQuery) ||
        localizedCategory.includes(normalizedQuery) ||
        inventoryCategoryMatch ||
        tagMatch
      );
    });
  }, [activeCategory, locale, query]);
  const visibleInventory = useMemo(
    () =>
      hasQuery || activeCategory !== "all"
        ? filteredInventory
        : filteredInventory.filter((item) => !featuredInventoryIdSet.has(item.id)),
    [activeCategory, filteredInventory, hasQuery],
  );
  const showRecommended = !hasQuery && activeCategory === "all";

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0d141d] p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8cb9ff]">
        <Package2 className="h-3.5 w-3.5" />
        {t(locale, "inventory")}
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-400">{t(locale, "inventoryHint")}</p>

      <label className="mt-4 flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-[#111924] px-3 text-sm text-slate-300">
        <Search className="h-4 w-4 text-slate-500" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder={t(locale, "searchInventory")}
          className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
        />
      </label>

      <div className="-mx-1 mt-4 overflow-x-auto pb-2">
        <div className="flex min-w-max gap-2 px-1">
          {categoryCounts.map((category) => {
            const active = activeCategory === category.id;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                aria-pressed={active}
                className={`inline-flex h-8 items-center gap-2 rounded-lg border px-2.5 text-xs font-semibold transition ${
                  active
                    ? "border-[#4ea8ff] bg-[#102234] text-white"
                    : "border-white/10 bg-[#111924] text-slate-300 hover:border-[#32516c] hover:text-white"
                }`}
              >
                {category.label[locale]}
                <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-slate-300">
                  {category.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {showRecommended ? (
        <div className="mt-5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            {t(locale, "recommended")}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {uniqueFeaturedInventory.map((item) => (
              <InventoryCard key={item.id} item={item} locale={locale} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5">
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          {t(locale, "inventory")}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {visibleInventory.map((item) => (
            <InventoryCard key={item.id} item={item} locale={locale} />
          ))}
        </div>
      </div>
    </section>
  );
}

function InventoryCard({
  item,
  locale,
}: {
  item: InventoryTemplate;
  locale: Locale;
}) {
  const categoryLabel =
    item.previewType === "wall"
      ? inventoryCategoryLabels.get("structure")?.[locale] ?? getLocalizedCategoryLabel(locale, item.category)
      : getLocalizedCategoryLabel(locale, item.category);

  return (
    <button
      type="button"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "copy";
        const dragImage = document.createElement("canvas");
        dragImage.width = 1;
        dragImage.height = 1;
        event.dataTransfer.setDragImage(dragImage, 0, 0);
        event.dataTransfer.setData(INVENTORY_DRAG_MIME, item.id);
        event.dataTransfer.setData("text/plain", item.id);
        window.dispatchEvent(
          new CustomEvent("desain:inventory-drag-start", { detail: item.id }),
        );
      }}
      onDragEnd={() => {
        window.dispatchEvent(new CustomEvent("desain:inventory-drag-end"));
      }}
      className="rounded-xl border border-white/10 bg-[#111924] p-3 text-left transition hover:border-[#4ea8ff] hover:bg-[#132030]"
    >
      <InventoryPreview item={item} />
      <div className="mt-3 flex items-start justify-between gap-2">
        <div>
          <div className="font-medium text-white">{getLocalizedObjectLabel(locale, item)}</div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">
            {categoryLabel}
          </div>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
          {`${item.dimensions.width.toFixed(1)} x ${item.dimensions.depth.toFixed(1)}m`}
        </span>
      </div>
    </button>
  );
}

function RandomLayoutsPanel({ locale }: { locale: Locale }) {
  const options = useRoomStore((state) => state.randomLayoutOptions);
  const activeOptionId = useRoomStore((state) => state.activeRandomLayoutOptionId);
  const sourceSignature = useRoomStore((state) => state.randomLayoutSourceSignature);
  const optionsVisible = useRoomStore((state) => state.randomLayoutOptionsVisible);
  const applyRandomLayoutOption = useRoomStore((state) => state.applyRandomLayoutOption);
  const randomizeLayout = useRoomStore((state) => state.randomizeLayout);
  const clearRandomLayoutOptions = useRoomStore((state) => state.clearRandomLayoutOptions);
  const roomData = useRoomStore((state) => state.roomData);
  const validationWarnings = useRoomStore((state) => state.validationWarnings);
  const visibleOptions = optionsVisible ? options : [];
  const cleanCount = visibleOptions.filter((option) => option.warnings.length === 0).length;
  const openBoundaryWarning =
    validationWarnings.find((warning) => warning.code === "room_open_outline") ?? null;
  const helperText =
    locale === "en"
      ? "Layout generation runs a fast wall/floor sweep, keeps the same cached list while the room stays unchanged, and skips tiny shifted copies."
      : "Düzen oluşturma hızlı duvar/zemin taraması yapar; oda değişmediğinde aynı listeyi korur ve küçük kaydırılmış kopyaları atlar.";

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0d141d] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8cb9ff]">
            <Shuffle className="h-3.5 w-3.5" />
            {t(locale, "randomLayouts")}
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            {t(locale, "randomLayoutsHint")}
          </p>
        </div>
        <button
          type="button"
          disabled={Boolean(openBoundaryWarning)}
          onClick={randomizeLayout}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#1f4b65] bg-[#102234] px-3 text-xs font-semibold text-[#8cb9ff] transition hover:border-[#4ea8ff] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          <RefreshCw className="h-4 w-4" />
          {t(locale, "randomizeRoom")}
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-[#111924] px-3 py-3 text-xs leading-5 text-slate-400">
        {helperText}
      </div>

      {openBoundaryWarning ? (
        <div className="mt-4 rounded-xl border border-[#6e2424] bg-[#2a1313] px-3 py-3 text-sm leading-6 text-[#ff9b9b]">
          {formatWarning(locale, openBoundaryWarning, roomData)}
        </div>
      ) : null}

      {visibleOptions.length ? (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2">
              <div className="font-semibold text-white">{visibleOptions.length}</div>
              <div className="mt-1 uppercase tracking-[0.16em] text-slate-500">
                {locale === "en" ? "Options" : "Seçenek"}
              </div>
            </div>
            <div className="rounded-xl border border-[#24405a] bg-[#102234] px-2 py-2">
              <div className="font-semibold text-[#8cb9ff]">{cleanCount}</div>
              <div className="mt-1 uppercase tracking-[0.16em] text-slate-500">
                {t(locale, "noWarningsShort")}
              </div>
            </div>
            <button
              type="button"
              onClick={clearRandomLayoutOptions}
              className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-slate-300 transition hover:border-[#32516c] hover:text-white"
            >
              <div className="font-semibold">{t(locale, "closePanel")}</div>
              <div className="mt-1 uppercase tracking-[0.16em] text-slate-500">
                {locale === "en" ? "List" : "Liste"}
              </div>
            </button>
          </div>

          {visibleOptions.map((option, index) => {
            const errorCount = option.warnings.filter(
              (warning) => warning.level === "error",
            ).length;
            const warningCount = option.warnings.length - errorCount;
            const active = option.id === activeOptionId;
            const optionLabel =
              locale === "tr" ? `Düzen ${index + 1}` : `Layout ${index + 1}`;
            const statusText = errorCount
              ? `${errorCount} ${t(locale, "errorsShort")}`
              : warningCount
                ? `${warningCount} ${t(locale, "warningsShort")}`
                : t(locale, "noWarningsShort");

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => applyRandomLayoutOption(option.id)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  active
                    ? "border-[#4ea8ff] bg-[#102234] text-white"
                    : "border-white/10 bg-[#111924] text-slate-300 hover:border-[#32516c] hover:text-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 font-semibold">
                      {active ? <Check className="h-4 w-4 text-[#8cb9ff]" /> : null}
                      {optionLabel}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                      {`${roomData.objects.length} ${
                        locale === "en" ? "items" : "öğe"
                      } / #${index + 1}`}
                    </div>
                  </div>
                  <span
                    className={`rounded-lg border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                      errorCount
                        ? "border-[#6e2424] bg-[#2a1313] text-[#ff9b9b]"
                        : warningCount
                          ? "border-[#6d4a29] bg-[#25180f] text-[#ffcc8a]"
                          : "border-[#24405a] bg-[#102234] text-[#8cb9ff]"
                    }`}
                  >
                    {statusText}
                  </span>
                </div>
                {option.warnings[0] ? (
                  <div className="mt-3 rounded-lg border border-[#6d4a29] bg-[#25180f] px-3 py-2 text-xs leading-5 text-[#f5c28b]">
                    {formatWarning(locale, option.warnings[0], {
                      ...roomData,
                      objects: option.objects,
                    })}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm leading-6 text-slate-400">
          {sourceSignature && optionsVisible
            ? locale === "en"
              ? "No clean random layout could be generated for this exact scene. Adjust crowded or locked items, then request a fresh list."
              : "Bu sahne için temiz rastgele düzen üretilemedi. Sıkışık veya kilitli eşyaları düzenleyip yeniden liste iste."
            : sourceSignature
              ? locale === "en"
                ? "Layout list hidden. Press Generate Layouts to reopen the same cached list."
                : "Düzen listesi gizlendi. Aynı kayıtlı listeyi açmak için Düzenleri Oluştur'a bas."
            : locale === "en"
              ? "No generated layout list yet. Use Generate Layouts to calculate clean options for the current scene."
              : "Henüz oluşturulmuş düzen listesi yok. Mevcut sahneye göre temiz seçenekleri hesaplamak için Düzenleri Oluştur'a bas."}
        </div>
      )}
    </section>
  );
}

function ValidationPanel({
  locale,
  validationWarnings,
  setSelectedObjectId,
}: {
  locale: Locale;
  validationWarnings: ReturnType<typeof useRoomStore.getState>["validationWarnings"];
  setSelectedObjectId: (objectId: string) => void;
}) {
  const roomData = useRoomStore((state) => state.roomData);

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0d141d] p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ffb16a]">
        <AlertTriangle className="h-3.5 w-3.5" />
        {t(locale, "validate")}
      </div>
      {validationWarnings.length ? (
        <ul className="mt-4 space-y-3 text-sm leading-6 text-[#f5c28b]">
          {validationWarnings.map((warning, index) => (
            <li key={`${warning.code}-${warning.objectId ?? "none"}-${index}`}>
              <button
                type="button"
                onClick={() => {
                  if (warning.objectId) {
                    setSelectedObjectId(warning.objectId);
                  }
                }}
                className="w-full rounded-xl border border-[#6d4a29] bg-[#25180f] px-3 py-3 text-left transition hover:border-[#ffb16a] hover:text-white"
              >
                {formatWarning(locale, warning, roomData)}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 rounded-xl border border-[#24405a] bg-[#111924] px-3 py-3 text-sm text-[#8cb9ff]">
          {t(locale, "noValidationIssues")}
        </div>
      )}
    </section>
  );
}

function ShortcutActionsPanel({ locale }: { locale: Locale }) {
  const sections = [
    {
      title: locale === "en" ? "Modes" : "Modlar",
      items: [
        {
          icon: BoxSelect,
          label: t(locale, "selectMode"),
          keyLabel: "Q",
          description:
            locale === "en"
              ? "Select objects, walls, doors, windows, and radiators."
              : "Nesne, duvar, kapı, pencere ve kalorifer seçer.",
        },
        {
          icon: Move3d,
          label: t(locale, "moveMode"),
          keyLabel: "W",
          description:
            locale === "en"
              ? "Move floor items on the floor plane; wall items stay on their wall."
              : "Zemin öğelerini zeminde taşır; duvar öğeleri duvarında kalır.",
        },
        {
          icon: RefreshCw,
          label: t(locale, "rotateMode"),
          keyLabel: "E",
          description:
            locale === "en"
              ? "Rotate the selected editable item."
              : "Seçili düzenlenebilir öğeyi döndürür.",
        },
      ],
    },
    {
      title: locale === "en" ? "History" : "Geçmiş",
      items: [
        {
          icon: Undo2,
          label: t(locale, "undo"),
          keyLabel: "Ctrl/Cmd + Z",
          description:
            locale === "en"
              ? "Return to the previous edit."
              : "Bir önceki düzenlemeye döner.",
        },
        {
          icon: RotateCw,
          label: t(locale, "redo"),
          keyLabel: "Ctrl/Cmd + Y",
          description:
            locale === "en"
              ? "Reapply the last undone edit."
              : "Geri alınan son düzenlemeyi yeniden uygular.",
        },
      ],
    },
    {
      title: locale === "en" ? "Clipboard" : "Pano",
      items: [
        {
          icon: Copy,
          label: t(locale, "copyAction"),
          keyLabel: "Ctrl/Cmd + C",
          description:
            locale === "en"
              ? "Copy the active object."
              : "Aktif öğeyi kopyalar.",
        },
        {
          icon: ClipboardPaste,
          label: t(locale, "pasteAction"),
          keyLabel: "Ctrl/Cmd + V",
          description:
            locale === "en"
              ? "Paste the copied object with a small offset."
              : "Kopyalanan öğeyi küçük bir kaydırmayla yapıştırır.",
        },
        {
          icon: Scissors,
          label: t(locale, "cutAction"),
          keyLabel: "Ctrl/Cmd + X",
          description:
            locale === "en"
              ? "Cut the active object to the clipboard."
              : "Aktif öğeyi kesip panoya alır.",
        },
      ],
    },
    {
      title: locale === "en" ? "Selection" : "Seçim",
      items: [
        {
          icon: Boxes,
          label: t(locale, "groupSelection"),
          keyLabel: "Ctrl/Cmd + G",
          description:
            locale === "en"
              ? "Create a group from the selected objects."
              : "Seçili öğelerden grup oluşturur.",
        },
        {
          icon: Scissors,
          label: t(locale, "ungroup"),
          keyLabel: "Shift + Ctrl/Cmd + G",
          description:
            locale === "en"
              ? "Ungroup the selected group."
              : "Seçili grubu çözer.",
        },
        {
          icon: BoxSelect,
          label: t(locale, "multiSelectHint"),
          keyLabel: t(locale, "multiSelectShortcut"),
          description:
            locale === "en"
              ? "Hold the modifier and click multiple objects to open the selection menu."
              : "Çoklu seçim menüsü için tuşa basılı tutup nesnelere tıkla.",
        },
        {
          icon: Lock,
          label: t(locale, "lockSelection"),
          keyLabel: locale === "en" ? "Menu" : "Menü",
          description:
            locale === "en"
              ? "Lock or unlock the selected objects from the contextual menu."
              : "Seçili öğeleri bağlam menüsünden kilitler ya da açar.",
        },
        {
          icon: Trash2,
          label: t(locale, "deleteSelection"),
          keyLabel: "Delete",
          description:
            locale === "en"
              ? "Delete the selected object or multi-selection."
              : "Seçili öğeyi veya çoklu seçimi siler.",
        },
      ],
    },
    {
      title: locale === "en" ? "Scene" : "Sahne",
      items: [
        {
          icon: Save,
          label: t(locale, "saveRoom"),
          keyLabel: locale === "en" ? "Top bar" : "Üst bar",
          description:
            locale === "en"
              ? "Save the current room layout as the restore point."
              : "Mevcut oda düzenini geri dönüş noktası olarak kaydeder.",
        },
        {
          icon: Shuffle,
          label: t(locale, "randomizeRoom"),
          keyLabel: locale === "en" ? "Top bar" : "Üst bar",
          description:
            locale === "en"
              ? "Generate fast layout options while preserving fixed items."
              : "Sabit öğeleri koruyarak hızlı düzen seçenekleri üretir.",
        },
        {
          icon: Ruler,
          label: t(locale, "roomSettings"),
          keyLabel: locale === "en" ? "Panel" : "Panel",
          description:
            locale === "en"
              ? "Edit room size, shape, height, and wall pivots."
              : "Oda ölçüsü, şekli, yüksekliği ve duvar pivotlarını düzenler.",
        },
        {
          icon: Package2,
          label: t(locale, "inventory"),
          keyLabel: locale === "en" ? "Panel" : "Panel",
          description:
            locale === "en"
              ? "Drag floor and wall items from the catalog."
              : "Katalogdan zemin ve duvar öğelerini sürükler.",
        },
        {
          icon: AlertTriangle,
          label: t(locale, "validate"),
          keyLabel: locale === "en" ? "Live" : "Canlı",
          description:
            locale === "en"
              ? "Warnings appear in the scene and disappear when fixed."
              : "Uyarılar sahnede görünür ve sorun çözülünce kaybolur.",
        },
      ],
    },
  ];

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0d141d] p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8cb9ff]">
        <Scissors className="h-3.5 w-3.5" />
        {t(locale, "shortcuts")}
      </div>
      <div className="mt-4 space-y-5">
        {sections.map((section) => (
          <div key={section.title}>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              {section.title}
            </div>
            <div className="grid gap-2">
              {section.items.map((item) => (
                <ShortcutHelpTile
                  key={`${section.title}-${item.label}-${item.keyLabel}`}
                  icon={item.icon}
                  label={item.label}
                  keyLabel={item.keyLabel}
                  description={item.description}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ShortcutTile({
  icon: Icon,
  label,
  keyLabel,
  onClick,
  disabled = false,
}: {
  icon: typeof Move3d;
  label: string;
  keyLabel: string | null;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-9 items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#111924] px-3 py-2 text-left text-sm text-slate-200 transition hover:border-[#32516c] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
    >
      <span className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#8cb9ff]" />
        <span>{label}</span>
      </span>
      {keyLabel ? (
        <span className="rounded-md border border-white/10 bg-[#0b1016] px-2 py-1 text-[11px] font-semibold text-[#8cb9ff]">
          {keyLabel}
        </span>
      ) : null}
    </button>
  );
}

function ShortcutHelpTile({
  icon: Icon,
  label,
  keyLabel,
  description,
}: {
  icon: typeof Move3d;
  label: string;
  keyLabel: string;
  description: string;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-lg border border-white/10 bg-[#111924] px-3 py-2.5 text-sm text-slate-200">
      <Icon className="mt-0.5 h-4 w-4 text-[#8cb9ff]" />
      <div>
        <div className="font-medium text-white">{label}</div>
        <div className="mt-1 text-xs leading-5 text-slate-400">{description}</div>
      </div>
      <span className="rounded-md border border-white/10 bg-[#0b1016] px-2 py-1 text-[11px] font-semibold text-[#8cb9ff]">
        {keyLabel}
      </span>
    </div>
  );
}
