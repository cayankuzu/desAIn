import { getObjectBounds, getRotatedHalfExtents } from "@/lib/room/collision";
import type { Bounds2D } from "@/lib/room/collision";
import type { Opening, RoomData, RoomObject } from "@/types/room";

const EDGE_PADDING = 0.06;

export interface ClearanceZone extends Bounds2D {
  id: string;
  type: Opening["type"];
}

export const normalizeRotation = (rotation: number) => {
  const wrapped = rotation % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
};

export const clampObjectPositionToRoom = (
  roomData: RoomData,
  object: RoomObject,
  desiredPosition: RoomObject["position"],
  rotation = object.rotation,
) => {
  const { halfWidth, halfDepth } = getRotatedHalfExtents(
    object.dimensions.width,
    object.dimensions.depth,
    rotation,
  );

  return {
    x: Math.min(
      roomData.room.width - halfWidth - EDGE_PADDING,
      Math.max(halfWidth + EDGE_PADDING, desiredPosition.x),
    ),
    z: Math.min(
      roomData.room.depth - halfDepth - EDGE_PADDING,
      Math.max(halfDepth + EDGE_PADDING, desiredPosition.z),
    ),
  };
};

const buildZoneFromOpening = (
  roomData: RoomData,
  opening: Opening,
): ClearanceZone => {
  const padding = 0.16;
  const depth = opening.clearDepth ?? 0.65;
  const halfOpening = opening.width / 2 + padding;

  if (opening.wallId === "wall_1") {
    return {
      id: opening.id,
      type: opening.type,
      minX: opening.position - halfOpening,
      maxX: opening.position + halfOpening,
      minZ: 0,
      maxZ: depth,
    };
  }

  if (opening.wallId === "wall_2") {
    return {
      id: opening.id,
      type: opening.type,
      minX: roomData.room.width - depth,
      maxX: roomData.room.width,
      minZ: opening.position - halfOpening,
      maxZ: opening.position + halfOpening,
    };
  }

  if (opening.wallId === "wall_3") {
    return {
      id: opening.id,
      type: opening.type,
      minX: opening.position - halfOpening,
      maxX: opening.position + halfOpening,
      minZ: roomData.room.depth - depth,
      maxZ: roomData.room.depth,
    };
  }

  return {
    id: opening.id,
    type: opening.type,
    minX: 0,
    maxX: depth,
    minZ: opening.position - halfOpening,
    maxZ: opening.position + halfOpening,
  };
};

export const getActiveClearanceZones = (roomData: RoomData) => {
  return roomData.room.openings
    .filter((opening) => {
      if (opening.type === "door") {
        return roomData.constraints.keepDoorClear;
      }

      if (opening.type === "window") {
        return roomData.constraints.keepWindowClear;
      }

      if (opening.type === "radiator") {
        return roomData.constraints.keepRadiatorClear;
      }

      return true;
    })
    .map((opening) => buildZoneFromOpening(roomData, opening));
};

export const objectIntersectsZone = (
  object: RoomObject,
  zone: ClearanceZone,
) => {
  const bounds = getObjectBounds(object);

  return !(
    bounds.maxX <= zone.minX ||
    bounds.minX >= zone.maxX ||
    bounds.maxZ <= zone.minZ ||
    bounds.minZ >= zone.maxZ
  );
};
