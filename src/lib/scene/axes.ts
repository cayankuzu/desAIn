import { getMountHeight, getObjectMotionRules, isWallAttachedObject } from "@/lib/room/constraints";
import type { RoomObject } from "@/types/room";

const formatNumber = (value: number) => Number(value.toFixed(2)).toFixed(2);

export type SemanticAxisMotion = "free" | "locked";

export interface SemanticObjectPosition {
  x: number;
  y: number;
  z: number;
}

export interface SemanticObjectMotion {
  x: SemanticAxisMotion;
  y: SemanticAxisMotion;
  z: SemanticAxisMotion;
}

export const toSemanticFloorPosition = (position: { x: number; z: number }) => ({
  x: position.x,
  y: position.z,
});

export const fromSemanticFloorPosition = (position: { x: number; y: number }) => ({
  x: position.x,
  z: position.y,
});

export const getSemanticObjectPosition = (
  object: Pick<RoomObject, "position" | "params">,
): SemanticObjectPosition => ({
  x: Number(object.position.x.toFixed(2)),
  y: Number(object.position.z.toFixed(2)),
  z: Number(getMountHeight(object).toFixed(2)),
});

export const getSemanticObjectMotion = (
  object: Pick<RoomObject, "movable" | "locked" | "params">,
): SemanticObjectMotion => {
  const motion = getObjectMotionRules(object);
  const canMoveVertically = isWallAttachedObject(object) && !object.locked && object.movable;

  return {
    x: motion.translateX ? "free" : "locked",
    y: motion.translateZ ? "free" : "locked",
    z: canMoveVertically ? "free" : "locked",
  };
};

export const formatSemanticPosition = (position: SemanticObjectPosition) =>
  `x=${formatNumber(position.x)}, y=${formatNumber(position.y)}, z=${formatNumber(position.z)}`;
