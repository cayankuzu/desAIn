import {
  formatEditorStatus,
  getLocalizedObjectLabel,
  getLocalizedOpeningType,
  getLocalizedRoomLabel,
  t,
  type EditorStatus,
  type Locale,
} from "@/lib/i18n/translations";
import type { SelectedStructure } from "@/store/uiStore";
import type { RoomData } from "@/types/room";

export type ToastTone = "info" | "success" | "warning";

export interface EditorToast {
  title: string;
  detail?: string;
  tone?: ToastTone;
}

function getSelectedObjectLabel(
  locale: Locale,
  roomData: RoomData,
  objectId: string | null | undefined,
) {
  if (!objectId) return null;
  const object = roomData.objects.find((entry) => entry.id === objectId) ?? null;
  return object ? getLocalizedObjectLabel(locale, object) : null;
}

function getSelectedStructureLabel(
  locale: Locale,
  roomData: RoomData,
  selectedStructure: SelectedStructure,
) {
  if (!selectedStructure) return null;

  if (selectedStructure.type === "wall") {
    const index = roomData.room.walls.findIndex((wall) => wall.id === selectedStructure.id);
    if (index < 0) return null;
    return locale === "en" ? `Wall ${index + 1}` : `Duvar ${index + 1}`;
  }

  const index = roomData.room.openings.findIndex((opening) => opening.id === selectedStructure.id);
  if (index < 0) return null;

  const opening = roomData.room.openings[index];
  const openingType = getLocalizedOpeningType(locale, opening.type);
  return `${openingType} ${index + 1}`;
}

export function buildEditorStatusToast(params: {
  locale: Locale;
  status: EditorStatus;
  roomData: RoomData;
  selectedObjectId: string | null;
  selectedObjectIds: string[];
  selectedGroupId: string | null;
  selectedStructure: SelectedStructure;
}): EditorToast | null {
  const {
    locale,
    status,
    roomData,
    selectedObjectId,
    selectedObjectIds,
    selectedGroupId,
    selectedStructure,
  } = params;

  const title = formatEditorStatus(locale, status, roomData);
  if (!title) {
    return null;
  }

  let detail: string | undefined;
  let tone: ToastTone = "info";

  switch (status.key) {
    case "roomLoaded":
      detail = getLocalizedRoomLabel(locale, roomData.room);
      tone = "success";
      break;
    case "roomPresetApplied":
      detail = `${roomData.room.width}m × ${roomData.room.depth}m`;
      tone = "success";
      break;
    case "selectionUpdated":
      if (selectedStructure) {
        detail = getSelectedStructureLabel(locale, roomData, selectedStructure) ?? undefined;
      } else if (selectedGroupId) {
        detail =
          locale === "en"
            ? `${selectedObjectIds.length} items in group`
            : `${selectedObjectIds.length} öğe grupta`;
      } else if (selectedObjectIds.length > 1) {
        detail =
          locale === "en"
            ? `${selectedObjectIds.length} items selected`
            : `${selectedObjectIds.length} öğe seçili`;
      } else {
        detail = getSelectedObjectLabel(locale, roomData, selectedObjectId) ?? undefined;
      }
      break;
    case "selectionDeleted":
      detail =
        locale === "en"
          ? "Selection removed from the scene"
          : "Seçim sahneden kaldırıldı";
      tone = "warning";
      break;
    case "transformBlockedLocked":
      detail =
        locale === "en"
          ? "Unlock the selected item before using move or rotate."
          : "Tasi veya dondur icin once secili ogenin kilidini ac.";
      tone = "warning";
      break;
    case "objectAdded":
    case "objectUpdated":
    case "objectPropertiesUpdated":
    case "objectRotated":
    case "objectLocked":
    case "objectUnlocked":
      detail = getSelectedObjectLabel(locale, roomData, selectedObjectId) ?? undefined;
      break;
    case "wallUpdated":
    case "openingUpdated":
    case "wallSplit":
      detail = getSelectedStructureLabel(locale, roomData, selectedStructure) ?? undefined;
      break;
    case "undoApplied":
    case "redoApplied":
      detail =
        locale === "en"
          ? "History updated"
          : "Geçmiş güncellendi";
      break;
    default:
      detail = undefined;
      break;
  }

  return {
    title,
    detail,
    tone,
  };
}

export function buildStructureToast(params: {
  locale: Locale;
  roomData: RoomData;
  selectedStructure: SelectedStructure;
}): EditorToast | null {
  const { locale, roomData, selectedStructure } = params;
  if (!selectedStructure) return null;

  const label = getSelectedStructureLabel(locale, roomData, selectedStructure);
  if (!label) return null;

  return {
    title: `${label} ${t(locale, "selectedSuffix")}`,
    detail:
      selectedStructure.type === "wall"
        ? locale === "en"
          ? "Wall editing active"
          : "Duvar düzenleme aktif"
        : locale === "en"
          ? "Opening editing active"
          : "Açıklık düzenleme aktif",
    tone: "info",
  };
}
