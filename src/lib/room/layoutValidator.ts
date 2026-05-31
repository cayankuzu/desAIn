import { boundsIntersect, getObjectBounds } from "@/lib/room/collision";
import {
  getActiveClearanceZones,
  objectIntersectsZone,
} from "@/lib/room/constraints";
import { getRoomCutoutZone } from "@/lib/room/roomGeometry";
import type { LayoutWarning, RoomData } from "@/types/room";

export const validateRoomLayout = (roomData: RoomData): LayoutWarning[] => {
  const warnings: LayoutWarning[] = [];
  const zones = getActiveClearanceZones(roomData);
  const cutout = getRoomCutoutZone(roomData.room);

  roomData.objects.forEach((object) => {
    const bounds = getObjectBounds(object);
    const overlapsCutout =
      cutout &&
      !(
        bounds.maxX <= cutout.minX ||
        bounds.minX >= cutout.maxX ||
        bounds.maxZ <= cutout.minZ ||
        bounds.minZ >= cutout.maxZ
      );

    if (
      bounds.minX < 0 ||
      bounds.minZ < 0 ||
      bounds.maxX > roomData.room.width ||
      bounds.maxZ > roomData.room.depth ||
      overlapsCutout
    ) {
      warnings.push({
        code: "out_of_bounds",
        level: "error",
        objectId: object.id,
        message: `${object.label} exceeds the room bounds.`,
      });
    }

    zones.forEach((zone) => {
      if (objectIntersectsZone(object, zone)) {
        warnings.push({
          code: `${zone.type}_clearance`,
          level: zone.type === "door" ? "error" : "warning",
          objectId: object.id,
          message: `${object.label} partially blocks the ${zone.type} area.`,
        });
      }
    });
  });

  for (let index = 0; index < roomData.objects.length; index += 1) {
    for (
      let compareIndex = index + 1;
      compareIndex < roomData.objects.length;
      compareIndex += 1
    ) {
      const left = roomData.objects[index];
      const right = roomData.objects[compareIndex];

      if (boundsIntersect(getObjectBounds(left), getObjectBounds(right), 0.04)) {
        warnings.push({
          code: "collision",
          level: "warning",
          objectId: left.id,
          relatedObjectId: right.id,
          message: `${left.label} overlaps with ${right.label}.`,
        });
      }
    }
  }

  return warnings;
};
