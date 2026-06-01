import { getLocalizedOpeningType } from "@/lib/i18n/translations";
import type { RoomData } from "@/types/room";
import { getSemanticObjectMotion, getSemanticObjectPosition } from "@/lib/scene/axes";

export type SceneSelectionContext = {
  objectId?: string | null;
  objectIds?: string[];
  groupId?: string | null;
  structure?:
    | {
        type: "wall" | "opening";
        id: string;
      }
    | null;
} | null;

const formatNumber = (value: number) => Number(value.toFixed(2)).toFixed(2);

export function buildSceneSelectionSummary(
  roomData: RoomData,
  selection: SceneSelectionContext,
  locale: "tr" | "en" = "tr",
) {
  if (!selection) {
    return "";
  }

  const lines: string[] = [];

  if (selection.objectId) {
    const object = roomData.objects.find((entry) => entry.id === selection.objectId) ?? null;
    if (object) {
      const semanticPosition = getSemanticObjectPosition(object);
      const motion = getSemanticObjectMotion(object);
      lines.push(`${locale === "en" ? "Selected object" : "Seçili nesne"}: ${object.label} (${object.category})`);
      lines.push(
        `${locale === "en" ? "Position" : "Konum"}: x=${formatNumber(semanticPosition.x)}, y=${formatNumber(semanticPosition.y)}, z=${formatNumber(semanticPosition.z)}, ${locale === "en" ? "rotation" : "dönüş"}=${Math.round(object.rotation)}.`,
      );
      lines.push(
        `${locale === "en" ? "Dimensions" : "Boyutlar"}: w=${formatNumber(object.dimensions.width)}, d=${formatNumber(object.dimensions.depth)}, h=${formatNumber(object.dimensions.height)} m.`,
      );
      lines.push(
        `${locale === "en" ? "Motion rules" : "Hareket kuralları"}: ${locale === "en" ? "movable" : "taşınabilir"}=${object.movable ? "yes" : "no"}, ${locale === "en" ? "locked" : "kilitli"}=${object.locked ? "yes" : "no"}, x=${motion.x === "free" ? (locale === "en" ? "free" : "serbest") : locale === "en" ? "locked" : "kilitli"}, y=${motion.y === "free" ? (locale === "en" ? "free" : "serbest") : locale === "en" ? "locked" : "kilitli"}, z=${motion.z === "free" ? (locale === "en" ? "free" : "serbest") : locale === "en" ? "locked" : "kilitli"}.`,
      );
    }
  }

  if (selection.objectIds?.length && selection.objectIds.length > 1) {
    const labels = selection.objectIds
      .map((objectId) => roomData.objects.find((entry) => entry.id === objectId)?.label)
      .filter(Boolean)
      .slice(0, 8);
    lines.push(`${locale === "en" ? "Selected items" : "Seçili öğeler"} (${selection.objectIds.length}): ${labels.join(", ")}`);
  }

  if (selection.groupId) {
    const group = roomData.groups?.find((entry) => entry.id === selection.groupId) ?? null;
    lines.push(
      group
        ? `${locale === "en" ? "Selected group" : "Seçili grup"}: ${group.label} (${group.objectIds.length} ${locale === "en" ? "items" : "öğe"})`
        : `${locale === "en" ? "Selected group id" : "Seçili grup id"}: ${selection.groupId}`,
    );
  }

  if (selection.structure) {
    if (selection.structure.type === "wall") {
      const index = roomData.room.walls.findIndex((wall) => wall.id === selection.structure?.id);
      lines.push(
        index >= 0
          ? `${locale === "en" ? "Selected structure" : "Seçili yapı"}: ${locale === "en" ? "Wall" : "Duvar"} ${index + 1} (${locale === "en" ? "locked" : "kilitli"})`
          : `${locale === "en" ? "Selected structure" : "Seçili yapı"}: ${locale === "en" ? "wall" : "duvar"} ${selection.structure.id}`,
      );
    } else {
      const opening = roomData.room.openings.find((entry) => entry.id === selection.structure?.id) ?? null;
      lines.push(
        opening
          ? `${locale === "en" ? "Selected structure" : "Seçili yapı"}: ${getLocalizedOpeningType(locale, opening.type)} ${roomData.room.openings.findIndex((entry) => entry.id === opening.id) + 1}`
          : `${locale === "en" ? "Selected structure" : "Seçili yapı"}: ${locale === "en" ? "opening" : "açıklık"} ${selection.structure.id}`,
      );
    }
  }

  return lines.join("\n");
}
