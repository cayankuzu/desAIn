import { boundsIntersect, getObjectBounds } from "@/lib/room/collision";
import {
  getActiveClearanceZones,
  objectIntersectsZone,
} from "@/lib/room/constraints";
import type { LayoutWarning, RoomData } from "@/types/room";

export const validateRoomLayout = (roomData: RoomData): LayoutWarning[] => {
  const warnings: LayoutWarning[] = [];
  const zones = getActiveClearanceZones(roomData);

  roomData.objects.forEach((object) => {
    const bounds = getObjectBounds(object);

    if (
      bounds.minX < 0 ||
      bounds.minZ < 0 ||
      bounds.maxX > roomData.room.width ||
      bounds.maxZ > roomData.room.depth
    ) {
      warnings.push({
        code: "out_of_bounds",
        level: "error",
        objectId: object.id,
        message: `${object.label} oda sınırlarını aşıyor.`,
      });
    }

    zones.forEach((zone) => {
      if (objectIntersectsZone(object, zone)) {
        warnings.push({
          code: `${zone.type}_clearance`,
          level: zone.type === "door" ? "error" : "warning",
          objectId: object.id,
          message: `${object.label}, ${zone.type === "door" ? "kapı" : zone.type === "window" ? "pencere" : "kalorifer"} alanını kısmen kapatıyor.`,
        });
      }
    });
  });

  for (let index = 0; index < roomData.objects.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < roomData.objects.length; compareIndex += 1) {
      const left = roomData.objects[index];
      const right = roomData.objects[compareIndex];

      if (boundsIntersect(getObjectBounds(left), getObjectBounds(right), 0.04)) {
        warnings.push({
          code: "collision",
          level: "warning",
          objectId: left.id,
          message: `${left.label} ve ${right.label} üst üste geliyor.`,
        });
      }
    }
  }

  return warnings;
};
