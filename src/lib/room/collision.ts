import type { RoomObject } from "@/types/room";

export interface Bounds2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const getRotatedHalfExtents = (
  width: number,
  depth: number,
  rotation: number,
) => {
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));

  return {
    halfWidth: (width * cos + depth * sin) / 2,
    halfDepth: (width * sin + depth * cos) / 2,
  };
};

export const getObjectBounds = (object: RoomObject): Bounds2D => {
  const { halfWidth, halfDepth } = getRotatedHalfExtents(
    object.dimensions.width,
    object.dimensions.depth,
    object.rotation,
  );

  return {
    minX: object.position.x - halfWidth,
    maxX: object.position.x + halfWidth,
    minZ: object.position.z - halfDepth,
    maxZ: object.position.z + halfDepth,
  };
};

export const boundsIntersect = (
  left: Bounds2D,
  right: Bounds2D,
  padding = 0,
) => {
  return !(
    left.maxX <= right.minX + padding ||
    left.minX >= right.maxX - padding ||
    left.maxZ <= right.minZ + padding ||
    left.minZ >= right.maxZ - padding
  );
};
