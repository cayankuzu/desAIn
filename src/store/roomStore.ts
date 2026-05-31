"use client";

import { create } from "zustand";
import { boundsIntersect, getObjectBounds } from "@/lib/room/collision";
import type { EditorStatus } from "@/lib/i18n/translations";
import {
  getInventoryTemplateById,
  type InventoryTemplate,
} from "@/lib/room/inventoryCatalog";
import {
  clampObjectPositionToRoom,
  getActiveClearanceZones,
  getWallAttachedObjectTransform,
  isWallAttachedObject,
  normalizeRotation,
  objectIntersectsZone,
} from "@/lib/room/constraints";
import { defaultRoom, resizeRoomDefinition } from "@/lib/room/defaultRoom";
import { createRoomPreset } from "@/lib/room/roomPresets";
import { validateRoomLayout } from "@/lib/room/layoutValidator";
import {
  findWallByRotation,
  getWallLength,
  projectPointToWall,
  normalizeOpeningForRoom,
} from "@/lib/room/roomGeometry";
import type {
  CameraMode,
  LayoutWarning,
  Opening,
  RoomData,
  RoomDefinition,
  RoomObjectGroup,
  RoomObject,
  RoomPurpose,
  RoomShape,
  TransformMode,
  WallSegment,
} from "@/types/room";

const SAVED_ROOM_KEY = "desain-saved-room-data";

const cloneRoomData = (roomData: RoomData): RoomData =>
  JSON.parse(JSON.stringify(roomData)) as RoomData;

const cloneRoomObject = (object: RoomObject): RoomObject =>
  JSON.parse(JSON.stringify(object)) as RoomObject;

const getMountHeight = (object: Pick<RoomObject, "params">) =>
  typeof object.params.mountHeight === "number" ? object.params.mountHeight : 0;

const isFixedDuringRandomize = (object: Pick<RoomObject, "locked" | "movable" | "params">) =>
  object.locked ||
  !object.movable ||
  object.params.structural === true ||
  object.params.fixedDuringRandomize === true;

const limitHistory = (history: RoomData[]) => history.slice(-50);

