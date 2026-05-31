"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  Lock,
  Move3d,
  Package2,
  PanelRight,
  Ruler,
  Scissors,
  Search,
  Trash2,
} from "lucide-react";
import {
  featuredInventory,
  inventoryCatalog,
  INVENTORY_DRAG_MIME,
} from "@/lib/room/inventoryCatalog";
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
import type { Opening, RoomObject, RoomShape } from "@/types/room";
import { InventoryPreview } from "./InventoryPreview";

const sidebarTabs: Array<{
  id: SidebarTab;
  labelKey: MessageKey;
  icon: typeof Move3d;
}> = [
  { id: "details", labelKey: "details", icon: Move3d },
  { id: "outliner", labelKey: "outliner", icon: Boxes },
  { id: "inventory", labelKey: "inventory", icon: Package2 },
  { id: "validation", labelKey: "validate", icon: AlertTriangle },
];

export function Sidebar() {
  const locale = useUIStore((state) => state.locale);
  const activeSidebarTab = useUIStore((state) => state.activeSidebarTab);
  const setActiveSidebarTab = useUIStore((state) => state.setActiveSidebarTab);
  const selectedStructure = useUIStore((state) => state.selectedStructure);
  const setSelectedStructure = useUIStore((state) => state.setSelectedStructure);
  const roomData = useRoomStore((state) => state.roomData);
  const selectedObjectId = useRoomStore((state) => state.selectedObjectId);
  const setSelectedObjectId = useRoomStore((state) => state.setSelectedObjectId);
  const validationWarnings = useRoomStore((state) => state.validationWarnings);

  const selectedObject =
    roomData.objects.find((object) => object.id === selectedObjectId) ?? null;
  const selectedOpening =
    selectedStructure?.type === "opening"
      ? roomData.room.openings.find((opening) => opening.id === selectedStructure.id) ?? null
      : null;

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
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "border-[#4ea8ff] bg-[#102234] text-white"
                    : "border-white/10 bg-[#0d141d] text-slate-300 hover:border-[#32516c] hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t(locale, tab.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="scroll-area min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {activeSidebarTab === "details" ? (
          <div className="space-y-4">
            <RoomSettingsEditor locale={locale} />
            <section className="rounded-2xl border border-white/10 bg-[#0d141d] p-4">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ffb16a]">
                <Move3d className="h-3.5 w-3.5" />
                {t(locale, "objectDetails")}
              </div>
              {selectedObject ? (
                <SelectedObjectEditor object={selectedObject} locale={locale} />
              ) : selectedStructure ? (
                <SelectedStructureCard
                  locale={locale}
                  selectedStructure={selectedStructure}
                  selectedOpening={selectedOpening}
                />
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm leading-6 text-slate-400">
                  {t(locale, "selectObjectHint")}
                </div>
              )}
            </section>
          </div>
        ) : null}

        {activeSidebarTab === "outliner" ? (
          <OutlinerPanel
            locale={locale}
            selectedObjectId={selectedObjectId}
            setSelectedObjectId={(objectId) => {
              setSelectedStructure(null);
              setSelectedObjectId(objectId);
            }}
          />
        ) : null}

        {activeSidebarTab === "inventory" ? <InventoryPanel locale={locale} /> : null}

        {activeSidebarTab === "validation" ? (
          <ValidationPanel
            locale={locale}
            validationWarnings={validationWarnings}
            setSelectedObjectId={setSelectedObjectId}
          />
        ) : null}
      </div>

      <ShortcutFooter locale={locale} />
    </aside>
  );
}

function SelectedStructureCard({
  locale,
  selectedStructure,
  selectedOpening,
}: {
  locale: Locale;
  selectedStructure: NonNullable<ReturnType<typeof useUIStore.getState>["selectedStructure"]>;
  selectedOpening: Opening | null;
}) {
  const title =
    selectedStructure.type === "wall"
      ? selectedStructure.id
      : selectedOpening
        ? `${getLocalizedOpeningType(locale, selectedOpening.type)} / ${selectedOpening.id}`
        : selectedStructure.id;

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
      <div className="text-lg font-semibold text-white">{title}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
        {selectedStructure.type === "wall" ? t(locale, "wall") : t(locale, "details")}
      </div>
      <p className="mt-3 leading-6 text-slate-400">
        {selectedStructure.type === "wall"
          ? locale === "en"
            ? "Adjust room shape and room measurements above to reshape this wall."
            : "Bu duvarı yeniden biçimlendirmek için yukarıdaki oda tipi ve ölçü alanlarını kullan."
          : locale === "en"
            ? "Edit this opening from the room settings card above."
            : "Bu açıklığı yukarıdaki oda ayarları kartından düzenleyebilirsin."}
      </p>
    </div>
  );
}

