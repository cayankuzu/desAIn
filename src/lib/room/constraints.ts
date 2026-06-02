import {
  boundsIntersect,
  getObjectBounds,
  getCollisionDimensions,
  getObjectFootprint,
  getPolygonIntersectionPush,
  getRotatedHalfExtents,
  getWallFootprint,
  polygonsIntersect,
} from "@/lib/room/collision";
import type { Bounds2D } from "@/lib/room/collision";
import { getRoomCutoutZone, getWallSegment } from "@/lib/room/roomGeometry";
import type { Opening, RoomData, RoomObject, WallSegment } from "@/types/room";

const EDGE_PADDING = 0.06;
const WALL_COLLISION_THICKNESS = 0.1;
const WALL_COLLISION_PADDING = 0.018;

export interface ClearanceZone extends Bounds2D {
  id: string;
  type: Opening["type"];
}

export const getMountHeight = (object: Pick<RoomObject, "params">) =>
  typeof object.params.mountHeight === "number" ? object.params.mountHeight : 0;

export const isWallMountedObject = (object: Pick<RoomObject, "params">) =>
  getMountHeight(object) > 0;

export const isWallAttachedObject = (object: Pick<RoomObject, "params">) => {
  const baseShape = String(object.params.baseShape ?? "");

  if (baseShape === "ceiling_light") {
    return false;
  }

  return (
    isWallMountedObject(object) ||
    baseShape === "wall_panel" ||
    baseShape === "wall_box" ||
    baseShape === "door_panel"
  );
};

export const getObjectMotionRules = (
  object: Pick<RoomObject, "movable" | "locked" | "params">,
) => {
  const fixed = object.locked || !object.movable;
  const wallAttached = isWallAttachedObject(object);

  return {
    translateX: !fixed && (wallAttached || object.params.motionX !== false),
    translateZ: !fixed && (wallAttached || object.params.motionZ !== false),
    rotate: !fixed && !wallAttached && object.params.motionRotation !== false,
  };
};

export const isFloorCovering = (
  object: Pick<RoomObject, "category" | "dimensions">,
) => object.category === "carpet" || object.dimensions.height <= 0.06;

export const getObjectVerticalBounds = (
  object: Pick<RoomObject, "dimensions" | "params">,
) => {
  const mountHeight = getMountHeight(object);

  return {
    minY: mountHeight,
    maxY: mountHeight + object.dimensions.height,
  };
};

export const objectVerticalBoundsIntersect = (
  left: Pick<RoomObject, "dimensions" | "params">,
  right: Pick<RoomObject, "dimensions" | "params">,
  padding = 0,
) => {
  const leftBounds = getObjectVerticalBounds(left);
  const rightBounds = getObjectVerticalBounds(right);

  return !(
    leftBounds.maxY <= rightBounds.minY + padding ||
    leftBounds.minY >= rightBounds.maxY - padding
  );
};

export const objectsHavePlacementCollision = (
  left: RoomObject,
  right: RoomObject,
  padding = 0.04,
) => {
  if (isFloorCovering(left) || isFloorCovering(right)) {
    return false;
  }

  return (
    objectVerticalBoundsIntersect(left, right, 0.02) &&
    boundsIntersect(getObjectBounds(left), getObjectBounds(right), padding)
  );
};

export const normalizeRotation = (rotation: number) => {
  const wrapped = rotation % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
};

const isCeilingObject = (object: Pick<RoomObject, "params">) =>
  String(object.params.baseShape ?? "") === "ceiling_light";

export const isWallCollisionRelevantObject = (object: RoomObject) =>
  !isWallAttachedObject(object) && !isCeilingObject(object);

const getWallMetrics = (wall: WallSegment) => {
  const dx = wall.to[0] - wall.from[0];
  const dz = wall.to[1] - wall.from[1];
  const length = Math.hypot(dx, dz) || 1;

  return {
    length,
    directionX: dx / length,
    directionZ: dz / length,
    inwardNormalX: -dz / length,
    inwardNormalZ: dx / length,
  };
};

