import { getObjectBounds, getRotatedHalfExtents } from "@/lib/room/collision";
import type { Bounds2D } from "@/lib/room/collision";
import {
  getRoomCutoutZone,
  getWallSegment,
} from "@/lib/room/roomGeometry";
import type { Opening, RoomData, RoomObject } from "@/types/room";

const EDGE_PADDING = 0.06;

export interface ClearanceZone extends Bounds2D {
  id: string;
  type: Opening["type"];
}

export const getMountHeight = (object: Pick<RoomObject, "params">) =>
  typeof object.params.mountHeight === "number" ? object.params.mountHeight : 0;

export const isWallMountedObject = (object: Pick<RoomObject, "params">) =>
  getMountHeight(object) > 0;

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

  const clamped = {
    x: Math.min(
      roomData.room.width - halfWidth - EDGE_PADDING,
      Math.max(halfWidth + EDGE_PADDING, desiredPosition.x),
    ),
    z: Math.min(
      roomData.room.depth - halfDepth - EDGE_PADDING,
      Math.max(halfDepth + EDGE_PADDING, desiredPosition.z),
    ),
  };

  const cutout = getRoomCutoutZone(roomData.room);

  if (!cutout) {
    return clamped;
  }

  const intersectsCutout =
    clamped.x + halfWidth > cutout.minX &&
    clamped.x - halfWidth < cutout.maxX &&
    clamped.z + halfDepth > cutout.minZ &&
    clamped.z - halfDepth < cutout.maxZ;

  if (!intersectsCutout) {
    return clamped;
  }

  const moveLeftX = Math.max(
    halfWidth + EDGE_PADDING,
    cutout.minX - halfWidth - EDGE_PADDING,
  );
  const moveDownZ = Math.max(
    halfDepth + EDGE_PADDING,
    cutout.minZ - halfDepth - EDGE_PADDING,
  );
  const leftDelta = Math.abs(desiredPosition.x - moveLeftX);
  const downDelta = Math.abs(desiredPosition.z - moveDownZ);

  if (leftDelta <= downDelta) {
    return {
      x: Math.min(clamped.x, moveLeftX),
      z: clamped.z,
    };
  }

  return {
    x: clamped.x,
    z: Math.min(clamped.z, moveDownZ),
  };
};

const buildZoneFromOpening = (
  roomData: RoomData,
  opening: Opening,
): ClearanceZone => {
  const padding = 0.16;
  const depth = opening.clearDepth ?? 0.65;
  const halfOpening = opening.width / 2 + padding;
  const wall = getWallSegment(roomData.room, opening.wallId);

  if (!wall) {
    return {
      id: opening.id,
      type: opening.type,
      minX: 0,
      maxX: 0,
      minZ: 0,
      maxZ: 0,
    };
  }

  const fromX = wall.from[0];
  const fromZ = wall.from[1];
  const toX = wall.to[0];
  const toZ = wall.to[1];
  const horizontal = Math.abs(toX - fromX) >= Math.abs(toZ - fromZ);

  if (horizontal) {
    const directionX = Math.sign(toX - fromX);
    const centerX = fromX + directionX * opening.position;
    const wallZ = fromZ;
    const inwardPositiveZ = wallZ <= 0.001;
    const zoneMinZ = inwardPositiveZ ? wallZ : wallZ - depth;
    const zoneMaxZ = inwardPositiveZ ? wallZ + depth : wallZ;

    return {
      id: opening.id,
      type: opening.type,
      minX: centerX - halfOpening,
      maxX: centerX + halfOpening,
      minZ: zoneMinZ,
      maxZ: zoneMaxZ,
    };
  }

  const directionZ = Math.sign(toZ - fromZ);
  const centerZ = fromZ + directionZ * opening.position;
  const wallX = fromX;
  const inwardPositiveX = wallX <= 0.001;
  const zoneMinX = inwardPositiveX ? wallX : wallX - depth;
  const zoneMaxX = inwardPositiveX ? wallX + depth : wallX;

  return {
    id: opening.id,
    type: opening.type,
    minX: zoneMinX,
    maxX: zoneMaxX,
    minZ: centerZ - halfOpening,
    maxZ: centerZ + halfOpening,
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