function RoomSettingsEditor({ locale }: { locale: Locale }) {
  const roomData = useRoomStore((state) => state.roomData);
  const updateRoomProperties = useRoomStore((state) => state.updateRoomProperties);
  const updateOpening = useRoomStore((state) => state.updateOpening);
  const selectedStructure = useUIStore((state) => state.selectedStructure);

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
              })
            }
            className="w-full rounded-xl border border-white/10 bg-[#111924] px-3 py-2 text-white outline-none transition focus:border-[#4ea8ff]"
          >
            <option value="rectangle">{t(locale, "rectangle")}</option>
            <option value="square">{t(locale, "square")}</option>
            <option value="l_shape">{t(locale, "lShape")}</option>
          </select>
        </label>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-slate-500">{t(locale, "objectCount")}</div>
          <div className="mt-1 font-semibold text-white">{roomData.objects.length}</div>
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

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-300">
        {roomData.room.walls.map((wall) => {
          const selected =
            selectedStructure?.type === "wall" && selectedStructure.id === wall.id;
          const length = Math.hypot(
            wall.to[0] - wall.from[0],
            wall.to[1] - wall.from[1],
          );

          return (
            <div
              key={wall.id}
              className={`rounded-xl border p-3 ${
                selected
                  ? "border-[#4ea8ff] bg-[#102234]"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {wall.id}
              </div>
              <div className="mt-1 font-semibold text-white">{`${length.toFixed(2)}m`}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 space-y-3">
        {roomData.room.openings.map((opening) => (
          <OpeningEditor
            key={opening.id}
            locale={locale}
            opening={opening}
            wallIds={roomData.room.walls.map((wall) => wall.id)}
            selected={
              selectedStructure?.type === "opening" &&
              selectedStructure.id === opening.id
            }
            onChange={(payload) => updateOpening(opening.id, payload)}
          />
        ))}
      </div>
    </section>
  );
}

function OpeningEditor({
  locale,
  opening,
  wallIds,
  selected,
  onChange,
}: {
  locale: Locale;
  opening: Opening;
  wallIds: string[];
  selected: boolean;
  onChange: (payload: Partial<Pick<Opening, "wallId" | "position" | "width">>) => void;
}) {
  return (
    <div
      className={`rounded-xl border p-3 text-sm text-slate-300 ${
        selected
          ? "border-[#4ea8ff] bg-[#102234]"
          : "border-white/10 bg-white/5"
      }`}
    >
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {`${opening.type} / ${opening.id}`}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-1">
          <span className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            {t(locale, "wall")}
          </span>
          <select
            value={opening.wallId}
            onChange={(event) => onChange({ wallId: event.target.value })}
            className="w-full rounded-lg border border-white/10 bg-[#111924] px-2 py-2 text-white outline-none transition focus:border-[#4ea8ff]"
          >
            {wallIds.map((wallId) => (
              <option key={wallId} value={wallId}>
                {wallId}
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
            onChange={(event) => onChange({ position: event.currentTarget.valueAsNumber })}
            className="w-full rounded-lg border border-white/10 bg-[#111924] px-2 py-2 text-white outline-none transition focus:border-[#4ea8ff]"
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
            onChange={(event) => onChange({ width: event.currentTarget.valueAsNumber })}
            className="w-full rounded-lg border border-white/10 bg-[#111924] px-2 py-2 text-white outline-none transition focus:border-[#4ea8ff]"
          />
        </label>
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
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-white">
              {getLocalizedObjectLabel(locale, object)}
            </div>
            <div className="text-xs uppercase tracking-[0.22em] text-slate-500">
              {`${t(locale, "category")}: ${getLocalizedCategoryLabel(locale, object.category)}`}
            </div>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              object.locked
                ? "bg-[#2a1910] text-[#ffb16a]"
                : "bg-[#102234] text-[#8cb9ff]"
            }`}
          >
            {object.locked ? t(locale, "locked") : t(locale, "editable")}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
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
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => toggleObjectLock(object.id)}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#111924] px-3 py-2 font-medium text-slate-200 transition hover:border-[#32516c] hover:text-white"
        >
          <Lock className="h-4 w-4" />
          {object.locked ? t(locale, "unlock") : t(locale, "lock")}
        </button>
        <button
          type="button"
          onClick={() => deleteObject(object.id)}
          className="inline-flex items-center gap-2 rounded-xl border border-[#6e2a2a] bg-[#2a1313] px-3 py-2 font-medium text-[#ff8e8e] transition hover:border-[#ff5a5a] hover:text-white"
        >
          <Trash2 className="h-4 w-4" />
          {t(locale, "deleteObject")}
        </button>
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
  setSelectedObjectId,
}: {
  locale: Locale;
  selectedObjectId: string | null;
  setSelectedObjectId: (objectId: string) => void;
}) {
  const roomData = useRoomStore((state) => state.roomData);

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0d141d] p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8cb9ff]">
        <Boxes className="h-3.5 w-3.5" />
        {t(locale, "worldOutliner")}
      </div>
      <div className="mt-4 space-y-2">
        {roomData.objects.map((object) => (
          <button
            key={object.id}
            type="button"
            onClick={() => setSelectedObjectId(object.id)}
            className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition ${
              selectedObjectId === object.id
                ? "border-[#ff8c42] bg-[#2a1910] text-white"
                : "border-white/10 bg-[#111924] text-slate-300 hover:border-[#32516c] hover:text-white"
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
        ))}
      </div>
    </section>
  );
}

