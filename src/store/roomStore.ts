"use client";

import { create } from "zustand";
import { getObjectBounds } from "@/lib/room/collision";
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
  objectsHavePlacementCollision,
  objectIntersectsZone,
} from "@/lib/room/constraints";
import { resizeRoomDefinition } from "@/lib/room/defaultRoom";
import { getOpeningHeight } from "@/lib/room/openingPlacement";
import { createRoomPreset } from "@/lib/room/roomPresets";
import { validateRoomLayout } from "@/lib/room/layoutValidator";
import {
  findWallByRotation,
  getWallMetrics,
  getWallLength,
  getWallSegment,
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

const createDefaultRoomData = () => createRoomPreset("rectangle", "living");
const initialRoomData = createDefaultRoomData();

const cloneRoomData = (roomData: RoomData): RoomData =>
  JSON.parse(JSON.stringify(roomData)) as RoomData;

const cloneRoomObject = (object: RoomObject): RoomObject =>
  JSON.parse(JSON.stringify(object)) as RoomObject;

type RandomNumberGenerator = () => number;

const hashString = (input: string) => {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

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

const shouldIgnorePlacementCollision = (left: RoomObject, right: RoomObject) =>
  !objectsHavePlacementCollision(left, right, 0.06);

const canRepairRandomObject = (object: RoomObject) =>
  !isFixedDuringRandomize(object) && !isWallAttachedObject(object);

const positionsEqual = (
  left: RoomObject["position"],
  right: RoomObject["position"],
) =>
  Math.abs(left.x - right.x) < 0.001 && Math.abs(left.z - right.z) < 0.001;

const wallPointsEqual = (left: [number, number], right: [number, number]) =>
  Math.abs(left[0] - right[0]) < 0.001 && Math.abs(left[1] - right[1]) < 0.001;

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

const getRelationalObjects = (
  roomData: RoomData,
  objectId: string,
  objects: RoomObject[],
) => {
  const explicitGroupObjects = getExplicitGroupObjects(roomData, objectId, objects);

  return explicitGroupObjects.length
    ? explicitGroupObjects
    : objects.filter((object) => object.id !== objectId);
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

    const relationalObjects = getRelationalObjects(roomData, object.id, objects);
    const groupedTvObjects = relationalObjects.filter(
      (groupObject) => groupObject.category === "tv_unit" && groupObject.id !== object.id,
    );
    const groupedTableObjects = relationalObjects.filter(
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

    const relationalObjects = getRelationalObjects(roomData, object.id, objects);
    const groupedTables = relationalObjects.filter(
      (entry) => entry.category === "table" && entry.id !== object.id,
    );
    const groupedTvs = relationalObjects.filter(
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
      (object.category === "sofa" && !shouldPreferWallPlacement(object)) ||
      object.category === "chair" ||
      getObjectBaseShape(object) === "piano"
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
        relationalObjects.filter(
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
      return object;
    }

    return object;
  });
};

const clampOpening = (roomData: RoomData, opening: Opening): Opening => {
  const wallLength = getWallLength(roomData.room, opening.wallId);
  const minPosition = opening.width / 2 + 0.2;
  const maxPosition = Math.max(minPosition, wallLength - opening.width / 2 - 0.2);
  const height =
    typeof opening.height === "number"
      ? clampDimension(opening.height, getOpeningHeight(opening, roomData.room.height), roomData.room.height)
      : opening.height;
  const effectiveHeight =
    typeof height === "number"
      ? height
      : getOpeningHeight(opening, roomData.room.height);
  const sillHeight =
    typeof opening.sillHeight === "number"
      ? clampDimension(
          opening.sillHeight,
          opening.type === "door" || opening.type === "balcony_door"
            ? 0
            : opening.type === "window"
              ? Math.min(0.9, Math.max(0.45, roomData.room.height * 0.28))
              : 0.18,
          Math.max(0, roomData.room.height - effectiveHeight),
        )
      : opening.sillHeight;

  return {
    ...opening,
    ...(typeof height === "number" ? { height } : {}),
    ...(typeof sillHeight === "number" ? { sillHeight } : {}),
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

const createDividerWallSegment = (
  room: RoomDefinition,
  walls: WallSegment[],
): WallSegment => {
  const ratios = [0.5, 0.35, 0.65, 0.25, 0.75];
  let outlineWallCount = 0;

  for (const wall of walls) {
    const previousWall = walls[outlineWallCount - 1];

    if (previousWall && !wallPointsEqual(previousWall.to, wall.from)) {
      break;
    }

    outlineWallCount += 1;

    if (outlineWallCount > 1 && wallPointsEqual(wall.to, walls[0].from)) {
      break;
    }
  }

  const dividerIndex = Math.max(0, walls.length - outlineWallCount);
  const ratio = ratios[dividerIndex % ratios.length];
  const margin = 0.45;

  if (room.width >= room.depth) {
    const x = Number((room.width * ratio).toFixed(2));

    return {
      id: createWallId(walls),
      from: [x, Number(Math.min(room.depth / 2, margin).toFixed(2))],
      to: [x, Number(Math.max(room.depth - margin, room.depth / 2).toFixed(2))],
    };
  }

  const z = Number((room.depth * ratio).toFixed(2));

  return {
    id: createWallId(walls),
    from: [Number(Math.min(room.width / 2, margin).toFixed(2)), z],
    to: [Number(Math.max(room.width - margin, room.width / 2).toFixed(2)), z],
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

  if (!objectsHavePlacementCollision(left, right, padding)) {
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

const clearRandomLayoutCache = () => ({
  randomLayoutOptions: [] as RandomLayoutOption[],
  activeRandomLayoutOptionId: null as string | null,
  randomLayoutSourceSignature: null as string | null,
  randomLayoutOptionSignatures: [] as string[],
  randomLayoutOptionsVisible: false,
});

const getStableParams = (params: RoomObject["params"]) =>
  Object.fromEntries(
    Object.entries(params)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, value]) => [
        key,
        typeof value === "number" ? Number(value.toFixed(3)) : value,
      ]),
  );

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

const getRandomLayoutInputSignature = (roomData: RoomData) =>
  JSON.stringify({
    algorithm: "systematic-layout-v3",
    room: {
      shape: roomData.room.shape,
      purpose: roomData.room.purpose,
      width: Number(roomData.room.width.toFixed(2)),
      depth: Number(roomData.room.depth.toFixed(2)),
      height: Number(roomData.room.height.toFixed(2)),
      cutoutWidth: Number(roomData.room.cutoutWidth.toFixed(2)),
      cutoutDepth: Number(roomData.room.cutoutDepth.toFixed(2)),
      walls: roomData.room.walls
        .map((wall) => ({
          id: wall.id,
          from: wall.from.map((value) => Number(value.toFixed(2))),
          to: wall.to.map((value) => Number(value.toFixed(2))),
        }))
        .sort((left, right) => left.id.localeCompare(right.id)),
      openings: roomData.room.openings
        .map((opening) => ({
          ...opening,
          position: Number(opening.position.toFixed(2)),
          width: Number(opening.width.toFixed(2)),
          height:
            typeof opening.height === "number"
              ? Number(opening.height.toFixed(2))
              : opening.height,
          sillHeight:
            typeof opening.sillHeight === "number"
              ? Number(opening.sillHeight.toFixed(2))
              : opening.sillHeight,
        }))
        .sort((left, right) => left.id.localeCompare(right.id)),
    },
    constraints: roomData.constraints,
    groups: getRoomGroups(roomData)
      .map((group) => ({
        id: group.id,
        label: group.label,
        objectIds: [...group.objectIds].sort(),
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    objects: roomData.objects
      .map((object) => {
        const fixed = isFixedDuringRandomize(object);

        return {
          id: object.id,
          labelKey: object.labelKey,
          category: object.category,
          generator: object.generator,
          dimensions: {
            width: Number(object.dimensions.width.toFixed(2)),
            depth: Number(object.dimensions.depth.toFixed(2)),
            height: Number(object.dimensions.height.toFixed(2)),
          },
          movable: object.movable,
          locked: object.locked,
          params: getStableParams(object.params),
          ...(fixed
            ? {
                position: {
                  x: Number(object.position.x.toFixed(2)),
                  z: Number(object.position.z.toFixed(2)),
                },
                rotation: Math.round(normalizeRotation(object.rotation)),
              }
            : {}),
        };
      })
      .sort((left, right) => left.id.localeCompare(right.id)),
  });

const getRandomLayoutCacheUpdate = (
  sourceSignature: string | null,
  roomData: RoomData,
) =>
  sourceSignature === getRandomLayoutInputSignature(roomData)
    ? { activeRandomLayoutOptionId: null as string | null }
    : clearRandomLayoutCache();

const applyLayoutToCurrentObjects = (
  currentObjects: RoomObject[],
  layoutObjects: RoomObject[],
) => {
  const layoutById = new Map(layoutObjects.map((object) => [object.id, object]));

  return currentObjects.map((currentObject) => {
    const layoutObject = layoutById.get(currentObject.id);

    if (!layoutObject) {
      return cloneRoomObject(currentObject);
    }

    return {
      ...cloneRoomObject(currentObject),
      position: { ...layoutObject.position },
      rotation: layoutObject.rotation,
    };
  });
};

const tryRandomLayout = (
  roomData: RoomData,
  objects: RoomObject[],
  random: RandomNumberGenerator = Math.random,
) => {
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
        const rotation = rotations[Math.floor(random() * rotations.length)];
        const desiredPosition = {
          x: 0.3 + random() * Math.max(0.4, roomData.room.width - 0.6),
          z: 0.3 + random() * Math.max(0.4, roomData.room.depth - 0.6),
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

          return objectsHavePlacementCollision(existing, candidate, 0.06);
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

const isDiversityObject = (object: RoomObject) =>
  !isFixedDuringRandomize(object) &&
  object.category !== "carpet" &&
  object.dimensions.height > 0.06;

const getLayoutZone = (roomData: RoomData, object: RoomObject) => {
  const xRatio = object.position.x / Math.max(roomData.room.width, 0.01);
  const zRatio = object.position.z / Math.max(roomData.room.depth, 0.01);
  const xZone = Math.min(2, Math.max(0, Math.floor(xRatio * 3)));
  const zZone = Math.min(2, Math.max(0, Math.floor(zRatio * 3)));
  const rotationZone = Math.round(normalizeRotation(object.rotation) / 45) % 8;
  const mountZone = Math.round(getMountHeight(object) / 0.35);

  return `${xZone}:${zZone}:${rotationZone}:${mountZone}:${
    isWallAttachedObject(object) ? "wall" : "floor"
  }`;
};

const getDiversitySignature = (roomData: RoomData, objects: RoomObject[]) =>
  objects
    .filter(isDiversityObject)
    .map((object) => `${object.id}:${getLayoutZone(roomData, object)}`)
    .sort()
    .join("|");

const getCategoryDiversityTokens = (roomData: RoomData, objects: RoomObject[]) =>
  objects
    .filter(isDiversityObject)
    .map(
      (object) =>
        `${object.category}:${getObjectBaseShape(object)}:${getLayoutZone(roomData, object)}`,
    )
    .sort();

const getShortestRotationDelta = (left: number, right: number) => {
  const delta = Math.abs(normalizeRotation(left) - normalizeRotation(right)) % 360;

  return Math.min(delta, 360 - delta);
};

const getTokenOverlapRatio = (leftTokens: string[], rightTokens: string[]) => {
  const rightCounts = new Map<string, number>();

  rightTokens.forEach((token) => {
    rightCounts.set(token, (rightCounts.get(token) ?? 0) + 1);
  });

  const overlap = leftTokens.reduce((total, token) => {
    const count = rightCounts.get(token) ?? 0;

    if (!count) {
      return total;
    }

    rightCounts.set(token, count - 1);
    return total + 1;
  }, 0);

  return overlap / Math.max(1, Math.min(leftTokens.length, rightTokens.length));
};

const areRandomLayoutsTooSimilar = (
  roomData: RoomData,
  leftObjects: RoomObject[],
  rightObjects: RoomObject[],
) => {
  const leftMap = new Map(
    leftObjects.filter(isDiversityObject).map((object) => [object.id, object]),
  );
  const rightMap = new Map(
    rightObjects.filter(isDiversityObject).map((object) => [object.id, object]),
  );
  const sharedIds = [...leftMap.keys()].filter((objectId) => rightMap.has(objectId));

  if (!sharedIds.length) {
    return false;
  }

  let closeObjects = 0;
  let sameZoneObjects = 0;
  let sameRotationObjects = 0;
  let meaningfulChanges = 0;
  let totalDistance = 0;
  let totalRotationDelta = 0;

  sharedIds.forEach((objectId) => {
    const left = leftMap.get(objectId)!;
    const right = rightMap.get(objectId)!;
    const distance = Math.hypot(
      left.position.x - right.position.x,
      left.position.z - right.position.z,
    );
    const rotationDelta = getShortestRotationDelta(left.rotation, right.rotation);
    const closeDistance = Math.max(
      0.45,
      Math.min(0.9, Math.min(left.dimensions.width, left.dimensions.depth) * 0.75),
    );
    const meaningfulDistance = Math.max(
      0.65,
      Math.min(1.1, Math.min(left.dimensions.width, left.dimensions.depth) * 0.95),
    );
    const sameZone = getLayoutZone(roomData, left) === getLayoutZone(roomData, right);

    totalDistance += distance;
    totalRotationDelta += rotationDelta;

    if (distance < closeDistance && rotationDelta < 45) {
      closeObjects += 1;
    }

    if (sameZone) {
      sameZoneObjects += 1;
    }

    if (rotationDelta < 45) {
      sameRotationObjects += 1;
    }

    if (distance >= meaningfulDistance || rotationDelta >= 60 || !sameZone) {
      meaningfulChanges += 1;
    }
  });

  const comparedCount = sharedIds.length;
  const closeRatio = closeObjects / comparedCount;
  const sameZoneRatio = sameZoneObjects / comparedCount;
  const sameRotationRatio = sameRotationObjects / comparedCount;
  const averageDistance = totalDistance / comparedCount;
  const averageRotationDelta = totalRotationDelta / comparedCount;
  const minimumMeaningfulChanges =
    comparedCount >= 8 ? 3 : comparedCount >= 4 ? 2 : 1;
  const categoryOverlap = getTokenOverlapRatio(
    getCategoryDiversityTokens(roomData, leftObjects),
    getCategoryDiversityTokens(roomData, rightObjects),
  );

  return (
    (meaningfulChanges < minimumMeaningfulChanges && closeRatio >= 0.55) ||
    (closeRatio >= 0.72 && averageRotationDelta < 45) ||
    (sameZoneRatio >= 0.72 && sameRotationRatio >= 0.72 && averageDistance < 0.85) ||
    (categoryOverlap >= 0.82 && averageDistance < 0.95)
  );
};

const getLayoutBalancePenalty = (roomData: RoomData, objects: RoomObject[]) => {
  const weightedObjects = objects.filter(isDiversityObject);

  if (weightedObjects.length < 2) {
    return 0;
  }

  const weightedCenter = weightedObjects.reduce(
    (total, object) => {
      const weight = Math.max(0.2, object.dimensions.width * object.dimensions.depth);

      return {
        x: total.x + object.position.x * weight,
        z: total.z + object.position.z * weight,
        weight: total.weight + weight,
      };
    },
    { x: 0, z: 0, weight: 0 },
  );
  const centerX = weightedCenter.x / weightedCenter.weight;
  const centerZ = weightedCenter.z / weightedCenter.weight;
  const roomCenter = {
    x: roomData.room.width / 2,
    z: roomData.room.depth / 2,
  };
  const normalizedDrift =
    Math.abs(centerX - roomCenter.x) / Math.max(roomData.room.width, 0.01) +
    Math.abs(centerZ - roomCenter.z) / Math.max(roomData.room.depth, 0.01);

  return normalizedDrift * 18;
};

const getAwkwardGapPenalty = (objects: RoomObject[]) => {
  const layoutObjects = objects.filter(isDiversityObject);
  let penalty = 0;

  for (let leftIndex = 0; leftIndex < layoutObjects.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < layoutObjects.length;
      rightIndex += 1
    ) {
      const left = layoutObjects[leftIndex];
      const right = layoutObjects[rightIndex];
      const leftBounds = getObjectBounds(left);
      const rightBounds = getObjectBounds(right);
      const gapX = Math.max(
        0,
        Math.max(
          leftBounds.minX - rightBounds.maxX,
          rightBounds.minX - leftBounds.maxX,
        ),
      );
      const gapZ = Math.max(
        0,
        Math.max(
          leftBounds.minZ - rightBounds.maxZ,
          rightBounds.minZ - leftBounds.maxZ,
        ),
      );
      const gap = Math.hypot(gapX, gapZ);

      if (gap > 0 && gap < 0.18) {
        penalty += (0.18 - gap) * 8;
      }
    }
  }

  return penalty;
};

const getRandomLayoutQualityScore = (
  roomData: RoomData,
  objects: RoomObject[],
  warnings: LayoutWarning[],
) =>
  getDesignPenalty(roomData, objects) +
  getLayoutBalancePenalty(roomData, objects) +
  getAwkwardGapPenalty(objects) +
  warnings.reduce(
    (total, warning) => total + (warning.level === "error" ? 1000 : 160),
    0,
  );

type PlacementCandidate = {
  key: string;
  object: RoomObject;
};

type PlacementPool = {
  sourceObject: RoomObject;
  candidates: PlacementCandidate[];
};

const LAYOUT_SEARCH_SAFETY_LIMIT = 3600;

const getLayoutObjectPriority = (object: RoomObject) => {
  const wallPriority =
    isWallAttachedObject(object) || shouldPreferWallPlacement(object) ? 1000 : 0;
  const categoryPriority =
    object.category === "sofa"
      ? 90
      : object.category === "bed"
        ? 85
        : object.category === "tv_unit"
          ? 72
          : object.category === "wardrobe"
            ? 68
            : object.category === "table"
              ? 48
              : object.category === "chair"
                ? 36
                : 0;

  return (
    wallPriority +
    categoryPriority +
    object.dimensions.width * object.dimensions.depth * 10
  );
};

const getPlacementCandidateSignature = (object: RoomObject) =>
  `${object.position.x.toFixed(2)}:${object.position.z.toFixed(2)}:${Math.round(
    normalizeRotation(object.rotation) / 15,
  ) * 15}:${Math.round(getMountHeight(object) / 0.05)}`;

const dedupePlacementCandidates = (candidates: PlacementCandidate[]) => {
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    const signature = getPlacementCandidateSignature(candidate.object);

    if (seen.has(signature)) {
      return false;
    }

    seen.add(signature);
    return true;
  });
};

const getWallAlongStops = (wallLength: number, object: RoomObject) => {
  const halfAlong = Math.min(object.dimensions.width / 2, wallLength / 2);
  const minAlong = Math.min(wallLength / 2, halfAlong + 0.08);
  const maxAlong = Math.max(minAlong, wallLength - halfAlong - 0.08);
  const spacing = Math.max(
    0.45,
    Math.min(1.15, Math.max(object.dimensions.width * 0.7, 0.55)),
  );
  const stops = new Set<number>();
  const addStop = (value: number) => {
    const safeValue = Math.min(maxAlong, Math.max(minAlong, value));
    stops.add(Number(safeValue.toFixed(2)));
  };

  for (let along = minAlong; along <= maxAlong + 0.001; along += spacing) {
    addStop(along);
  }

  [minAlong, maxAlong, (minAlong + maxAlong) / 2].forEach(addStop);
  [0.2, 0.35, 0.5, 0.65, 0.8].forEach((ratio) =>
    addStop(minAlong + (maxAlong - minAlong) * ratio),
  );

  return [...stops].sort((left, right) => left - right);
};

const getLinearPlacementStops = (span: number, objectSpan: number) => {
  const margin = Math.min(span / 2, Math.max(0.28, objectSpan / 2 + 0.08));
  const min = margin;
  const max = Math.max(min, span - margin);
  const spacing = Math.max(0.72, Math.min(1.35, Math.max(objectSpan * 0.9, 0.85)));
  const stops = new Set<number>();
  const addStop = (value: number) => {
    const safeValue = Math.min(max, Math.max(min, value));
    stops.add(Number(safeValue.toFixed(2)));
  };

  for (let value = min; value <= max + 0.001; value += spacing) {
    addStop(value);
  }

  [min, max, span / 2].forEach(addStop);
  [0.2, 0.35, 0.5, 0.65, 0.8].forEach((ratio) => addStop(span * ratio));

  return [...stops].sort((left, right) => left - right);
};

const getWallPlacementCandidates = (
  roomData: RoomData,
  object: RoomObject,
): PlacementCandidate[] => {
  const candidates: PlacementCandidate[] = [];

  roomData.room.walls.forEach((wall) => {
    const metrics = getWallMetrics(wall);
    const stops = getWallAlongStops(metrics.length, object);

    stops.forEach((along, index) => {
      const desiredPosition = {
        x: wall.from[0] + metrics.directionX * along,
        z: wall.from[1] + metrics.directionZ * along,
      };
      const placement = getWallAttachedObjectTransform(
        roomData,
        object,
        desiredPosition,
      );
      const candidate = {
        ...cloneRoomObject(object),
        position: placement.position,
        rotation: placement.rotation,
      };

      candidates.push({
        key: `${wall.id}:${index}`,
        object: candidate,
      });
    });
  });

  return dedupePlacementCandidates(candidates);
};

const getFloorPlacementCandidates = (
  roomData: RoomData,
  object: RoomObject,
): PlacementCandidate[] => {
  const candidates: PlacementCandidate[] = [];
  const xStops = getLinearPlacementStops(roomData.room.width, object.dimensions.width);
  const zStops = getLinearPlacementStops(roomData.room.depth, object.dimensions.depth);
  const rotations = [0, 90, 180, 270];

  rotations.forEach((rotation) => {
    xStops.forEach((x) => {
      zStops.forEach((z) => {
        const normalizedRotation = normalizeRotation(rotation);
        const candidate = {
          ...cloneRoomObject(object),
          rotation: normalizedRotation,
          position: clampObjectPositionToRoom(
            roomData,
            object,
            { x, z },
            normalizedRotation,
          ),
        };

        candidates.push({
          key: `floor:${x}:${z}:${normalizedRotation}`,
          object: candidate,
        });
      });
    });
  });

  return dedupePlacementCandidates(candidates);
};

const getPlacementCandidates = (
  roomData: RoomData,
  object: RoomObject,
): PlacementCandidate[] => {
  const wallCandidates =
    isWallAttachedObject(object) || shouldPreferWallPlacement(object)
      ? getWallPlacementCandidates(roomData, object)
      : [];
  const floorCandidates =
    wallCandidates.length || isWallAttachedObject(object)
      ? []
      : getFloorPlacementCandidates(roomData, object);
  const candidates = [...wallCandidates, ...floorCandidates];

  if (candidates.length) {
    return candidates;
  }

  const fallbackObject = normalizeRoomObjects(roomData, [object])[0];

  return [
    {
      key: "fallback",
      object: fallbackObject,
    },
  ];
};

const getGreatestCommonDivisor = (left: number, right: number): number => {
  let a = Math.abs(left);
  let b = Math.abs(right);

  while (b) {
    const next = a % b;
    a = b;
    b = next;
  }

  return a || 1;
};

const getCoprimeStride = (count: number, seed: number) => {
  if (count <= 1) {
    return 1;
  }

  let stride = (seed % (count - 1)) + 1;

  while (getGreatestCommonDivisor(stride, count) !== 1) {
    stride = (stride % (count - 1)) + 1;
  }

  return stride;
};

const getCandidateIndexOrder = (
  count: number,
  passIndex: number,
  objectId: string,
  seedSignature: string,
  forcedIndex?: number,
) => {
  if (!count) {
    return [];
  }

  const seed = hashString(`${seedSignature}:${objectId}:${passIndex}`);
  const start = forcedIndex ?? seed % count;
  const stride = getCoprimeStride(count, seed || 1);
  const indexes: number[] = [];

  for (let offset = 0; offset < count; offset += 1) {
    indexes.push((start + offset * stride) % count);
  }

  return indexes;
};

const getCandidateMovement = (sourceObject: RoomObject, candidate: RoomObject) =>
  Math.hypot(
    candidate.position.x - sourceObject.position.x,
    candidate.position.z - sourceObject.position.z,
  ) + getShortestRotationDelta(candidate.rotation, sourceObject.rotation) / 90;

const getCandidatePlacementScore = (
  roomData: RoomData,
  draftObjects: RoomObject[],
  candidate: RoomObject,
  sourceObject: RoomObject,
) => {
  const orientedDraft = orientSocialObjects(roomData, [
    ...draftObjects,
    candidate,
  ]);
  const warnings = validateRoomLayout({
    ...roomData,
    objects: orientedDraft,
  });
  const candidateWarnings = warnings.filter(
    (warning) =>
      warning.objectId === candidate.id || warning.relatedObjectId === candidate.id,
  );

  if (
    candidateWarnings.some(
      (warning) => warning.level === "error" || warning.code === "collision",
    )
  ) {
    return null;
  }

  const warningPenalty = candidateWarnings.reduce(
    (total, warning) => total + (warning.level === "error" ? 1000 : 120),
    0,
  );
  const movement = getCandidateMovement(sourceObject, candidate);

  return (
    getDesignPenalty(roomData, orientedDraft) +
    getLayoutBalancePenalty(roomData, orientedDraft) * 0.45 +
    getAwkwardGapPenalty(orientedDraft) +
    warningPenalty -
    Math.min(movement, 4) * 0.55
  );
};

const pickPlacementCandidate = (
  roomData: RoomData,
  draftObjects: RoomObject[],
  pool: PlacementPool,
  passIndex: number,
  seedSignature: string,
  forcedIndex?: number,
) => {
  let bestObject: RoomObject | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  let bestMovement = Number.NEGATIVE_INFINITY;
  const indexes = getCandidateIndexOrder(
    pool.candidates.length,
    passIndex,
    pool.sourceObject.id,
    seedSignature,
    forcedIndex,
  );

  indexes.forEach((candidateIndex, orderIndex) => {
    const candidate = cloneRoomObject(pool.candidates[candidateIndex].object);
    const intersects = draftObjects.some((existing) =>
      objectsHavePlacementCollision(existing, candidate, 0.06),
    );

    if (intersects) {
      return;
    }

    const score = getCandidatePlacementScore(
      roomData,
      draftObjects,
      candidate,
      pool.sourceObject,
    );

    if (score === null) {
      return;
    }

    const movement = getCandidateMovement(pool.sourceObject, candidate);
    const stableScore = score + orderIndex * 0.0001;

    if (
      stableScore < bestScore ||
      (stableScore === bestScore && movement > bestMovement)
    ) {
      bestObject = candidate;
      bestScore = stableScore;
      bestMovement = movement;
    }
  });

  return bestObject ?? cloneRoomObject(pool.candidates[indexes[0] ?? 0].object);
};

const getSystematicLayoutSearchPassCount = (pools: PlacementPool[]) => {
  const candidateCounts = pools
    .map((pool) => pool.candidates.length)
    .filter((count) => count > 0);

  if (!candidateCounts.length) {
    return 1;
  }

  let exactProduct = 1;
  let canExhaustProduct = true;

  for (const count of candidateCounts) {
    if (exactProduct > LAYOUT_SEARCH_SAFETY_LIMIT / count) {
      canExhaustProduct = false;
      break;
    }

    exactProduct *= count;
  }

  const anchorSweeps = candidateCounts.reduce((total, count) => total + count, 0);
  const pairSweeps = Math.max(...candidateCounts) * Math.max(1, pools.length * 2);
  const desiredPasses = canExhaustProduct
    ? exactProduct
    : Math.max(anchorSweeps, pairSweeps, LAYOUT_SEARCH_SAFETY_LIMIT);

  return Math.max(1, Math.min(LAYOUT_SEARCH_SAFETY_LIMIT, desiredPasses));
};

const buildSystematicLayout = (
  roomData: RoomData,
  sourceLayoutObjects: RoomObject[],
  pools: PlacementPool[],
  passIndex: number,
  seedSignature: string,
) => {
  const fixedObjects = sourceLayoutObjects
    .filter((object) => isFixedDuringRandomize(object))
    .map((object) => cloneRoomObject(object));
  const movableObjects = pools
    .map((pool) => pool.sourceObject)
    .sort(
      (left, right) =>
        getLayoutObjectPriority(right) - getLayoutObjectPriority(left),
    );
  const poolByObjectId = new Map(pools.map((pool) => [pool.sourceObject.id, pool]));
  const sourceMap = new Map(
    sourceLayoutObjects.map((object) => [object.id, cloneRoomObject(object)]),
  );

  if (!movableObjects.length) {
    return stabilizeRandomLayout(roomData, fixedObjects);
  }

  const anchorObject = movableObjects[passIndex % movableObjects.length];
  const anchorPool = poolByObjectId.get(anchorObject.id);
  const anchorCandidateIndex = anchorPool?.candidates.length
    ? Math.floor(passIndex / movableObjects.length) % anchorPool.candidates.length
    : undefined;
  const orderedObjects = [
    anchorObject,
    ...movableObjects.filter((object) => object.id !== anchorObject.id),
  ];
  const draftObjects = fixedObjects.map((object) => cloneRoomObject(object));

  orderedObjects.forEach((object) => {
    const pool = poolByObjectId.get(object.id);

    if (!pool) {
      draftObjects.push(cloneRoomObject(object));
      return;
    }

    draftObjects.push(
      pickPlacementCandidate(
        roomData,
        draftObjects,
        pool,
        passIndex,
        seedSignature,
        object.id === anchorObject.id ? anchorCandidateIndex : undefined,
      ),
    );
  });

  return stabilizeRandomLayout(roomData, draftObjects).map((object) => {
    const sourceObject = sourceMap.get(object.id);

    return sourceObject
      ? {
          ...object,
          dimensions: { ...sourceObject.dimensions },
        }
      : object;
  });
};

const createRandomLayoutOptions = (
  roomData: RoomData,
  sourceLayoutObjects: RoomObject[],
  seedSignature: string,
): RandomLayoutOption[] => {
  const movableSourceObjects = sourceLayoutObjects.filter(
    (object) => !isFixedDuringRandomize(object),
  );
  const placementPools = movableSourceObjects
    .map((sourceObject) => ({
      sourceObject: cloneRoomObject(sourceObject),
      candidates: getPlacementCandidates(roomData, sourceObject),
    }))
    .filter((pool) => pool.candidates.length);
  const searchPassCount = getSystematicLayoutSearchPassCount(placementPools);
  const candidates: Array<RandomLayoutOption & { score: number }> = [];
  const seenSignatures = new Set<string>();

  for (let passIndex = 0; passIndex < searchPassCount; passIndex += 1) {
    const objects = buildSystematicLayout(
      roomData,
      sourceLayoutObjects,
      placementPools,
      passIndex,
      seedSignature,
    );
    const signature = `${getLayoutSignature(objects)}|${getDiversitySignature(
      roomData,
      objects,
    )}`;

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

    candidates.push({
      id: `random_candidate_${candidates.length + 1}`,
      label: `random_candidate_${candidates.length + 1}`,
      objects,
      warnings,
      score: getRandomLayoutQualityScore(roomData, objects, warnings),
    });
  }

  const selectedOptions = candidates
    .sort((left, right) => left.score - right.score)
    .reduce<RandomLayoutOption[]>((selected, candidate) => {
      if (
        selected.some((option) =>
          areRandomLayoutsTooSimilar(roomData, option.objects, candidate.objects),
        )
      ) {
        return selected;
      }

      selected.push({
        id: candidate.id,
        label: candidate.label,
        objects: candidate.objects,
        warnings: candidate.warnings,
      });
      return selected;
    }, []);

  if (!selectedOptions.length) {
    const fallbackObjects = stabilizeRandomLayout(
      roomData,
      sourceLayoutObjects,
    );
    const fallbackWarnings = validateRoomLayout({
      ...roomData,
      objects: fallbackObjects,
    });

    if (!fallbackWarnings.length) {
      selectedOptions.push({
        id: "random_1",
        label: "random_1",
        objects: fallbackObjects,
        warnings: fallbackWarnings,
      });
    }
  }

  return selectedOptions
    .sort(
      (left, right) =>
        getRandomLayoutQualityScore(roomData, left.objects, left.warnings) -
        getRandomLayoutQualityScore(roomData, right.objects, right.warnings),
    )
    .map((option, index) => ({
      ...option,
      id: `random_${index + 1}`,
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
  randomLayoutOptionsVisible: boolean;
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
    payload: Partial<
      Pick<Opening, "wallId" | "position" | "width" | "height" | "sillHeight" | "rotation">
    >,
  ) => void;
  updateOpeningTransform: (
    openingId: string,
    payload: {
      position?: { x: number; z: number };
      rotationY?: number;
      sillHeight?: number;
    },
  ) => void;
  updateWallSegment: (
    wallId: string,
    payload: Partial<{
      from: [number, number];
      to: [number, number];
    }>,
  ) => void;
  addDividerWall: () => string | null;
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
  roomData: cloneRoomData(initialRoomData),
  selectedObjectId: initialRoomData.objects[0]?.id ?? null,
  selectedObjectIds: initialRoomData.objects[0]?.id ? [initialRoomData.objects[0].id] : [],
  selectedGroupId: null,
  cameraMode: "orbit",
  transformMode: "select",
  validationWarnings: validateRoomLayout(initialRoomData),
  historyPast: [],
  historyFuture: [],
  lastEditorStatus: { key: "roomLoaded" },
  activeTransformObjectId: null,
  clipboardObject: null,
  randomLayoutOptions: [],
  activeRandomLayoutOptionId: null,
  randomLayoutSourceSignature: null,
  randomLayoutOptionSignatures: [],
  randomLayoutOptionsVisible: false,
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
          ...clearRandomLayoutCache(),
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
        ...getRandomLayoutCacheUpdate(state.randomLayoutSourceSignature, roomData),
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
      roomData.room.openings = roomData.room.openings.map((opening) => {
        if (opening.id !== openingId) {
          return opening;
        }

        const nextWall = getWallSegment(roomData.room, payload.wallId ?? opening.wallId);
        const wallRotation =
          nextWall && payload.rotation === undefined
            ? normalizeRotation((getWallMetrics(nextWall).rotationY * 180) / Math.PI)
            : payload.rotation;

        return normalizeOpeningForRoom(
          roomData.room,
          clampOpening(roomData, {
            ...opening,
            ...payload,
            rotation: wallRotation ?? opening.rotation,
          }),
        );
      });

      return {
        roomData,
        validationWarnings: validateRoomLayout(roomData),
        ...getRandomLayoutCacheUpdate(state.randomLayoutSourceSignature, roomData),
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
      const nextWallId = projection?.wall.id ?? rotationWall?.id ?? opening.wallId;
      const nextWall = getWallSegment(roomData.room, nextWallId);
      const nextWallRotation =
        nextWall
          ? normalizeRotation((getWallMetrics(nextWall).rotationY * 180) / Math.PI)
          : opening.rotation;
      const nextOpening = normalizeOpeningForRoom(
        roomData.room,
        clampOpening(roomData, {
          ...opening,
          wallId: nextWallId,
          position: projection?.along ?? opening.position,
          rotation: nextWallRotation,
          sillHeight: payload.sillHeight ?? opening.sillHeight,
        }),
      );

      roomData.room.openings = roomData.room.openings.map((entry) =>
        entry.id === openingId ? nextOpening : entry,
      );

      return {
        roomData,
        validationWarnings: validateRoomLayout(roomData),
        ...getRandomLayoutCacheUpdate(state.randomLayoutSourceSignature, roomData),
      };
    }),
  addDividerWall: () => {
    let addedWallId: string | null = null;

    set((state) => {
      const roomData = cloneRoomData(state.roomData);
      const walls = roomData.room.walls.map((wall) => ({ ...wall }));
      const dividerWall = createDividerWallSegment(roomData.room, walls);

      addedWallId = dividerWall.id;
      walls.push(dividerWall);
      roomData.room = normalizeCustomRoom(roomData.room, walls);
      roomData.objects = normalizeRoomObjects(roomData, roomData.objects);

      return {
        roomData,
        validationWarnings: validateRoomLayout(roomData),
        ...getRandomLayoutCacheUpdate(state.randomLayoutSourceSignature, roomData),
        historyPast: limitHistory([
          ...state.historyPast,
          cloneRoomData(state.roomData),
        ]),
        historyFuture: [],
        lastEditorStatus: { key: "wallUpdated" },
      };
    });

    return addedWallId;
  },
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
      const connectsPrevious = wallPointsEqual(walls[previousIndex].to, walls[wallIndex].from);
      const connectsNext = wallPointsEqual(walls[nextIndex].from, walls[wallIndex].to);
      const sanitizePoint = ([x, z]: [number, number]) =>
        [
          Number(Math.max(0, Number.isFinite(x) ? x : 0).toFixed(2)),
          Number(Math.max(0, Number.isFinite(z) ? z : 0).toFixed(2)),
        ] as [number, number];

      if (payload.from) {
        const nextFrom = sanitizePoint(payload.from);
        walls[wallIndex].from = nextFrom;

        if (connectsPrevious) {
          walls[previousIndex].to = nextFrom;
        }
      }

      if (payload.to) {
        const nextTo = sanitizePoint(payload.to);
        walls[wallIndex].to = nextTo;

        if (connectsNext) {
          walls[nextIndex].from = nextTo;
        }
      }

      roomData.room = normalizeCustomRoom(roomData.room, walls);
      roomData.objects = normalizeRoomObjects(roomData, roomData.objects);

      return {
        roomData,
        validationWarnings: validateRoomLayout(roomData),
        ...getRandomLayoutCacheUpdate(state.randomLayoutSourceSignature, roomData),
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
        ...getRandomLayoutCacheUpdate(state.randomLayoutSourceSignature, roomData),
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
        ...getRandomLayoutCacheUpdate(state.randomLayoutSourceSignature, roomData),
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
        ...getRandomLayoutCacheUpdate(state.randomLayoutSourceSignature, roomData),
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
        ...getRandomLayoutCacheUpdate(state.randomLayoutSourceSignature, roomData),
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
        ...getRandomLayoutCacheUpdate(state.randomLayoutSourceSignature, roomData),
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
        ...getRandomLayoutCacheUpdate(state.randomLayoutSourceSignature, roomData),
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
        ...getRandomLayoutCacheUpdate(state.randomLayoutSourceSignature, roomData),
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
        ...getRandomLayoutCacheUpdate(state.randomLayoutSourceSignature, roomData),
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
        ...getRandomLayoutCacheUpdate(state.randomLayoutSourceSignature, roomData),
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
        ...getRandomLayoutCacheUpdate(state.randomLayoutSourceSignature, roomData),
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
        ...getRandomLayoutCacheUpdate(state.randomLayoutSourceSignature, roomData),
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
      const currentSourceSignature = getRandomLayoutInputSignature(roomData);
      const currentLayoutSignature = getRoomDataSignature(roomData);
      const activeOptionBySignature = state.randomLayoutOptions.find(
        (_option, index) =>
          state.randomLayoutOptionSignatures[index] === currentLayoutSignature,
      );

      if (state.randomLayoutSourceSignature === currentSourceSignature) {
        return {
          activeRandomLayoutOptionId: activeOptionBySignature?.id ?? null,
          randomLayoutOptionsVisible: true,
          lastEditorStatus: { key: "randomLayoutOptionsReady" },
        };
      }

      const sourceLayoutObjects = getRandomLayoutSourceObjects(roomData);
      const randomLayoutOptions = createRandomLayoutOptions(
        roomData,
        sourceLayoutObjects,
        currentSourceSignature,
      );
      const randomLayoutSourceSignature = currentSourceSignature;
      const randomLayoutOptionSignatures = randomLayoutOptions.map((option) =>
        getRoomDataSignature(roomData, option.objects),
      );

      return {
        randomLayoutOptions,
        activeRandomLayoutOptionId: null,
        randomLayoutSourceSignature,
        randomLayoutOptionSignatures,
        randomLayoutOptionsVisible: true,
        lastEditorStatus: { key: "randomLayoutOptionsReady" },
      };
    }),
  applyRandomLayoutOption: (optionId) =>
    set((state) => {
      const option = state.randomLayoutOptions.find((entry) => entry.id === optionId);

      if (!option) {
        return state;
      }

      const baseRoomData = cloneRoomData(state.roomData);
      const roomData = {
        ...baseRoomData,
        objects: applyLayoutToCurrentObjects(baseRoomData.objects, option.objects),
      };

      return {
        roomData,
        validationWarnings: validateRoomLayout(roomData),
        activeRandomLayoutOptionId: option.id,
        randomLayoutOptionsVisible: true,
        randomLayoutOptionSignatures: state.randomLayoutOptions.map((entry) =>
          getRoomDataSignature(
            baseRoomData,
            applyLayoutToCurrentObjects(baseRoomData.objects, entry.objects),
          ),
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
      activeRandomLayoutOptionId: null,
      randomLayoutOptionsVisible: false,
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
        ...getRandomLayoutCacheUpdate(state.randomLayoutSourceSignature, roomData),
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
        ...getRandomLayoutCacheUpdate(state.randomLayoutSourceSignature, roomData),
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
        ...getRandomLayoutCacheUpdate(state.randomLayoutSourceSignature, roomData),
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
        ...getRandomLayoutCacheUpdate(state.randomLayoutSourceSignature, previous),
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
        ...getRandomLayoutCacheUpdate(state.randomLayoutSourceSignature, next),
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
      let nextRoomData = createDefaultRoomData();
      let status: EditorStatus = { key: "sceneReset" };

      if (mode === "saved" && typeof window !== "undefined") {
        const savedRaw = window.localStorage.getItem(SAVED_ROOM_KEY);

        if (savedRaw) {
          try {
            nextRoomData = cloneRoomData(JSON.parse(savedRaw) as RoomData);
            status = { key: "sceneResetSaved" };
          } catch {
            nextRoomData = createDefaultRoomData();
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
        ...clearRandomLayoutCache(),
      };
    }),
}));
