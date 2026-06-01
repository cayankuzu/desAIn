import { resizeRoomDefinition } from "@/lib/room/defaultRoom";
import {
  clampObjectPositionToRoom,
  getWallAttachedObjectTransform,
  isWallAttachedObject,
} from "@/lib/room/constraints";
import { inventoryCatalog, type InventoryTemplate } from "@/lib/room/inventoryCatalog";
import { normalizeOpeningForRoom, getWallLength } from "@/lib/room/roomGeometry";
import { normalizeRuntimeInventoryTemplate } from "@/lib/room/runtimeInventoryCatalog";
import { createRoomPreset } from "@/lib/room/roomPresets";
import type { RoomDraft } from "@/lib/ai/roomDraft";
import type { Opening, RoomData, RoomObject } from "@/types/room";

const fallbackTemplate = inventoryCatalog.find((template) => template.id === "template_cube");

function getFallbackTemplate() {
  if (!fallbackTemplate) {
    throw new Error("Inventory catalog is empty; cannot create analyzed room objects.");
  }

  return fallbackTemplate;
}

const clampToRoom = (value: number, max: number) =>
  Number(Math.min(Math.max(value, 0), Math.max(max, 0)).toFixed(3));

const createObjectId = (category: RoomObject["category"], index: number) =>
  `ai_${category}_${index + 1}`;

function buildTemplateMap(draft: RoomDraft) {
  const templates = new Map<string, InventoryTemplate>();

  for (const template of inventoryCatalog) {
    templates.set(template.id, template);
  }

  for (const item of draft.discoveredInventory) {
    const template = normalizeRuntimeInventoryTemplate(item);
    templates.set(template.id, template);
  }

  return templates;
}

function createDraftObject(
  template: InventoryTemplate,
  roomData: RoomData,
  item: RoomDraft["items"][number],
  index: number,
): RoomObject {
  const mountHeight =
    typeof template.params.mountHeight === "number" ? template.params.mountHeight : 0;
  const structural = Boolean(template.params.structural);
  const height = Math.min(
    template.dimensions.height,
    Math.max(0.05, roomData.room.height - mountHeight),
  );
  const baseObject: RoomObject = {
    id: createObjectId(template.category, index),
    label: template.label,
    labelKey: template.labelKey,
    category: template.category,
    generator: template.generator,
    position: {
      x: clampToRoom(item.x, roomData.room.width),
      z: clampToRoom(item.z, roomData.room.depth),
    },
    rotation: item.rotation ?? template.rotation ?? 0,
    dimensions: {
      ...template.dimensions,
      height,
    },
    color: template.color,
    movable: !structural,
    locked: item.locked ?? structural,
    params: {
      ...template.params,
      source: "photo_analysis",
      analysisNote: item.note ?? "",
    },
  };

  if (isWallAttachedObject(baseObject)) {
    const placement = getWallAttachedObjectTransform(roomData, baseObject, baseObject.position);
    return {
      ...baseObject,
      position: placement.position,
      rotation: placement.rotation,
    };
  }

  return {
    ...baseObject,
    position: clampObjectPositionToRoom(
      roomData,
      baseObject,
      baseObject.position,
      baseObject.rotation,
    ),
  };
}

function normalizeDraftOpenings(roomData: RoomData, draft: RoomDraft): Opening[] {
  return draft.room.openings
    .map((opening, index) => {
      const wall = roomData.room.walls.find((entry) => entry.id === opening.wallId);
      if (!wall) {
        return null;
      }

      const wallLength = getWallLength(roomData.room, opening.wallId);
      const normalized = normalizeOpeningForRoom(roomData.room, {
        id: opening.id ?? `${opening.type}_${index + 1}`,
        type: opening.type,
        wallId: opening.wallId,
        position: Math.min(Math.max(opening.position, 0), wallLength),
        width: opening.width,
        height: opening.height,
        sillHeight: opening.sillHeight,
        clearDepth: opening.clearDepth,
        locked: opening.locked ?? true,
      });

      return normalized;
    })
    .filter((opening): opening is Opening => Boolean(opening));
}

export function createRoomDataFromDraft(draft: RoomDraft): RoomData {
  const baseRoomData = createRoomPreset(draft.room.shape, "empty");
  const room = resizeRoomDefinition(baseRoomData.room, {
    shape: draft.room.shape,
    purpose: "empty",
    width: draft.room.width,
    depth: draft.room.depth,
    height: draft.room.height,
  });
  const roomData: RoomData = {
    ...baseRoomData,
    room: {
      ...room,
      openings: [],
    },
    objects: [],
    groups: [],
    notes: [
      "Generated from project photo analysis.",
      ...draft.notes,
    ],
  };

  roomData.room.openings = normalizeDraftOpenings(roomData, draft);

  const templates = buildTemplateMap(draft);
  const fallback = getFallbackTemplate();
  roomData.objects = draft.items
    .map((item, index) =>
      createDraftObject(templates.get(item.templateId) ?? fallback, roomData, item, index),
    )
    .filter((object) => {
      if (object.params.structural === true) {
        return true;
      }

      const floorMounted = object.dimensions.height > 0.05 && !isWallAttachedObject(object);
      const wallMounted = isWallAttachedObject(object);
      return floorMounted || wallMounted;
    });

  return roomData;
}