function InventoryPanel({ locale }: { locale: Locale }) {
  const [query, setQuery] = useState("");

  const filteredInventory = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return inventoryCatalog;
    }

    return inventoryCatalog.filter((item) => {
      const localizedLabel = getLocalizedObjectLabel(locale, item).toLowerCase();
      const localizedCategory = getLocalizedCategoryLabel(locale, item.category).toLowerCase();
      const tagMatch = item.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));

      return (
        localizedLabel.includes(normalizedQuery) ||
        localizedCategory.includes(normalizedQuery) ||
        tagMatch
      );
    });
  }, [locale, query]);

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0d141d] p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8cb9ff]">
        <Package2 className="h-3.5 w-3.5" />
        {t(locale, "inventory")}
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-400">{t(locale, "inventoryHint")}</p>

      <label className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-[#111924] px-3 py-2 text-sm text-slate-300">
        <Search className="h-4 w-4 text-slate-500" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder={t(locale, "searchInventory")}
          className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
        />
      </label>

      {!query ? (
        <div className="mt-5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            {t(locale, "recommended")}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {featuredInventory.map((item) => (
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
          {filteredInventory.map((item) => (
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
  item: (typeof inventoryCatalog)[number];
  locale: Locale;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData(INVENTORY_DRAG_MIME, item.id);
      }}
      className="rounded-2xl border border-white/10 bg-[#111924] p-3 text-left transition hover:border-[#4ea8ff] hover:bg-[#132030]"
    >
      <InventoryPreview item={item} />
      <div className="mt-3 flex items-start justify-between gap-2">
        <div>
          <div className="font-medium text-white">{getLocalizedObjectLabel(locale, item)}</div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">
            {getLocalizedCategoryLabel(locale, item.category)}
          </div>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
          {`${item.dimensions.width.toFixed(1)} x ${item.dimensions.depth.toFixed(1)}m`}
        </span>
      </div>
    </button>
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

function ShortcutFooter({ locale }: { locale: Locale }) {
  const shortcuts = [
    `Q ${t(locale, "selectMode")}`,
    `W ${t(locale, "moveMode")}`,
    `E ${t(locale, "rotateMode")}`,
    `Ctrl/Cmd+Z ${t(locale, "undo")}`,
    `Ctrl/Cmd+Y ${t(locale, "redo")}`,
    `Ctrl/Cmd+C ${t(locale, "copyAction")}`,
    `Ctrl/Cmd+V ${t(locale, "pasteAction")}`,
    `Ctrl/Cmd+X ${t(locale, "cutAction")}`,
    `Delete ${t(locale, "removeAction")}`,
  ];

  return (
    <div className="shrink-0 border-t border-white/8 px-4 py-4">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8cb9ff]">
        <Scissors className="h-3.5 w-3.5" />
        {t(locale, "shortcuts")}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
        {shortcuts.map((shortcut) => (
          <div
            key={shortcut}
            className="rounded-xl border border-white/10 bg-[#111924] px-3 py-2"
          >
            {shortcut}
          </div>
        ))}
      </div>
    </div>
  );
}