const updateObjectInRoom = (
  roomData: RoomData,
  objectId: string,
  updater: (object: RoomObject) => void,
) => {
  const target = roomData.objects.find((object) => object.id === objectId);

  if (!target) {
    return;
  }

  updater(target);
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

const createObjectId = (category: RoomObject["category"]) =>
  `${category}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

const createWallId = (walls: WallSegment[]) => {
  const usedIds = new Set(walls.map((wall) => wall.id));
  let index = walls.length + 1;

  while (usedIds.has(`wall_${index}`)) {
    index += 1;
  }

  return `wall_${index}`;
};

const createGroupId = (groups: RoomObjectGroup[]) =>
  `group_${Date.now().toString(36)}_${groups.length + 1}`;

const getRoomGroups = (roomData: RoomData) => roomData.groups ?? [];

const pruneGroups = (roomData: RoomData) => {
  const objectIds = new Set(roomData.objects.map((object) => object.id));

  roomData.groups = getRoomGroups(roomData)
    .map((group) => ({
      ...group,
      objectIds: group.objectIds.filter((objectId) => objectIds.has(objectId)),
    }))
    .filter((group) => group.objectIds.length > 1);
};

const getNextGroupLabel = (roomData: RoomData, objectIds: string[]) => {
  const objects = roomData.objects.filter((object) => objectIds.includes(object.id));
  const hasTv = objects.some((object) => object.category === "tv_unit");
  const hasSeat = objects.some(
    (object) => object.category === "sofa" || object.category === "chair",
  );
  const hasTable = objects.some((object) => object.category === "table");
  const index = getRoomGroups(roomData).length + 1;

  if (hasTv && hasSeat) {
    return `Oturma Grubu ${index}`;
  }

  if (hasTable && hasSeat) {
    return `Masa Grubu ${index}`;
  }

  return `Grup ${index}`;
};

const getObjectBaseShape = (object: Pick<RoomObject, "params">) =>
  String(object.params.baseShape ?? "");

const shouldPreferWallPlacement = (object: RoomObject) => {
  const baseShape = getObjectBaseShape(object);

  return (
    object.category === "sofa" ||
    object.category === "bed" ||
    object.category === "wardrobe" ||
    object.category === "tv_unit" ||
    baseShape === "appliance_box" ||
    baseShape === "washer" ||
    baseShape === "kitchen_sink" ||
    baseShape === "piano" ||
    baseShape === "door_panel"
  );
};

const isFloorCovering = (object: Pick<RoomObject, "category" | "dimensions">) =>
  object.category === "carpet" || object.dimensions.height <= 0.06;

const shouldIgnorePlacementCollision = (left: RoomObject, right: RoomObject) =>
  isFloorCovering(left) ||
  isFloorCovering(right) ||
  isWallAttachedObject(left) ||
  isWallAttachedObject(right);

const canRepairRandomObject = (object: RoomObject) =>
  !isFixedDuringRandomize(object) && !isWallAttachedObject(object);

const positionsEqual = (
  left: RoomObject["position"],
  right: RoomObject["position"],
) =>
  Math.abs(left.x - right.x) < 0.001 && Math.abs(left.z - right.z) < 0.001;

const moveRandomObjectBy = (
  roomData: RoomData,
  object: RoomObject,
  delta: RoomObject["position"],
) => ({
  ...object,
  position: clampObjectPositionToRoom(
    roomData,
    object,
    {
      x: object.position.x + delta.x,
      z: object.position.z + delta.z,
    },
    object.rotation,
  ),
});

const getFacingRotation = (
  from: RoomObject["position"],
  to: RoomObject["position"],
) => normalizeRotation((Math.atan2(to.x - from.x, to.z - from.z) * 180) / Math.PI);

const getForwardVector = (rotation: number) => {
  const radians = (normalizeRotation(rotation) * Math.PI) / 180;

  return {
    x: Math.sin(radians),
    z: Math.cos(radians),
  };
};

const getFacingQuality = (
  object: RoomObject,
  target: RoomObject["position"],
) => {
  const dx = target.x - object.position.x;
  const dz = target.z - object.position.z;
  const distance = Math.hypot(dx, dz);

  if (distance < 0.001) {
    return 1;
  }

  const forward = getForwardVector(object.rotation);
  const dot = forward.x * (dx / distance) + forward.z * (dz / distance);

  return Math.max(0, Math.min(1, (dot + 1) / 2));
};

const getExplicitGroupObjects = (
  roomData: RoomData,
  objectId: string,
  objects: RoomObject[],
) => {
  const group = getRoomGroups(roomData).find((entry) =>
    entry.objectIds.includes(objectId),
  );

  if (!group) {
    return [];
  }

  return group.objectIds
    .map((groupObjectId) => objects.find((object) => object.id === groupObjectId))
    .filter((object): object is RoomObject => Boolean(object));
};

const getNearestObject = (
  object: RoomObject,
  candidates: RoomObject[],
) =>
  [...candidates].sort(
    (left, right) =>
      Math.hypot(
        object.position.x - left.position.x,
        object.position.z - left.position.z,
      ) -
      Math.hypot(
        object.position.x - right.position.x,
        object.position.z - right.position.z,
      ),
  )[0] ?? null;

const getDesignPenalty = (roomData: RoomData, objects: RoomObject[]) => {
  const roomCenter = {
    x: roomData.room.width / 2,
    z: roomData.room.depth / 2,
  };

  return objects.reduce((total, object) => {
    if (isFixedDuringRandomize(object) || isWallAttachedObject(object)) {
      return total;
    }

    const explicitGroupObjects = getExplicitGroupObjects(roomData, object.id, objects);
    const groupedTvObjects = explicitGroupObjects.filter(
      (groupObject) => groupObject.category === "tv_unit" && groupObject.id !== object.id,
    );
    const groupedTableObjects = explicitGroupObjects.filter(
      (groupObject) => groupObject.category === "table" && groupObject.id !== object.id,
    );

    if (object.category === "chair") {
      const nearestTable = getNearestObject(object, groupedTableObjects);

      if (nearestTable) {
        const distanceToTable = Math.hypot(
          object.position.x - nearestTable.position.x,
          object.position.z - nearestTable.position.z,
        );

        return (
          total +
          (1 - getFacingQuality(object, nearestTable.position)) * 24 +
          (distanceToTable < 0.55
            ? (0.55 - distanceToTable) * 28
            : distanceToTable > 1.35
              ? (distanceToTable - 1.35) * 14
              : 0)
        );
      }
    }

    if (object.category === "sofa" || object.category === "chair") {
      const nearestTv = getNearestObject(object, groupedTvObjects);

      if (nearestTv) {
        const distanceToTv = Math.hypot(
          object.position.x - nearestTv.position.x,
          object.position.z - nearestTv.position.z,
        );
        const seatWeight = object.category === "sofa" ? 34 : 20;
        const distancePenalty =
          distanceToTv < 1.25
            ? (1.25 - distanceToTv) * 18
            : distanceToTv > 4.8
              ? (distanceToTv - 4.8) * 5
              : 0;

        return (
          total +
          (1 - getFacingQuality(object, nearestTv.position)) * seatWeight +
          (1 - getFacingQuality(nearestTv, object.position)) * 24 +
          distancePenalty
        );
      }

      return total + (1 - getFacingQuality(object, roomCenter)) * 5;
    }

    if (shouldPreferWallPlacement(object)) {
      return total + (1 - getFacingQuality(object, roomCenter)) * 6;
    }

    return total;
  }, 0);
};

const orientSocialObjects = (roomData: RoomData, objects: RoomObject[]) => {
  const roomCenter = {
    x: roomData.room.width / 2,
    z: roomData.room.depth / 2,
  };

  return objects.map((object) => {
    if (isFixedDuringRandomize(object)) {
      return object;
    }

    const explicitGroupObjects = getExplicitGroupObjects(roomData, object.id, objects);
    const groupedTables = explicitGroupObjects.filter(
      (entry) => entry.category === "table" && entry.id !== object.id,
    );
    const groupedTvs = explicitGroupObjects.filter(
      (entry) => entry.category === "tv_unit" && entry.id !== object.id,
    );

    if (object.category === "chair") {
      const nearestTable = getNearestObject(object, groupedTables);

      if (nearestTable) {
        return {
          ...object,
          rotation: getFacingRotation(object.position, nearestTable.position),
        };
      }
    }

    if (
      !shouldPreferWallPlacement(object) &&
      (object.category === "sofa" || object.category === "chair" || getObjectBaseShape(object) === "piano")
    ) {
      const nearestTv = getNearestObject(object, groupedTvs);

      return {
        ...object,
        rotation: getFacingRotation(
          object.position,
          nearestTv?.position ?? roomCenter,
        ),
      };
    }

    if (object.category === "tv_unit") {
      const nearestSeat = getNearestObject(
        object,
        explicitGroupObjects.filter(
          (entry) =>
            (entry.category === "sofa" || entry.category === "chair") &&
            entry.id !== object.id,
        ),
      );

      return {
        ...object,
        rotation: getFacingRotation(object.position, nearestSeat?.position ?? roomCenter),
      };
    }

    if (shouldPreferWallPlacement(object)) {
      return {
        ...object,
        rotation: getFacingRotation(object.position, roomCenter),
      };
    }

    return object;
  });
};

const clampOpening = (roomData: RoomData, opening: Opening): Opening => {
  const wallLength = getWallLength(roomData.room, opening.wallId);
  const minPosition = opening.width / 2 + 0.2;
  const maxPosition = Math.max(minPosition, wallLength - opening.width / 2 - 0.2);

  return {
    ...opening,
    width: Math.max(0.3, Number(opening.width.toFixed(2))),
    rotation:
      typeof opening.rotation === "number"
        ? normalizeRotation(opening.rotation)
        : opening.rotation,
    position: Math.min(maxPosition, Math.max(minPosition, Number(opening.position.toFixed(2)))),
  };
};

const getRoomBoundsFromWalls = (walls: WallSegment[]) => {
  const points = walls.flatMap((wall) => [wall.from, wall.to]);
  const maxX = Math.max(...points.map(([x]) => x), 2.4);
  const maxZ = Math.max(...points.map(([, z]) => z), 2.4);

  return {
    width: Math.max(2.4, Number(maxX.toFixed(2))),
    depth: Math.max(2.4, Number(maxZ.toFixed(2))),
  };
};

const normalizeCustomRoom = (room: RoomDefinition, walls: WallSegment[]) => {
  const bounds = getRoomBoundsFromWalls(walls);
  const nextRoom: RoomDefinition = {
    ...room,
    shape: "custom",
    width: bounds.width,
    depth: bounds.depth,
    cutoutWidth: 0,
    cutoutDepth: 0,
    walls,
  };

  return {
    ...nextRoom,
    openings: room.openings.map((opening) => normalizeOpeningForRoom(nextRoom, opening)),
  };
};

const hasBlockingWarnings = (roomData: RoomData, objects: RoomObject[]) =>
  validateRoomLayout({
    ...roomData,
    objects,
  }).some((warning) => warning.level === "error" || warning.code === "collision");

const normalizeRoomObjects = (roomData: RoomData, objects: RoomObject[]) =>
  objects.map((object) => {
    const maxHeight = Math.max(0.05, roomData.room.height - getMountHeight(object));
    const safeHeight = clampDimension(
      object.dimensions.height,
      object.dimensions.height,
      maxHeight,
    );
    const normalizedObject: RoomObject = {
      ...object,
      dimensions: {
        width: clampDimension(object.dimensions.width, object.dimensions.width),
        depth: clampDimension(object.dimensions.depth, object.dimensions.depth),
        height: safeHeight,
      },
    };

    if (isWallAttachedObject(normalizedObject)) {
      const placement = getWallAttachedObjectTransform(
        roomData,
        normalizedObject,
        normalizedObject.position,
      );

      return {
        ...normalizedObject,
        position: placement.position,
        rotation: placement.rotation,
      };
    }

    return {
      ...normalizedObject,
      position: clampObjectPositionToRoom(
        roomData,
        normalizedObject,
        normalizedObject.position,
        normalizedObject.rotation,
      ),
    };
  });

const pushObjectOutsideZone = (
  roomData: RoomData,
  object: RoomObject,
  zone: ReturnType<typeof getActiveClearanceZones>[number],
) => {
  const bounds = getObjectBounds(object);
  const padding = 0.08;
  const candidates = [
    { x: zone.minX - bounds.maxX - padding, z: 0 },
    { x: zone.maxX - bounds.minX + padding, z: 0 },
    { x: 0, z: zone.minZ - bounds.maxZ - padding },
    { x: 0, z: zone.maxZ - bounds.minZ + padding },
  ]
    .map((delta) => {
      const moved = moveRandomObjectBy(roomData, object, delta);

      return {
        object: moved,
        distance: Math.hypot(delta.x, delta.z),
        stillBlocked: objectIntersectsZone(moved, zone),
      };
    })
    .sort((left, right) => {
      if (left.stillBlocked !== right.stillBlocked) {
        return left.stillBlocked ? 1 : -1;
      }

      return left.distance - right.distance;
    });

  return candidates[0]?.object ?? object;
};

const resolveRandomCollisionPair = (
  roomData: RoomData,
  objects: RoomObject[],
  leftIndex: number,
  rightIndex: number,
) => {
  const left = objects[leftIndex];
  const right = objects[rightIndex];

  if (shouldIgnorePlacementCollision(left, right)) {
    return false;
  }

  const leftBounds = getObjectBounds(left);
  const rightBounds = getObjectBounds(right);
  const padding = 0.04;

  if (!boundsIntersect(leftBounds, rightBounds, padding)) {
    return false;
  }

  const leftRepairable = canRepairRandomObject(left);
  const rightRepairable = canRepairRandomObject(right);

  if (!leftRepairable && !rightRepairable) {
    return false;
  }

  const leftArea = left.dimensions.width * left.dimensions.depth;
  const rightArea = right.dimensions.width * right.dimensions.depth;
  const moveLeft = leftRepairable && (!rightRepairable || leftArea <= rightArea);
  const moverIndex = moveLeft ? leftIndex : rightIndex;
  const anchor = moveLeft ? right : left;
  const mover = objects[moverIndex];
  const moverBounds = moveLeft ? leftBounds : rightBounds;
  const anchorBounds = moveLeft ? rightBounds : leftBounds;
  const overlapX =
    Math.min(moverBounds.maxX, anchorBounds.maxX) -
    Math.max(moverBounds.minX, anchorBounds.minX) +
    padding;
  const overlapZ =
    Math.min(moverBounds.maxZ, anchorBounds.maxZ) -
    Math.max(moverBounds.minZ, anchorBounds.minZ) +
    padding;
  const directionX = mover.position.x >= anchor.position.x ? 1 : -1;
  const directionZ = mover.position.z >= anchor.position.z ? 1 : -1;
  const delta =
    overlapX <= overlapZ
      ? { x: directionX * (overlapX + 0.04), z: 0 }
      : { x: 0, z: directionZ * (overlapZ + 0.04) };
  const moved = moveRandomObjectBy(roomData, mover, delta);

  if (positionsEqual(mover.position, moved.position)) {
    return false;
  }

  objects[moverIndex] = moved;
  return true;
};

const stabilizeRandomLayout = (roomData: RoomData, objects: RoomObject[]) => {
  let layout = orientSocialObjects(
    roomData,
    objects.map((object) => cloneRoomObject(object)),
  ).map((object) => {
    if (isFixedDuringRandomize(object)) {
      return object;
    }

    return normalizeRoomObjects(roomData, [object])[0];
  });
  const zones = getActiveClearanceZones(roomData);

  for (let pass = 0; pass < 8; pass += 1) {
    let changed = false;

    layout = layout.map((object) => {
      if (isFixedDuringRandomize(object)) {
        return object;
      }

      const normalized = normalizeRoomObjects(roomData, [object])[0];

      if (
        !positionsEqual(object.position, normalized.position) ||
        normalizeRotation(object.rotation) !== normalizeRotation(normalized.rotation)
      ) {
        changed = true;
      }

      return normalized;
    });

    layout = layout.map((object) => {
      if (!canRepairRandomObject(object)) {
        return object;
      }

      return zones.reduce((current, zone) => {
        if (!objectIntersectsZone(current, zone)) {
          return current;
        }

        const next = pushObjectOutsideZone(roomData, current, zone);

        if (!positionsEqual(current.position, next.position)) {
          changed = true;
        }

        return next;
      }, object);
    });

    for (let leftIndex = 0; leftIndex < layout.length; leftIndex += 1) {
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < layout.length;
        rightIndex += 1
      ) {
        if (resolveRandomCollisionPair(roomData, layout, leftIndex, rightIndex)) {
          changed = true;
        }
      }
    }

    if (!changed) {
      break;
    }
  }

  return layout.map((object) => ({
    ...object,
    position: {
      x: Number(object.position.x.toFixed(3)),
      z: Number(object.position.z.toFixed(3)),
    },
    rotation: Math.round(normalizeRotation(object.rotation)),
  }));
};

const createObjectFromTemplate = (
  template: InventoryTemplate,
  roomData: RoomData,
  position?: RoomObject["position"],
): RoomObject => {
  const structural = Boolean(template.params.structural);
  const height = Math.min(
    template.dimensions.height,
    Math.max(
      0.05,
      roomData.room.height -
        (typeof template.params.mountHeight === "number" ? template.params.mountHeight : 0),
    ),
  );
  const baseObject: RoomObject = {
    id: createObjectId(template.category),
    label: template.label,
    labelKey: template.labelKey,
    category: template.category,
    generator: template.generator,
    position: position ?? {
      x: roomData.room.width / 2,
      z: roomData.room.depth / 2,
    },
    rotation: template.rotation ?? 0,
    dimensions: {
      ...template.dimensions,
      height,
    },
    color: template.color,
    movable: !structural,
    locked: structural,
    params: { ...template.params },
  };

  if (isWallAttachedObject(baseObject)) {
    const placement = getWallAttachedObjectTransform(
      roomData,
      baseObject,
      baseObject.position,
    );

    return {
      ...baseObject,
      position: placement.position,
      rotation: placement.rotation,
    };
  }

  return {
    ...baseObject,
    position: clampObjectPositionToRoom(
      roomData,
      baseObject,
      baseObject.position,
      baseObject.rotation,
    ),
  };
};

type RandomLayoutOption = {
  id: string;
  label: string;
  objects: RoomObject[];
  warnings: LayoutWarning[];
};

const getRoomDataSignature = (
  roomData: RoomData,
  objects: RoomObject[] = roomData.objects,
) =>
  JSON.stringify({
    room: {
      shape: roomData.room.shape,
      width: Number(roomData.room.width.toFixed(2)),
      depth: Number(roomData.room.depth.toFixed(2)),
      height: Number(roomData.room.height.toFixed(2)),
      cutoutWidth: Number(roomData.room.cutoutWidth.toFixed(2)),
      cutoutDepth: Number(roomData.room.cutoutDepth.toFixed(2)),
      walls: roomData.room.walls,
      openings: roomData.room.openings,
    },
    constraints: roomData.constraints,
    groups: getRoomGroups(roomData).map((group) => ({
      ...group,
      objectIds: [...group.objectIds].sort(),
    })),
    objects: objects
      .map((object) => ({
        id: object.id,
        labelKey: object.labelKey,
        category: object.category,
        generator: object.generator,
        position: {
          x: Number(object.position.x.toFixed(2)),
          z: Number(object.position.z.toFixed(2)),
        },
        rotation: Math.round(normalizeRotation(object.rotation)),
        dimensions: {
          width: Number(object.dimensions.width.toFixed(2)),
          depth: Number(object.dimensions.depth.toFixed(2)),
          height: Number(object.dimensions.height.toFixed(2)),
        },
        color: object.color,
        movable: object.movable,
        locked: object.locked,
        params: object.params,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  });

const tryRandomLayout = (roomData: RoomData, objects: RoomObject[]) => {
  const fixedObjects = objects
    .filter((object) => isFixedDuringRandomize(object))
    .map((object) => cloneRoomObject(object));
  const movableObjects = objects
    .filter((object) => !isFixedDuringRandomize(object))
    .map((object) => cloneRoomObject(object))
    .sort(
      (left, right) =>
        right.dimensions.width * right.dimensions.depth -
        left.dimensions.width * left.dimensions.depth,
    );

  const sourceMap = new Map(objects.map((object) => [object.id, object]));

  const scoreLayout = (layoutObjects: RoomObject[], includeValidation = true) => {
    const orientedObjects = orientSocialObjects(roomData, layoutObjects);
    const validationPenalty = includeValidation
      ? validateRoomLayout({
          ...roomData,
          objects: orientedObjects,
        }).reduce(
          (total, warning) => total + (warning.level === "error" ? 1000 : 120),
          0,
        )
      : 0;

    return validationPenalty + getDesignPenalty(roomData, orientedObjects);
  };

  const movementScore = (layoutObjects: RoomObject[]) =>
    layoutObjects.reduce((total, object) => {
      if (isFixedDuringRandomize(object)) {
        return total;
      }

      const sourceObject = sourceMap.get(object.id);

      if (!sourceObject) {
        return total;
      }

      const rotationDelta = Math.abs(object.rotation - sourceObject.rotation) % 360;
      const shortestRotation = Math.min(rotationDelta, 360 - rotationDelta);

      return (
        total +
        Math.hypot(
          object.position.x - sourceObject.position.x,
          object.position.z - sourceObject.position.z,
        ) +
        shortestRotation / 90
      );
    }, 0);

  let bestObjects: RoomObject[] = [
    ...fixedObjects,
    ...movableObjects.map((object) => cloneRoomObject(object)),
  ];
  let bestScore = scoreLayout(bestObjects);
  let bestMovement = movementScore(bestObjects);

  const layoutAttempts = movableObjects.length > 24 ? 8 : movableObjects.length > 12 ? 10 : 12;
  const candidateAttempts = movableObjects.length > 24 ? 16 : movableObjects.length > 12 ? 24 : 34;

  for (let layoutAttempt = 0; layoutAttempt < layoutAttempts; layoutAttempt += 1) {
    const draftObjects = fixedObjects.map((object) => cloneRoomObject(object));

    movableObjects.forEach((object) => {
      const draft = cloneRoomObject(object);
      let bestCandidate: RoomObject | null = null;
      let bestCandidateScore = Number.POSITIVE_INFINITY;
      let bestCandidateMovement = Number.NEGATIVE_INFINITY;
      const rotations = [0, 90, 180, 270];

      for (let attempt = 0; attempt < candidateAttempts; attempt += 1) {
        const rotation = rotations[Math.floor(Math.random() * rotations.length)];
        const desiredPosition = {
          x: 0.3 + Math.random() * Math.max(0.4, roomData.room.width - 0.6),
          z: 0.3 + Math.random() * Math.max(0.4, roomData.room.depth - 0.6),
        };
        const candidate = { ...draft };

        if (isWallAttachedObject(candidate) || shouldPreferWallPlacement(candidate)) {
          const placement = getWallAttachedObjectTransform(
            roomData,
            candidate,
            desiredPosition,
          );

          candidate.position = placement.position;
          candidate.rotation = placement.rotation;
        } else {
          candidate.rotation = rotation;
          candidate.position = clampObjectPositionToRoom(
            roomData,
            candidate,
            desiredPosition,
            rotation,
          );
        }
        const intersects = draftObjects.some((existing) => {
          if (shouldIgnorePlacementCollision(existing, candidate)) {
            return false;
          }

          return boundsIntersect(getObjectBounds(existing), getObjectBounds(candidate), 0.06);
        });

        if (intersects) {
          continue;
        }

        const draftWithCandidate = [...draftObjects, candidate];
        const candidateWarnings = validateRoomLayout({
          ...roomData,
          objects: orientSocialObjects(roomData, draftWithCandidate),
        });
        const candidateCausesWarning = candidateWarnings.some(
          (warning) =>
            warning.objectId === candidate.id ||
            warning.relatedObjectId === candidate.id,
        );

        if (candidateCausesWarning) {
          continue;
        }

        const candidateScore = scoreLayout(draftWithCandidate);
        const candidateMovement =
          Math.hypot(
            candidate.position.x - object.position.x,
            candidate.position.z - object.position.z,
          ) + Math.abs(candidate.rotation - object.rotation) / 90;

        if (
          candidateScore < bestCandidateScore ||
          (candidateScore === bestCandidateScore &&
            candidateMovement > bestCandidateMovement)
        ) {
          bestCandidate = candidate;
          bestCandidateScore = candidateScore;
          bestCandidateMovement = candidateMovement;
        }
      }

      if (bestCandidate) {
        draftObjects.push(bestCandidate);
        return;
      }

      if (isWallAttachedObject(draft) || shouldPreferWallPlacement(draft)) {
        const placement = getWallAttachedObjectTransform(
          roomData,
          draft,
          draft.position,
        );

        draftObjects.push({
          ...draft,
          position: placement.position,
          rotation: placement.rotation,
        });
        return;
      }

      draftObjects.push({
        ...draft,
        position: clampObjectPositionToRoom(
          roomData,
          draft,
          draft.position,
          draft.rotation,
        ),
      });
    });

    const layoutScore = scoreLayout(draftObjects);
    const layoutMovement = movementScore(draftObjects);

    if (
      layoutScore < bestScore ||
      (layoutScore === bestScore && layoutMovement > bestMovement)
    ) {
      bestObjects = orientSocialObjects(roomData, draftObjects).map((object) =>
        cloneRoomObject(object),
      );
      bestScore = layoutScore;
      bestMovement = layoutMovement;
    }
  }

  const needsRepair = hasBlockingWarnings(roomData, bestObjects);
  const resolvedObjects = orientSocialObjects(roomData, bestObjects).map((object) => {
    const sourceObject = sourceMap.get(object.id);
    const withSourceDimensions = sourceObject
      ? {
          ...object,
          dimensions: { ...sourceObject.dimensions },
        }
      : object;

    return needsRepair && !isFixedDuringRandomize(withSourceDimensions)
      ? {
          ...withSourceDimensions,
          position: clampObjectPositionToRoom(
            roomData,
            withSourceDimensions,
            withSourceDimensions.position,
            withSourceDimensions.rotation,
          ),
        }
      : withSourceDimensions;
  });

  return stabilizeRandomLayout(roomData, resolvedObjects);
};

const getRandomLayoutSourceObjects = (roomData: RoomData) => {
  const fixedCurrentObjects = roomData.objects
    .filter((object) => isFixedDuringRandomize(object))
    .map((object) => cloneRoomObject(object));
  const fixedIds = new Set(fixedCurrentObjects.map((object) => object.id));
  const movableSourceObjects = roomData.objects
    .filter((object) => !isFixedDuringRandomize(object))
    .map((object) => cloneRoomObject(object));

  return [
    ...fixedCurrentObjects,
    ...movableSourceObjects.filter((object) => !fixedIds.has(object.id)),
  ];
};

const getLayoutSignature = (objects: RoomObject[]) =>
  objects
    .map(
      (object) =>
        `${object.id}:${object.position.x.toFixed(1)}:${object.position.z.toFixed(
          1,
        )}:${Math.round(object.rotation / 15) * 15}`,
    )
    .sort()
    .join("|");

const getRandomLayoutOptionCount = (objectCount: number) => {
  if (objectCount > 28) {
    return 18;
  }

  if (objectCount > 18) {
    return 24;
  }

  if (objectCount > 10) {
    return 32;
  }

  return 40;
};

const createRandomLayoutOptions = (
  roomData: RoomData,
  sourceLayoutObjects: RoomObject[],
): RandomLayoutOption[] => {
  const optionCount = getRandomLayoutOptionCount(sourceLayoutObjects.length);
  const options: RandomLayoutOption[] = [];
  const seenSignatures = new Set<string>();
  const maxAttempts = optionCount * 10;

  for (
    let attempt = 0;
    attempt < maxAttempts && options.length < optionCount;
    attempt += 1
  ) {
    const objects = tryRandomLayout(roomData, sourceLayoutObjects);
    const signature = getLayoutSignature(objects);

    if (seenSignatures.has(signature)) {
      continue;
    }

    seenSignatures.add(signature);
    const warnings = validateRoomLayout({
      ...roomData,
      objects,
    });

    if (warnings.length) {
      continue;
    }

    const option = {
      id: `random_${options.length + 1}`,
      label: `random_${options.length + 1}`,
      objects,
      warnings,
    };

    options.push(option);
  }

  if (!options.length) {
    const fallbackObjects = stabilizeRandomLayout(
      roomData,
      sourceLayoutObjects,
    );
    const fallbackWarnings = validateRoomLayout({
      ...roomData,
      objects: fallbackObjects,
    });

    if (!fallbackWarnings.length) {
      options.push({
        id: "random_1",
        label: "random_1",
        objects: fallbackObjects,
        warnings: fallbackWarnings,
      });
    }
  }

  return options
    .sort(
      (left, right) =>
        getDesignPenalty(roomData, left.objects) - getDesignPenalty(roomData, right.objects),
    )
    .map((option, index) => ({
      ...option,
      label: `random_${index + 1}`,
    }));
};

interface RoomStore {
  roomData: RoomData;
  selectedObjectId: string | null;
  selectedObjectIds: string[];
  selectedGroupId: string | null;
  cameraMode: CameraMode;
  transformMode: TransformMode;
  validationWarnings: LayoutWarning[];
  historyPast: RoomData[];
  historyFuture: RoomData[];
  lastEditorStatus: EditorStatus;
  activeTransformObjectId: string | null;
  clipboardObject: RoomObject | null;
  randomLayoutOptions: RandomLayoutOption[];
  activeRandomLayoutOptionId: string | null;
  randomLayoutSourceSignature: string | null;
  randomLayoutOptionSignatures: string[];
  setSelectedObjectId: (objectId: string | null) => void;
  toggleObjectSelection: (objectId: string) => void;
  setSelectedObjectIds: (objectIds: string[]) => void;
  selectGroup: (groupId: string) => void;
  setCameraMode: (mode: CameraMode) => void;
  setTransformMode: (mode: TransformMode) => void;
  beginTransform: (objectId: string) => void;
  beginStructureTransform: (structureId: string) => void;
  endTransform: () => void;
  updateRoomProperties: (payload: {
    shape?: RoomShape;
    purpose?: RoomPurpose;
    width?: number;
    depth?: number;
    height?: number;
    cutoutWidth?: number;
    cutoutDepth?: number;
  }) => void;
  updateOpening: (
    openingId: string,
    payload: Partial<Pick<Opening, "wallId" | "position" | "width" | "rotation">>,
  ) => void;
  updateOpeningTransform: (
    openingId: string,
    payload: {
      position?: { x: number; z: number };
      rotationY?: number;
    },
  ) => void;
  updateWallSegment: (
    wallId: string,
    payload: Partial<{
      from: [number, number];
      to: [number, number];
    }>,
  ) => void;
  splitWall: (wallId: string) => void;
  updateObjectTransform: (
    objectId: string,
    payload: Partial<Pick<RoomObject, "rotation" | "position">> & {
      mountHeight?: number;
    },
  ) => void;
  updateObjectProperties: (
    objectId: string,
    payload: {
      position?: Partial<RoomObject["position"]>;
      rotation?: number;
      dimensions?: Partial<RoomObject["dimensions"]>;
      color?: string;
    },
  ) => void;
  addObjectFromTemplate: (
    templateId: string,
    position?: RoomObject["position"],
  ) => void;
  deleteObject: (objectId?: string) => void;
  deleteSelectedObjects: () => void;
  groupSelectedObjects: () => void;
  ungroupSelectedObjects: () => void;
  toggleSelectedObjectsLock: (locked?: boolean) => void;
  copySelectedObject: () => void;
  cutSelectedObject: () => void;
  pasteClipboardObject: () => void;
  randomizeLayout: () => void;
  applyRandomLayoutOption: (optionId: string) => void;
  clearRandomLayoutOptions: () => void;
  randomizeSelectedObjects: () => void;
  saveRoomSnapshot: () => void;
  rotateObjectBy: (objectId: string, delta: number) => void;
  toggleObjectLock: (objectId: string) => void;
  undo: () => void;
  redo: () => void;
  resetRoom: (mode?: "default" | "saved") => void;
}

export const useRoomStore = create<RoomStore>((set) => ({
  roomData: cloneRoomData(defaultRoom),
  selectedObjectId: "sofa_1",
  selectedObjectIds: ["sofa_1"],
  selectedGroupId: null,
  cameraMode: "orbit",
  transformMode: "select",
  validationWarnings: validateRoomLayout(defaultRoom),
  historyPast: [],
  historyFuture: [],
  lastEditorStatus: { key: "roomLoaded" },
  activeTransformObjectId: null,
  clipboardObject: null,
  randomLayoutOptions: [],
  activeRandomLayoutOptionId: null,
  randomLayoutSourceSignature: null,
  randomLayoutOptionSignatures: [],
  setSelectedObjectId: (objectId) =>
    set({
      selectedObjectId: objectId,
      selectedObjectIds: objectId ? [objectId] : [],
      selectedGroupId: null,
      lastEditorStatus: objectId
        ? { key: "objectSelected", objectId }
        : { key: "selectionCleared" },
    }),
  toggleObjectSelection: (objectId) =>
    set((state) => {
      const selectedObjectIds = state.selectedObjectIds.includes(objectId)
        ? state.selectedObjectIds.filter((selectedId) => selectedId !== objectId)
        : [...state.selectedObjectIds, objectId];

      return {
        selectedObjectId: objectId,
        selectedObjectIds,
        selectedGroupId: null,
        lastEditorStatus: {
          key: selectedObjectIds.length ? "selectionUpdated" : "selectionCleared",
        },
      };
    }),
  setSelectedObjectIds: (objectIds) =>
    set({
      selectedObjectId: objectIds.at(-1) ?? null,
      selectedObjectIds: Array.from(new Set(objectIds)),
      selectedGroupId: null,
      lastEditorStatus: objectIds.length
        ? { key: "selectionUpdated" }
        : { key: "selectionCleared" },
    }),
  selectGroup: (groupId) =>
    set((state) => {
      const group = getRoomGroups(state.roomData).find((entry) => entry.id === groupId);

      if (!group) {
        return state;
      }

      return {
        selectedObjectId: group.objectIds.at(-1) ?? null,
        selectedObjectIds: group.objectIds,
        selectedGroupId: group.id,
        lastEditorStatus: { key: "selectionUpdated" },
      };
    }),
  setCameraMode: (mode) =>
    set({
      cameraMode: mode,
      lastEditorStatus: { key: mode === "orbit" ? "cameraOrbit" : "cameraTop" },
    }),
  setTransformMode: (mode) =>
    set({
      transformMode: mode,
      lastEditorStatus: {
        key:
          mode === "select"
            ? "modeSelect"
            : mode === "translate"
              ? "modeTranslate"
              : "modeRotate",
      },
    }),
  beginTransform: (objectId) =>
    set((state) => {
      if (state.activeTransformObjectId === objectId) {
        return state;
      }

      return {
        activeTransformObjectId: objectId,
        historyPast: limitHistory([
          ...state.historyPast,
          cloneRoomData(state.roomData),
        ]),
        historyFuture: [],
        lastEditorStatus: { key: "objectEditing", objectId },
      };
    }),
  beginStructureTransform: (structureId) =>
    set((state) => {
      if (state.activeTransformObjectId === structureId) {
        return state;
      }

      return {
        activeTransformObjectId: structureId,
        historyPast: limitHistory([
          ...state.historyPast,
          cloneRoomData(state.roomData),
        ]),
        historyFuture: [],
        lastEditorStatus: { key: "openingUpdated" },
      };
    }),
  endTransform: () =>
    set((state) => ({
      activeTransformObjectId: null,
      lastEditorStatus: state.activeTransformObjectId
        ? state.activeTransformObjectId.startsWith("wall_") ||
          state.activeTransformObjectId.startsWith("door_") ||
          state.activeTransformObjectId.startsWith("window_") ||
          state.activeTransformObjectId.startsWith("radiator_")
          ? { key: "openingUpdated" }
          : { key: "objectUpdated", objectId: state.activeTransformObjectId }
        : state.lastEditorStatus,
    })),
  updateRoomProperties: (payload) =>
    set((state) => {
      if (payload.shape !== undefined || payload.purpose !== undefined) {
        const nextShape = payload.shape ?? state.roomData.room.shape;
        const nextPurpose =
          payload.purpose ?? state.roomData.room.purpose ?? "living";
        const roomData = createRoomPreset(nextShape, nextPurpose);
        const selectedObjectId = roomData.objects[0]?.id ?? null;

        return {
          roomData,
          selectedObjectId,
          selectedObjectIds: selectedObjectId ? [selectedObjectId] : [],
          selectedGroupId: null,
          validationWarnings: validateRoomLayout(roomData),
          randomLayoutOptions: [],
          activeRandomLayoutOptionId: null,
          randomLayoutSourceSignature: null,
          randomLayoutOptionSignatures: [],
          historyPast: limitHistory([
            ...state.historyPast,
            cloneRoomData(state.roomData),
          ]),
          historyFuture: [],
          lastEditorStatus: { key: "roomPresetApplied" },
        };
      }

      const roomData = cloneRoomData(state.roomData);
      roomData.room = resizeRoomDefinition(roomData.room, payload);
      roomData.room.openings = roomData.room.openings.map((opening) =>
        normalizeOpeningForRoom(roomData.room, clampOpening(roomData, opening)),
      );
      roomData.objects = normalizeRoomObjects(roomData, roomData.objects);

      return {
        roomData,
        validationWarnings: validateRoomLayout(roomData),
        randomLayoutOptions: [],
        activeRandomLayoutOptionId: null,
        randomLayoutSourceSignature: null,
        randomLayoutOptionSignatures: [],
        historyPast: limitHistory([
          ...state.historyPast,
          cloneRoomData(state.roomData),
        ]),
        historyFuture: [],
        lastEditorStatus: { key: "roomUpdated" },
      };
    }),
  updateOpening: (openingId, payload) =>
    set((state) => {
      const roomData = cloneRoomData(state.roomData);
      roomData.room.openings = roomData.room.openings.map((opening) =>
        opening.id === openingId
          ? normalizeOpeningForRoom(
              roomData.room,
              clampOpening(roomData, {
                ...opening,
                ...payload,
              }),
            )
          : opening,
      );

      return {
        roomData,
        validationWarnings: validateRoomLayout(roomData),
        historyPast: limitHistory([
          ...state.historyPast,
          cloneRoomData(state.roomData),
        ]),
        historyFuture: [],
        lastEditorStatus: { key: "openingUpdated" },
      };
    }),
  updateOpeningTransform: (openingId, payload) =>
    set((state) => {
      const roomData = cloneRoomData(state.roomData);
      const opening = roomData.room.openings.find((entry) => entry.id === openingId);

      if (!opening) {
        return state;
      }

      const rotationWall =
        payload.rotationY !== undefined
          ? findWallByRotation(roomData.room, payload.rotationY)
          : null;
      const projection = payload.position
        ? projectPointToWall(
            roomData.room,
            payload.position,
            rotationWall?.id ?? opening.wallId,
          )
        : null;
      const nextOpening = normalizeOpeningForRoom(
        roomData.room,
        clampOpening(roomData, {
          ...opening,
          wallId: projection?.wall.id ?? rotationWall?.id ?? opening.wallId,
          position: projection?.along ?? opening.position,
          rotation:
            payload.rotationY !== undefined
              ? normalizeRotation((payload.rotationY * 180) / Math.PI)
              : opening.rotation,
        }),
      );

      roomData.room.openings = roomData.room.openings.map((entry) =>
        entry.id === openingId ? nextOpening : entry,
      );

      return {
        roomData,
        validationWarnings: validateRoomLayout(roomData),
        randomLayoutOptions: [],
        activeRandomLayoutOptionId: null,
        randomLayoutSourceSignature: null,
        randomLayoutOptionSignatures: [],
      };
    }),
  updateWallSegment: (wallId, payload) =>
    set((state) => {
      const roomData = cloneRoomData(state.roomData);
      const wallIndex = roomData.room.walls.findIndex((wall) => wall.id === wallId);

      if (wallIndex < 0) {
        return state;
      }

      const walls = roomData.room.walls.map((wall) => ({ ...wall }));
      const previousIndex = wallIndex === 0 ? walls.length - 1 : wallIndex - 1;
      const nextIndex = wallIndex === walls.length - 1 ? 0 : wallIndex + 1;
      const sanitizePoint = ([x, z]: [number, number]) =>
        [
          Number(Math.max(0, Number.isFinite(x) ? x : 0).toFixed(2)),
          Number(Math.max(0, Number.isFinite(z) ? z : 0).toFixed(2)),
        ] as [number, number];

      if (payload.from) {
        const nextFrom = sanitizePoint(payload.from);
        walls[wallIndex].from = nextFrom;
        walls[previousIndex].to = nextFrom;
      }

      if (payload.to) {
        const nextTo = sanitizePoint(payload.to);
        walls[wallIndex].to = nextTo;
        walls[nextIndex].from = nextTo;
      }

      roomData.room = normalizeCustomRoom(roomData.room, walls);
      roomData.objects = normalizeRoomObjects(roomData, roomData.objects);

      return {
        roomData,
        validationWarnings: validateRoomLayout(roomData),
        randomLayoutOptions: [],
        activeRandomLayoutOptionId: null,
        historyPast: limitHistory([
          ...state.historyPast,
          cloneRoomData(state.roomData),
        ]),
        historyFuture: [],
        lastEditorStatus: { key: "wallUpdated" },
      };
    }),
  splitWall: (wallId) =>
    set((state) => {
      const roomData = cloneRoomData(state.roomData);
      const wallIndex = roomData.room.walls.findIndex((wall) => wall.id === wallId);

      if (wallIndex < 0) {
        return state;
      }

      const walls = roomData.room.walls.map((wall) => ({ ...wall }));
      const wall = walls[wallIndex];
      const length = getWallLength(roomData.room, wall.id);

      if (length < 1.2) {
        return state;
      }

      const midpoint = [
        Number(((wall.from[0] + wall.to[0]) / 2).toFixed(2)),
        Number(((wall.from[1] + wall.to[1]) / 2).toFixed(2)),
      ] as [number, number];
      const originalTo = wall.to;
      const newWall: WallSegment = {
        id: createWallId(walls),
        from: midpoint,
        to: originalTo,
      };

      walls[wallIndex] = {
        ...wall,
        to: midpoint,
      };
      walls.splice(wallIndex + 1, 0, newWall);

      const splitAt = length / 2;
      const openings = roomData.room.openings.map((opening) => {
        if (opening.wallId !== wallId || opening.position <= splitAt) {
          return opening;
        }

        return {
          ...opening,
          wallId: newWall.id,
          position: opening.position - splitAt,
        };
      });

      roomData.room = normalizeCustomRoom(
        {
          ...roomData.room,
          openings,
        },
        walls,
      );
      roomData.objects = normalizeRoomObjects(roomData, roomData.objects);

      return {
        roomData,
        validationWarnings: validateRoomLayout(roomData),
        randomLayoutOptions: [],
        activeRandomLayoutOptionId: null,
        randomLayoutSourceSignature: null,
        randomLayoutOptionSignatures: [],
        historyPast: limitHistory([
          ...state.historyPast,
          cloneRoomData(state.roomData),
        ]),
        historyFuture: [],
        lastEditorStatus: { key: "wallSplit" },
      };
    }),
  updateObjectTransform: (objectId, payload) =>
    set((state) => {
      const roomData = cloneRoomData(state.roomData);

      updateObjectInRoom(roomData, objectId, (object) => {
        if (object.locked || !object.movable) {
          return;
        }

        const nextRotation = normalizeRotation(payload.rotation ?? object.rotation);
        const desiredPosition = payload.position ?? object.position;

        if (isWallAttachedObject(object)) {
          if (typeof payload.mountHeight === "number") {
            object.params.mountHeight = clampDimension(
              payload.mountHeight,
              getMountHeight(object),
              Math.max(0.05, roomData.room.height - object.dimensions.height),
            );
          }

          const placement = getWallAttachedObjectTransform(
            roomData,
            object,
            desiredPosition,
          );

          object.position = placement.position;
          object.rotation = placement.rotation;
          return;
        }

        object.position = clampObjectPositionToRoom(
          roomData,
          object,
          desiredPosition,
          nextRotation,
        );
        object.rotation = nextRotation;
      });

      return {
        roomData,
        validationWarnings: validateRoomLayout(roomData),
        randomLayoutOptions: [],
        activeRandomLayoutOptionId: null,
        randomLayoutSourceSignature: null,
        randomLayoutOptionSignatures: [],
      };
    }),
  updateObjectProperties: (objectId, payload) =>
    set((state) => {
      const roomData = cloneRoomData(state.roomData);

      updateObjectInRoom(roomData, objectId, (object) => {
        if (object.locked || !object.movable) {
          return;
        }

        const maxHeight = Math.max(0.05, roomData.room.height - getMountHeight(object));
        const nextRotation = normalizeRotation(payload.rotation ?? object.rotation);
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
            maxHeight,
          ),
        };
        const desiredPosition = {
          x: payload.position?.x ?? object.position.x,
          z: payload.position?.z ?? object.position.z,
        };

        object.dimensions = nextDimensions;

        if (isWallAttachedObject(object)) {
          const placement = getWallAttachedObjectTransform(
            roomData,
            object,
            desiredPosition,
          );

          object.position = placement.position;
          object.rotation = placement.rotation;
        } else {
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
      });

      return {
        roomData,
        validationWarnings: validateRoomLayout(roomData),
        randomLayoutOptions: [],
        activeRandomLayoutOptionId: null,
        randomLayoutSourceSignature: null,
        randomLayoutOptionSignatures: [],
        historyPast: limitHistory([
          ...state.historyPast,
          cloneRoomData(state.roomData),
        ]),
        historyFuture: [],
        lastEditorStatus: { key: "objectPropertiesUpdated", objectId },
      };
    }),
  addObjectFromTemplate: (templateId, position) =>
    set((state) => {
      const template = getInventoryTemplateById(templateId);

      if (!template) {
        return state;
      }

      const roomData = cloneRoomData(state.roomData);
      const newObject = createObjectFromTemplate(template, roomData, position);
      roomData.objects.push(newObject);

      return {
        roomData,
        selectedObjectId: newObject.id,
        selectedObjectIds: [newObject.id],
        selectedGroupId: null,
        validationWarnings: validateRoomLayout(roomData),
        randomLayoutOptions: [],
        activeRandomLayoutOptionId: null,
        historyPast: limitHistory([
          ...state.historyPast,
          cloneRoomData(state.roomData),
        ]),
        historyFuture: [],
        lastEditorStatus: { key: "objectAdded", objectId: newObject.id },
      };
    }),
  deleteObject: (objectId) =>
    set((state) => {
      const targetId = objectId ?? state.selectedObjectId;

      if (!targetId) {
        return state;
      }

      const existingTarget = state.roomData.objects.find((object) => object.id === targetId);

      if (!existingTarget) {
        return state;
      }

      const roomData = cloneRoomData(state.roomData);
      roomData.objects = roomData.objects.filter((object) => object.id !== targetId);
      pruneGroups(roomData);
      const nextSelection = roomData.objects.at(-1)?.id ?? null;

      return {
        roomData,
        selectedObjectId: nextSelection,
        selectedObjectIds: nextSelection ? [nextSelection] : [],
        selectedGroupId: null,
        validationWarnings: validateRoomLayout(roomData),
        randomLayoutOptions: [],
        activeRandomLayoutOptionId: null,
        historyPast: limitHistory([
          ...state.historyPast,
          cloneRoomData(state.roomData),
        ]),
        historyFuture: [],
        lastEditorStatus: { key: "objectUpdated", objectId: targetId },
      };
    }),
  deleteSelectedObjects: () =>
    set((state) => {
      if (!state.selectedObjectIds.length) {
        return state;
      }

      const selectedIds = new Set(state.selectedObjectIds);
      const roomData = cloneRoomData(state.roomData);
      roomData.objects = roomData.objects.filter((object) => !selectedIds.has(object.id));
      pruneGroups(roomData);

      return {
        roomData,
        selectedObjectId: null,
        selectedObjectIds: [],
        selectedGroupId: null,
        validationWarnings: validateRoomLayout(roomData),
        randomLayoutOptions: [],
        activeRandomLayoutOptionId: null,
        historyPast: limitHistory([
          ...state.historyPast,
          cloneRoomData(state.roomData),
        ]),
        historyFuture: [],
        lastEditorStatus: { key: "selectionDeleted" },
      };
    }),
  groupSelectedObjects: () =>
    set((state) => {
      const selectedObjectIds = state.selectedObjectIds.filter((objectId) =>
        state.roomData.objects.some((object) => object.id === objectId),
      );

      if (selectedObjectIds.length < 2) {
        return state;
      }

      const roomData = cloneRoomData(state.roomData);
      const existingGroups = getRoomGroups(roomData)
        .map((group) => ({
          ...group,
          objectIds: group.objectIds.filter((objectId) => !selectedObjectIds.includes(objectId)),
        }))
        .filter((group) => group.objectIds.length > 1);
      const newGroup = {
        id: createGroupId(existingGroups),
        label: getNextGroupLabel(roomData, selectedObjectIds),
        objectIds: selectedObjectIds,
      };

      roomData.groups = [...existingGroups, newGroup];

      return {
        roomData,
        selectedObjectId: selectedObjectIds.at(-1) ?? null,
        selectedObjectIds,
        selectedGroupId: newGroup.id,
        randomLayoutOptions: [],
        activeRandomLayoutOptionId: null,
        randomLayoutSourceSignature: null,
        randomLayoutOptionSignatures: [],
        historyPast: limitHistory([
          ...state.historyPast,
          cloneRoomData(state.roomData),
        ]),
        historyFuture: [],
        lastEditorStatus: { key: "groupCreated" },
      };
    }),
  ungroupSelectedObjects: () =>
    set((state) => {
      const selectedIds = new Set(state.selectedObjectIds);
      const roomData = cloneRoomData(state.roomData);
      const groups = getRoomGroups(roomData);
      const selectedGroup = state.selectedGroupId
        ? groups.find((group) => group.id === state.selectedGroupId)
        : null;

      roomData.groups = groups.filter((group) => {
        if (selectedGroup && group.id === selectedGroup.id) {
          return false;
        }

        return !group.objectIds.some((objectId) => selectedIds.has(objectId));
      });

      return {
        roomData,
        selectedGroupId: null,
        randomLayoutOptions: [],
        activeRandomLayoutOptionId: null,
        randomLayoutSourceSignature: null,
        randomLayoutOptionSignatures: [],
        historyPast: limitHistory([
          ...state.historyPast,
          cloneRoomData(state.roomData),
        ]),
        historyFuture: [],
        lastEditorStatus: { key: "groupRemoved" },
      };
    }),
  toggleSelectedObjectsLock: (locked) =>
    set((state) => {
      if (!state.selectedObjectIds.length) {
        return state;
      }

      const selectedIds = new Set(state.selectedObjectIds);
      const roomData = cloneRoomData(state.roomData);
      let nextLocked = locked;

      if (nextLocked === undefined) {
        nextLocked = roomData.objects
          .filter((object) => selectedIds.has(object.id))
          .some((object) => !object.locked);
      }

      roomData.objects = roomData.objects.map((object) =>
        selectedIds.has(object.id)
          ? {
              ...object,
              locked: Boolean(nextLocked),
            }
          : object,
      );

      return {
        roomData,
        validationWarnings: validateRoomLayout(roomData),
        randomLayoutOptions: [],
        activeRandomLayoutOptionId: null,
        historyPast: limitHistory([
          ...state.historyPast,
          cloneRoomData(state.roomData),
        ]),
        historyFuture: [],
        lastEditorStatus: { key: nextLocked ? "selectionLocked" : "selectionUnlocked" },
      };
    }),
  copySelectedObject: () =>
    set((state) => {
      const selectedObject = state.roomData.objects.find(
        (object) => object.id === state.selectedObjectId,
      );

      if (!selectedObject) {
        return state;
      }

      return {
        clipboardObject: cloneRoomObject(selectedObject),
      };
    }),
  cutSelectedObject: () =>
    set((state) => {
      const selectedObject = state.roomData.objects.find(
        (object) => object.id === state.selectedObjectId,
      );

      if (!selectedObject) {
        return state;
      }

      const roomData = cloneRoomData(state.roomData);
      roomData.objects = roomData.objects.filter(
        (object) => object.id !== selectedObject.id,
      );
      pruneGroups(roomData);

      return {
        clipboardObject: cloneRoomObject(selectedObject),
        roomData,
        selectedObjectId: roomData.objects.at(-1)?.id ?? null,
        selectedObjectIds: roomData.objects.at(-1)?.id ? [roomData.objects.at(-1)!.id] : [],
        selectedGroupId: null,
        validationWarnings: validateRoomLayout(roomData),
        historyPast: limitHistory([
          ...state.historyPast,
          cloneRoomData(state.roomData),
        ]),
        historyFuture: [],
      };
    }),
  pasteClipboardObject: () =>
    set((state) => {
      if (!state.clipboardObject) {
        return state;
      }

      const roomData = cloneRoomData(state.roomData);
      const pasted = {
        ...cloneRoomObject(state.clipboardObject),
        id: createObjectId(state.clipboardObject.category),
        locked: false,
        movable: true,
      };
      const pastedPosition = {
        x: pasted.position.x + 0.35,
        z: pasted.position.z + 0.35,
      };

      if (isWallAttachedObject(pasted)) {
        const placement = getWallAttachedObjectTransform(
          roomData,
          pasted,
          pastedPosition,
        );

        pasted.position = placement.position;
        pasted.rotation = placement.rotation;
      } else {
        pasted.position = clampObjectPositionToRoom(
          roomData,
          pasted,
          pastedPosition,
          pasted.rotation,
        );
      }

      roomData.objects.push(pasted);

      return {
        roomData,
        selectedObjectId: pasted.id,
        selectedObjectIds: [pasted.id],
        selectedGroupId: null,
        validationWarnings: validateRoomLayout(roomData),
        randomLayoutOptions: [],
        activeRandomLayoutOptionId: null,
        historyPast: limitHistory([
          ...state.historyPast,
          cloneRoomData(state.roomData),
        ]),
        historyFuture: [],
        lastEditorStatus: { key: "objectAdded", objectId: pasted.id },
      };
    }),
  randomizeLayout: () =>
    set((state) => {
      const roomData = cloneRoomData(state.roomData);
      const currentSignature = getRoomDataSignature(roomData);
      const activeOptionBySignature = state.randomLayoutOptions.find(
        (_option, index) => state.randomLayoutOptionSignatures[index] === currentSignature,
      );

      if (
        state.randomLayoutSourceSignature === currentSignature ||
        (state.randomLayoutOptions.length &&
          state.randomLayoutOptionSignatures.includes(currentSignature))
      ) {
        return {
          activeRandomLayoutOptionId:
            activeOptionBySignature?.id ??
            (state.randomLayoutSourceSignature === currentSignature
              ? null
              : state.activeRandomLayoutOptionId),
          lastEditorStatus: { key: "randomLayoutOptionsReady" },
        };
      }

      const sourceLayoutObjects = getRandomLayoutSourceObjects(roomData);
      const randomLayoutOptions = createRandomLayoutOptions(roomData, sourceLayoutObjects);
      const randomLayoutSourceSignature = currentSignature;
      const randomLayoutOptionSignatures = randomLayoutOptions.map((option) =>
        getRoomDataSignature(roomData, option.objects),
      );

      return {
        randomLayoutOptions,
        activeRandomLayoutOptionId: null,
        randomLayoutSourceSignature,
        randomLayoutOptionSignatures,
        lastEditorStatus: { key: "randomLayoutOptionsReady" },
      };
    }),
  applyRandomLayoutOption: (optionId) =>
    set((state) => {
      const option = state.randomLayoutOptions.find((entry) => entry.id === optionId);

      if (!option) {
        return state;
      }

      const roomData = {
        ...cloneRoomData(state.roomData),
        objects: option.objects.map((object) => cloneRoomObject(object)),
      };

      return {
        roomData,
        validationWarnings: validateRoomLayout(roomData),
        activeRandomLayoutOptionId: option.id,
        randomLayoutOptionSignatures: state.randomLayoutOptions.map((entry) =>
          entry.id === option.id
            ? getRoomDataSignature(roomData, option.objects)
            : getRoomDataSignature(state.roomData, entry.objects),
        ),
        historyPast: limitHistory([
          ...state.historyPast,
          cloneRoomData(state.roomData),
        ]),
        historyFuture: [],
        lastEditorStatus: { key: "randomLayoutOptionApplied" },
      };
    }),
  clearRandomLayoutOptions: () =>
    set({
      randomLayoutOptions: [],
      activeRandomLayoutOptionId: null,
      randomLayoutSourceSignature: null,
      randomLayoutOptionSignatures: [],
    }),
  randomizeSelectedObjects: () =>
    set((state) => {
      if (!state.selectedObjectIds.length) {
        return state;
      }

      const scopeIds = new Set(state.selectedObjectIds);
      const roomData = cloneRoomData(state.roomData);
      const originalObjectsById = new Map(
        roomData.objects.map((object) => [object.id, cloneRoomObject(object)]),
      );
      const scopedLayoutSource = roomData.objects.map((object) => {
        const clone = cloneRoomObject(object);

        if (scopeIds.has(object.id)) {
          return clone;
        }

        return {
          ...clone,
          movable: false,
          locked: true,
          params: {
            ...clone.params,
            fixedDuringRandomize: true,
          },
        };
      });
      const arrangedObjects = tryRandomLayout(roomData, scopedLayoutSource);

      roomData.objects = arrangedObjects.map((object) => {
        const original = originalObjectsById.get(object.id);

        if (!original) {
          return object;
        }

        return scopeIds.has(object.id)
          ? {
              ...object,
              movable: original.movable,
              locked: original.locked,
              params: original.params,
              dimensions: original.dimensions,
            }
          : original;
      });

      return {
        roomData,
        validationWarnings: validateRoomLayout(roomData),
        randomLayoutOptions: [],
        activeRandomLayoutOptionId: null,
        historyPast: limitHistory([
          ...state.historyPast,
          cloneRoomData(state.roomData),
        ]),
        historyFuture: [],
        lastEditorStatus: { key: "selectionRandomized" },
      };
    }),
  saveRoomSnapshot: () =>
    set((state) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          SAVED_ROOM_KEY,
          JSON.stringify(cloneRoomData(state.roomData)),
        );
      }

      return {
        lastEditorStatus: { key: "roomSaved" },
      };
    }),
  rotateObjectBy: (objectId, delta) =>
    set((state) => {
      const roomData = cloneRoomData(state.roomData);

      updateObjectInRoom(roomData, objectId, (object) => {
        if (object.locked || !object.movable) {
          return;
        }

        const nextRotation = normalizeRotation(object.rotation + delta);

        if (isWallAttachedObject(object)) {
          const placement = getWallAttachedObjectTransform(
            roomData,
            object,
            object.position,
          );

          object.rotation = placement.rotation;
          object.position = placement.position;
          return;
        }

        object.rotation = nextRotation;
        object.position = clampObjectPositionToRoom(
          roomData,
          object,
          object.position,
          nextRotation,
        );
      });

      return {
        roomData,
        validationWarnings: validateRoomLayout(roomData),
        randomLayoutOptions: [],
        activeRandomLayoutOptionId: null,
        randomLayoutSourceSignature: null,
        randomLayoutOptionSignatures: [],
        historyPast: limitHistory([
          ...state.historyPast,
          cloneRoomData(state.roomData),
        ]),
        historyFuture: [],
        lastEditorStatus: { key: "objectRotated", objectId },
      };
    }),
  toggleObjectLock: (objectId) =>
    set((state) => {
      const roomData = cloneRoomData(state.roomData);
      let isLocked = false;

      updateObjectInRoom(roomData, objectId, (object) => {
        object.locked = !object.locked;
        isLocked = object.locked;
      });

      return {
        roomData,
        validationWarnings: validateRoomLayout(roomData),
        historyPast: limitHistory([
          ...state.historyPast,
          cloneRoomData(state.roomData),
        ]),
        historyFuture: [],
        lastEditorStatus: {
          key: isLocked ? "objectLocked" : "objectUnlocked",
          objectId,
        },
      };
    }),
  undo: () =>
    set((state) => {
      const previous = state.historyPast.at(-1);

      if (!previous) {
        return state;
      }

      return {
        roomData: cloneRoomData(previous),
        validationWarnings: validateRoomLayout(previous),
        historyPast: state.historyPast.slice(0, -1),
        historyFuture: [cloneRoomData(state.roomData), ...state.historyFuture],
        lastEditorStatus: { key: "undoApplied" },
      };
    }),
  redo: () =>
    set((state) => {
      const [next, ...remaining] = state.historyFuture;

      if (!next) {
        return state;
      }

      return {
        roomData: cloneRoomData(next),
        validationWarnings: validateRoomLayout(next),
        historyPast: limitHistory([
          ...state.historyPast,
          cloneRoomData(state.roomData),
        ]),
        historyFuture: remaining,
        lastEditorStatus: { key: "redoApplied" },
      };
    }),
  resetRoom: (mode = "default") =>
    set((state) => {
      let nextRoomData = cloneRoomData(defaultRoom);
      let status: EditorStatus = { key: "sceneReset" };

      if (mode === "saved" && typeof window !== "undefined") {
        const savedRaw = window.localStorage.getItem(SAVED_ROOM_KEY);

        if (savedRaw) {
          try {
            nextRoomData = cloneRoomData(JSON.parse(savedRaw) as RoomData);
            status = { key: "sceneResetSaved" };
          } catch {
            nextRoomData = cloneRoomData(defaultRoom);
          }
        }
      }

      return {
        roomData: nextRoomData,
        selectedObjectId: nextRoomData.objects[0]?.id ?? null,
        selectedObjectIds: nextRoomData.objects[0]?.id ? [nextRoomData.objects[0].id] : [],
        selectedGroupId: null,
        cameraMode: "orbit",
        transformMode: "select",
        validationWarnings: validateRoomLayout(nextRoomData),
        historyPast: limitHistory([
          ...state.historyPast,
          cloneRoomData(state.roomData),
        ]),
        historyFuture: [],
        lastEditorStatus: status,
        activeTransformObjectId: null,
        clipboardObject: null,
        randomLayoutOptions: [],
        activeRandomLayoutOptionId: null,
        randomLayoutSourceSignature: null,
        randomLayoutOptionSignatures: [],
      };
    }),
}));
