import {
  clampObjectPositionToRoom,
  getMountHeight,
  getObjectMotionRules,
  getWallAttachedObjectTransform,
  isWallAttachedObject,
  normalizeRotation,
} from "@/lib/room/constraints";
import type { RoomData, RoomObject } from "@/types/room";

export type RoomObjectUpdatePayload = {
  position?: Partial<RoomObject["position"]>;
  rotation?: number;
  dimensions?: Partial<RoomObject["dimensions"]>;
  color?: string;
  mountHeight?: number;
};

const clampDimension = (value: number, fallback: number, maximum?: number) => {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return fallback;
  }

  const clamped = Math.max(0.05, Number(value.toFixed(2)));

  if (maximum === undefined) {
    return clamped;
  }

  return Math.min(clamped, Number(maximum.toFixed(2)));
};

export function applyObjectUpdate(
  roomData: RoomData,
  object: RoomObject,
  payload: RoomObjectUpdatePayload,
) {
  if (object.locked || !object.movable) {
    return false;
  }

  const motion = getObjectMotionRules(object);
  const nextRotation = motion.rotate
    ? normalizeRotation(payload.rotation ?? object.rotation)
    : object.rotation;
  const nextDimensions = {
    width: clampDimension(
      payload.dimensions?.width ?? object.dimensions.width,
      object.dimensions.width,
    ),
    depth: clampDimension(
      payload.dimensions?.depth ?? object.dimensions.depth,
      object.dimensions.depth,
    ),
    height: clampDimension(
      payload.dimensions?.height ?? object.dimensions.height,
      object.dimensions.height,
      Math.max(0.05, roomData.room.height - getMountHeight(object)),
    ),
  };
  const nextMountHeight = isWallAttachedObject(object)
    ? clampDimension(
        typeof payload.mountHeight === "number" ? payload.mountHeight : getMountHeight(object),
        getMountHeight(object),
        Math.max(0.05, roomData.room.height - nextDimensions.height),
      )
    : 0;
  const desiredPosition = {
    x: motion.translateX ? payload.position?.x ?? object.position.x : object.position.x,
    z: motion.translateZ ? payload.position?.z ?? object.position.z : object.position.z,
  };

  object.dimensions = nextDimensions;

  if (isWallAttachedObject(object)) {
    object.params.mountHeight = nextMountHeight;
    const placement = getWallAttachedObjectTransform(roomData, object, desiredPosition);

    object.position = placement.position;
    object.rotation = motion.rotate ? placement.rotation : object.rotation;
  } else {
    object.params.mountHeight = 0;
    object.rotation = nextRotation;
    object.position = clampObjectPositionToRoom(
      roomData,
      object,
      desiredPosition,
      nextRotation,
    );
  }

  if (payload.color) {
    object.color = payload.color;
  }

  return true;
}