const clampObjectPositionToRoomShell = (
  roomData: RoomData,
  object: RoomObject,
  desiredPosition: RoomObject["position"],
  rotation = object.rotation,
) => {
  const collisionDimensions = getCollisionDimensions(object);
  const { halfWidth, halfDepth } = getRotatedHalfExtents(
    collisionDimensions.width,
    collisionDimensions.depth,
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

export const objectIntersectsWall = (
  object: RoomObject,
  wall: WallSegment,
  padding = 0,
) =>
  isWallCollisionRelevantObject(object) &&
  polygonsIntersect(
    getObjectFootprint(object),
    getWallFootprint(wall, WALL_COLLISION_THICKNESS),
    padding,
  );

export const objectIntersectsAnyWall = (
  roomData: RoomData,
  object: RoomObject,
  padding = 0,
) =>
  isWallCollisionRelevantObject(object) &&
  roomData.room.walls.some((wall) => objectIntersectsWall(object, wall, padding));

const repelObjectFromWalls = (
  roomData: RoomData,
  object: RoomObject,
  position: RoomObject["position"],
  rotation: number,
) => {
  if (!isWallCollisionRelevantObject(object)) {
    return position;
  }

  let nextPosition = position;

  for (let iteration = 0; iteration < 4; iteration += 1) {
    let moved = false;
    const candidateObject = {
      ...object,
      position: nextPosition,
      rotation,
    };

    for (const wall of roomData.room.walls) {
      const push = getPolygonIntersectionPush(
        getObjectFootprint(candidateObject),
        getWallFootprint(wall, WALL_COLLISION_THICKNESS),
        WALL_COLLISION_PADDING,
      );

      if (!push) {
        continue;
      }

      nextPosition = clampObjectPositionToRoomShell(
        roomData,
        object,
        {
          x: nextPosition.x + push.x,
          z: nextPosition.z + push.z,
        },
        rotation,
      );
      candidateObject.position = nextPosition;
      moved = true;
    }

    if (!moved) {
      break;
    }
  }

  return nextPosition;
};

export const getWallAttachedObjectTransform = (
  roomData: RoomData,
  object: RoomObject,
  desiredPosition: RoomObject["position"],
) => {
  const wallCandidates = roomData.room.walls.map((wall) => {
    const metrics = getWallMetrics(wall);
    const fromX = wall.from[0];
    const fromZ = wall.from[1];
    const desiredAlong =
      (desiredPosition.x - fromX) * metrics.directionX +
      (desiredPosition.z - fromZ) * metrics.directionZ;
    const halfAlong = Math.min(object.dimensions.width / 2, metrics.length / 2);
    const minAlong = Math.min(metrics.length / 2, halfAlong + 0.08);
    const maxAlong = Math.max(minAlong, metrics.length - halfAlong - 0.08);
    const along = Math.min(maxAlong, Math.max(minAlong, desiredAlong));
    const wallX = fromX + metrics.directionX * along;
    const wallZ = fromZ + metrics.directionZ * along;
    const distance = Math.hypot(desiredPosition.x - wallX, desiredPosition.z - wallZ);

    return {
      wall,
      metrics,
      along,
      distance,
    };
  });

  const closestWall =
    wallCandidates.sort((left, right) => left.distance - right.distance)[0] ?? null;

  if (!closestWall) {
    return {
      position: desiredPosition,
      rotation: normalizeRotation(object.rotation),
    };
  }

  const wall = closestWall.wall;
  const metrics = closestWall.metrics;
  const wallX = wall.from[0] + metrics.directionX * closestWall.along;
  const wallZ = wall.from[1] + metrics.directionZ * closestWall.along;
  const wallOffset = object.dimensions.depth / 2 + EDGE_PADDING;
  const position = {
    x: Number((wallX + metrics.inwardNormalX * wallOffset).toFixed(3)),
    z: Number((wallZ + metrics.inwardNormalZ * wallOffset).toFixed(3)),
  };
  const rotation = normalizeRotation(
    (Math.atan2(metrics.inwardNormalX, metrics.inwardNormalZ) * 180) / Math.PI,
  );

  return { position, rotation };
};

export const clampObjectPositionToRoom = (
  roomData: RoomData,
  object: RoomObject,
  desiredPosition: RoomObject["position"],
  rotation = object.rotation,
) => {
  const motion = getObjectMotionRules(object);
  const nextRotation = motion.rotate ? rotation : object.rotation;
  const nextPosition = {
    x: motion.translateX ? desiredPosition.x : object.position.x,
    z: motion.translateZ ? desiredPosition.z : object.position.z,
  };

  if (isWallAttachedObject(object)) {
    return getWallAttachedObjectTransform(roomData, object, nextPosition).position;
  }

  return repelObjectFromWalls(
    roomData,
    object,
    clampObjectPositionToRoomShell(roomData, object, nextPosition, nextRotation),
    nextRotation,
  );
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

  const metrics = getWallMetrics(wall);
  const startAlong = Math.max(0, opening.position - halfOpening);
  const endAlong = Math.min(metrics.length, opening.position + halfOpening);
  const points = [
    {
      x: wall.from[0] + metrics.directionX * startAlong,
      z: wall.from[1] + metrics.directionZ * startAlong,
    },
    {
      x: wall.from[0] + metrics.directionX * endAlong,
      z: wall.from[1] + metrics.directionZ * endAlong,
    },
    {
      x:
        wall.from[0] +
        metrics.directionX * endAlong +
        metrics.inwardNormalX * depth,
      z:
        wall.from[1] +
        metrics.directionZ * endAlong +
        metrics.inwardNormalZ * depth,
    },
    {
      x:
        wall.from[0] +
        metrics.directionX * startAlong +
        metrics.inwardNormalX * depth,
      z:
        wall.from[1] +
        metrics.directionZ * startAlong +
        metrics.inwardNormalZ * depth,
    },
  ];

  return {
    id: opening.id,
    type: opening.type,
    minX: Math.min(...points.map((point) => point.x)),
    maxX: Math.max(...points.map((point) => point.x)),
    minZ: Math.min(...points.map((point) => point.z)),
    maxZ: Math.max(...points.map((point) => point.z)),
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
