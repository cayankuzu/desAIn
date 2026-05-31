import type { RoomObject, WallSegment } from "@/types/room";

export interface Bounds2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface Point2D {
  x: number;
  z: number;
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

export const getObjectFootprint = (object: RoomObject): Point2D[] => {
  const radians = (object.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const halfWidth = object.dimensions.width / 2;
  const halfDepth = object.dimensions.depth / 2;
  const corners: Array<[number, number]> = [
    [-halfWidth, -halfDepth],
    [halfWidth, -halfDepth],
    [halfWidth, halfDepth],
    [-halfWidth, halfDepth],
  ];

  return corners.map(([localX, localZ]) => ({
    x: object.position.x + localX * cos + localZ * sin,
    z: object.position.z - localX * sin + localZ * cos,
  }));
};

export const getWallFootprint = (
  wall: WallSegment,
  thickness = 0.1,
): Point2D[] => {
  const dx = wall.to[0] - wall.from[0];
  const dz = wall.to[1] - wall.from[1];
  const length = Math.hypot(dx, dz) || 1;
  const normalX = -dz / length;
  const normalZ = dx / length;
  const halfThickness = thickness / 2;
  const offsetX = normalX * halfThickness;
  const offsetZ = normalZ * halfThickness;

  return [
    { x: wall.from[0] + offsetX, z: wall.from[1] + offsetZ },
    { x: wall.to[0] + offsetX, z: wall.to[1] + offsetZ },
    { x: wall.to[0] - offsetX, z: wall.to[1] - offsetZ },
    { x: wall.from[0] - offsetX, z: wall.from[1] - offsetZ },
  ];
};

const getPolygonAxes = (polygon: Point2D[]) =>
  polygon
    .map((point, index) => {
      const nextPoint = polygon[(index + 1) % polygon.length];
      const edgeX = nextPoint.x - point.x;
      const edgeZ = nextPoint.z - point.z;
      const length = Math.hypot(edgeX, edgeZ);

      if (length < 0.0001) {
        return null;
      }

      return {
        x: -edgeZ / length,
        z: edgeX / length,
      };
    })
    .filter((axis): axis is Point2D => Boolean(axis));

const projectPolygon = (polygon: Point2D[], axis: Point2D) =>
  polygon.reduce(
    (range, point) => {
      const value = point.x * axis.x + point.z * axis.z;

      return {
        min: Math.min(range.min, value),
        max: Math.max(range.max, value),
      };
    },
    { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY },
  );

const getPolygonCenter = (polygon: Point2D[]) => {
  const total = polygon.reduce(
    (sum, point) => ({
      x: sum.x + point.x,
      z: sum.z + point.z,
    }),
    { x: 0, z: 0 },
  );

  return {
    x: total.x / Math.max(1, polygon.length),
    z: total.z / Math.max(1, polygon.length),
  };
};

export const getPolygonIntersectionPush = (
  movingPolygon: Point2D[],
  obstaclePolygon: Point2D[],
  padding = 0,
): Point2D | null => {
  const axes = [
    ...getPolygonAxes(movingPolygon),
    ...getPolygonAxes(obstaclePolygon),
  ];
  const movingCenter = getPolygonCenter(movingPolygon);
  const obstacleCenter = getPolygonCenter(obstaclePolygon);
  let bestPush: Point2D | null = null;
  let bestOverlap = Number.POSITIVE_INFINITY;

  for (const axis of axes) {
    const movingProjection = projectPolygon(movingPolygon, axis);
    const obstacleProjection = projectPolygon(obstaclePolygon, axis);

    if (
      movingProjection.max + padding <= obstacleProjection.min ||
      obstacleProjection.max + padding <= movingProjection.min
    ) {
      return null;
    }

    const overlap =
      Math.min(movingProjection.max, obstacleProjection.max) -
      Math.max(movingProjection.min, obstacleProjection.min) +
      padding;

    if (overlap < bestOverlap) {
      const direction =
        (movingCenter.x - obstacleCenter.x) * axis.x +
          (movingCenter.z - obstacleCenter.z) * axis.z >=
        0
          ? 1
          : -1;

      bestOverlap = overlap;
      bestPush = {
        x: axis.x * direction * (overlap + 0.001),
        z: axis.z * direction * (overlap + 0.001),
      };
    }
  }

  return bestPush;
};

export const polygonsIntersect = (
  left: Point2D[],
  right: Point2D[],
  padding = 0,
) => Boolean(getPolygonIntersectionPush(left, right, padding));

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
