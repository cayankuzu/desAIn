import { getWallMetrics, getWallSegment } from "@/lib/room/roomGeometry";
import type { Opening, RoomDefinition } from "@/types/room";

export const getOpeningHeight = (opening: Opening, roomHeight: number) => {
  const fallback =
    opening.type === "door" || opening.type === "balcony_door"
      ? Math.min(2.08, Math.max(1.6, roomHeight - 0.18))
      : opening.type === "window"
        ? Math.min(1.12, Math.max(0.55, roomHeight * 0.42))
        : 0.52;

  return Math.min(Math.max(opening.height ?? fallback, 0.2), Math.max(0.2, roomHeight));
};

export const getOpeningBottom = (opening: Opening, roomHeight: number) => {
  const height = getOpeningHeight(opening, roomHeight);
  const fallback =
    opening.type === "door" || opening.type === "balcony_door"
      ? 0
      : opening.type === "window"
        ? Math.min(0.9, Math.max(0.45, roomHeight * 0.28))
        : 0.18;

  return Math.min(
    Math.max(opening.sillHeight ?? fallback, 0),
    Math.max(0, roomHeight - height),
  );
};

export const getOpeningSceneTransform = (
  room: RoomDefinition,
  opening: Opening,
  wallThickness = 0.1,
) => {
  const wall = getWallSegment(room, opening.wallId);
  const height = getOpeningHeight(opening, room.height);
  const bottom = getOpeningBottom(opening, room.height);

  if (!wall) {
    return {
      position: { x: 0, y: bottom + height / 2, z: 0 },
      rotationY: 0,
    };
  }

  const {
    directionX,
    directionZ,
    inwardNormalX,
    inwardNormalZ,
    rotationY,
  } = getWallMetrics(wall);
  const alongX = wall.from[0] + directionX * opening.position;
  const alongZ = wall.from[1] + directionZ * opening.position;
  const wallOffset = wallThickness / 2 + 0.03;

  return {
    position: {
      x: alongX + inwardNormalX * wallOffset,
      y: bottom + height / 2,
      z: alongZ + inwardNormalZ * wallOffset,
    },
    rotationY:
      typeof opening.rotation === "number"
        ? (opening.rotation * Math.PI) / 180
        : rotationY,
  };
};
