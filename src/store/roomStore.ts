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
  getObjectMotionRules,
  getWallAttachedObjectTransform,
  isWallAttachedObject,
  normalizeRotation,
  objectsHavePlacementCollision,
  objectIntersectsZone,
} from "@/lib/room/constraints";
import { applyObjectUpdate } from "@/lib/room/applyObjectUpdate";
import { resizeRoomDefinition } from "@/lib/room/defaultRoom";
import { getOpeningHeight } from "@/lib/room/openingPlacement";
import { createRoomPreset } from "@/lib/room/roomPresets";
import { validateRoomLayout } from "@/lib/room/layoutValidator";
import {
  findWallByRotation,
  getWallMetrics,
  getWallLength,
  getWallSegment,
  isOpeningLocked,
  isWallLocked,
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

const serviceWallShapes = new Set([
  "appliance_box",
  "cooktop",
  "washer",
  "kitchen_sink",
  "shower",
  "toilet",
  "bathtub",
  "radiator",
]);

const kitchenRunLabels = new Set([
  "object.counter",
  "object.baseCabinet",
  "object.upperCabinet",
  "object.kitchenSink",
  "object.cooktop",
  "object.oven",
  "object.dishwasher",
  "object.fridge",
  "object.pantryCabinet",
  "object.tallOvenCabinet",
  "object.cornerBaseCabinet",
  "object.microwave",
  "object.rangeHood",
  "object.openKitchenShelf",
  "object.trashPullout",
]);

const laundryRunLabels = new Set([
  "object.washer",
  "object.dryer",
  "object.laundryCounter",
  "object.linenCabinet",
  "object.utilityCart",
]);

const bathRunLabels = new Set([
  "object.vanity",
  "object.roundSink",
  "object.toilet",
  "object.showerCabin",
  "object.bathtub",
  "object.towelRack",
  "object.linenCabinet",
  "object.bathStorageColumn",
]);

const nightstandLabels = new Set([
  "object.nightstand",
  "object.sideTable",
  "object.tableLamp",
]);

const diningTableLabels = new Set([
  "object.diningTable",
  "object.roundTable",
]);

const deskLabels = new Set([
  "object.desk",
  "object.makeupVanity",
]);

const kitchenWorkSurfaceLabels = new Set([
  "object.counter",
  "object.kitchenIsland",
  "object.laundryCounter",
]);

const bedroomStorageLabels = new Set([
  "object.tallWardrobe",
  "object.dresser",
  "object.bedroomBench",
  "object.clothesRack",
  "object.fullHeightMirror",
  "object.makeupVanity",
]);

const entryRunLabels = new Set([
  "object.shoeRack",
  "object.coatStand",
  "object.wallHook",
  "object.entryHangerPanel",
  "object.keyTrayConsole",
  "object.umbrellaStand",
]);

const isLowFloorObject = (object: Pick<RoomObject, "category" | "dimensions">) =>
  object.category === "carpet" || object.dimensions.height <= 0.06;

const isCeilingObject = (object: Pick<RoomObject, "params">) =>
  getObjectBaseShape(object) === "ceiling_light";

const isServiceWallObject = (object: RoomObject) =>
  serviceWallShapes.has(getObjectBaseShape(object)) ||
  kitchenRunLabels.has(object.labelKey) ||
  laundryRunLabels.has(object.labelKey) ||
  bathRunLabels.has(object.labelKey);

const isWallBackedFurniture = (object: RoomObject) => {
  const baseShape = getObjectBaseShape(object);

  return (
    object.category === "wardrobe" ||
    object.category === "bed" ||
    object.category === "tv_unit" ||
    baseShape === "piano" ||
    baseShape === "floor_mirror" ||
    baseShape === "low_shelf" ||
    baseShape === "door_panel"
  );
};

const shouldPreferWallPlacement = (object: RoomObject) => {
  return (
    object.category === "sofa" ||
    isWallBackedFurniture(object) ||
    isServiceWallObject(object)
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

const getOutlineWallCount = (walls: WallSegment[]) => {
  const start = walls[0]?.from;
  let outlineWallCount = 0;

  for (const wall of walls) {
    const previousWall = walls[outlineWallCount - 1];

    if (previousWall && !wallPointsEqual(previousWall.to, wall.from)) {
      break;
    }

    outlineWallCount += 1;

    if (start && outlineWallCount > 1 && wallPointsEqual(wall.to, start)) {
      break;
    }
  }

  return outlineWallCount;
};

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

const getNearestWallProjection = (roomData: RoomData, object: RoomObject) =>
  projectPointToWall(roomData.room, object.position);

const getWallBackGap = (roomData: RoomData, object: RoomObject) => {
  const projection = getNearestWallProjection(roomData, object);

  if (!projection) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, projection.distance - object.dimensions.depth / 2);
};

const getFunctionalRun = (object: RoomObject) => {
  if (kitchenRunLabels.has(object.labelKey)) return "kitchen";
  if (laundryRunLabels.has(object.labelKey)) return "laundry";
  if (bathRunLabels.has(object.labelKey)) return "bath";
  if (object.category === "wardrobe") return "storage";

  return null;
};

const isConversationTable = (object: RoomObject) =>
  object.labelKey === "object.coffeeTable" ||
  object.labelKey === "object.sideTable" ||
  object.labelKey === "object.pouf" ||
  object.labelKey === "object.storageOttoman";

const isSeatObject = (object: RoomObject) =>
  object.category === "sofa" ||
  object.category === "chair" ||
  object.labelKey === "object.pouf" ||
  object.labelKey === "object.beanBag" ||
  object.labelKey === "object.storageOttoman";

const isMediaObject = (object: RoomObject) =>
  object.category === "tv_unit" || getObjectBaseShape(object) === "wall_tv";

const isDiningTableObject = (object: RoomObject) =>
  diningTableLabels.has(object.labelKey);

const isDiningChairObject = (object: RoomObject) =>
  object.labelKey === "object.diningChair";

const isOfficeChairObject = (object: RoomObject) =>
  object.labelKey === "object.officeChair";

const isDeskObject = (object: RoomObject) => deskLabels.has(object.labelKey);

const isBarStoolObject = (object: RoomObject) =>
  object.labelKey === "object.barStool";

const isKitchenWorkSurface = (object: RoomObject) =>
  kitchenWorkSurfaceLabels.has(object.labelKey);

const isNightstandObject = (object: RoomObject) =>
  nightstandLabels.has(object.labelKey);

const isWasherDryerObject = (object: RoomObject) =>
  object.labelKey === "object.washer" || object.labelKey === "object.dryer";

const isMirrorObject = (object: RoomObject) =>
  object.labelKey === "object.mirrorPanel" ||
  object.labelKey === "object.roundWallMirror" ||
  object.labelKey === "object.floorMirror" ||
  object.labelKey === "object.fullHeightMirror";

const isCenterAllowedAnchor = (object: RoomObject) =>
  object.labelKey === "object.diningTable" ||
  object.labelKey === "object.roundTable" ||
  object.labelKey === "object.kitchenIsland" ||
  object.labelKey === "object.coffeeTable" ||
  object.labelKey === "object.storageOttoman" ||
  object.labelKey === "object.pouf" ||
  object.labelKey === "object.beanBag" ||
  object.category === "carpet";

const isCornerAccentObject = (object: RoomObject) => {
  const baseShape = getObjectBaseShape(object);

  return (
    baseShape === "lamp" ||
    baseShape === "plant" ||
    baseShape === "coat_stand" ||
    baseShape === "laundry_basket" ||
    baseShape === "umbrella_stand" ||
    object.labelKey === "object.smallPlant" ||
    object.labelKey === "object.largePlanter"
  );
};

const getNearestMatchingObject = (
  object: RoomObject,
  objects: RoomObject[],
  predicate: (candidate: RoomObject) => boolean,
) =>
  objects
    .filter((candidate) => candidate.id !== object.id && predicate(candidate))
    .sort(
      (left, right) =>
        Math.hypot(object.position.x - left.position.x, object.position.z - left.position.z) -
        Math.hypot(object.position.x - right.position.x, object.position.z - right.position.z),
    )[0] ?? null;

const getObjectDistance = (left: RoomObject, right: RoomObject) =>
  Math.hypot(left.position.x - right.position.x, left.position.z - right.position.z);

const getDistanceRangePenalty = (
  distance: number,
  min: number,
  max: number,
  weight: number,
) => {
  if (distance < min) {
    return (min - distance) * weight;
  }

  if (distance > max) {
    return Math.min(distance - max, 3) * weight;
  }

  return 0;
};

const getSameWallPenalty = (
  roomData: RoomData,
  left: RoomObject,
  right: RoomObject,
  penalty: number,
) => {
  const leftWall = getNearestWallProjection(roomData, left)?.wall.id;
  const rightWall = getNearestWallProjection(roomData, right)?.wall.id;

  return leftWall && rightWall && leftWall !== rightWall ? penalty : 0;
};

const getRoomPurposeFitPenalty = (roomData: RoomData, object: RoomObject) => {
  const purpose = roomData.room.purpose;
  const isKitchenItem =
    kitchenRunLabels.has(object.labelKey) ||
    isKitchenWorkSurface(object) ||
    object.labelKey === "object.barStool";
  const isLaundryItem =
    laundryRunLabels.has(object.labelKey) ||
    object.labelKey === "object.ironingBoard" ||
    object.labelKey === "object.dryingRack";
  const isBathItem = bathRunLabels.has(object.labelKey);
  const isBedroomItem =
    object.category === "bed" ||
    bedroomStorageLabels.has(object.labelKey) ||
    isNightstandObject(object);
  const isEntryItem = entryRunLabels.has(object.labelKey);

  if (isKitchenItem && !["kitchen", "dining", "laundry"].includes(purpose)) {
    return 28;
  }

  if (isLaundryItem && !["laundry", "bathroom", "kitchen"].includes(purpose)) {
    return 42;
  }

  if (isBathItem && !["bathroom", "laundry"].includes(purpose)) {
    return 52;
  }

  if (isBedroomItem && !["bedroom", "kids", "dressing"].includes(purpose)) {
    return 18;
  }

  if (isEntryItem && purpose !== "entry") {
    return 14;
  }

  return 0;
};

const getProfessionalObjectRelationshipPenalty = (
  roomData: RoomData,
  objects: RoomObject[],
  object: RoomObject,
) => {
  const relatedObjects = objects.filter((candidate) => candidate.id !== object.id);
  let penalty = 0;

  if (isSeatObject(object)) {
    const nearestMedia = getNearestMatchingObject(object, relatedObjects, isMediaObject);
    const nearestTable = getNearestMatchingObject(
      object,
      relatedObjects,
      (candidate) => isConversationTable(candidate) || isDiningTableObject(candidate),
    );

    if (nearestMedia) {
      const distance = getObjectDistance(object, nearestMedia);
      penalty += getDistanceRangePenalty(distance, 1.45, 4.6, object.category === "sofa" ? 18 : 12);
      penalty += (1 - getFacingQuality(object, nearestMedia.position)) * 26;
    } else if (nearestTable) {
      const distance = getObjectDistance(object, nearestTable);
      penalty += getDistanceRangePenalty(distance, 0.5, 1.55, 14);
      penalty += (1 - getFacingQuality(object, nearestTable.position)) * 12;
    }
  }

  if (isMediaObject(object)) {
    const nearestSeat = getNearestMatchingObject(object, relatedObjects, isSeatObject);

    if (nearestSeat) {
      const distance = getObjectDistance(object, nearestSeat);
      penalty += getDistanceRangePenalty(distance, 1.45, 4.8, 16);
      penalty += (1 - getFacingQuality(object, nearestSeat.position)) * 30;
      penalty += (1 - getFacingQuality(nearestSeat, object.position)) * 10;
    }
  }

  if (isDiningChairObject(object)) {
    const nearestDiningTable = getNearestMatchingObject(
      object,
      relatedObjects,
      isDiningTableObject,
    );

    if (nearestDiningTable) {
      const distance = getObjectDistance(object, nearestDiningTable);
      penalty += getDistanceRangePenalty(distance, 0.54, 1.18, 34);
      penalty += (1 - getFacingQuality(object, nearestDiningTable.position)) * 26;
    }
  }

  if (isBarStoolObject(object)) {
    const nearestWorkSurface = getNearestMatchingObject(
      object,
      relatedObjects,
      (candidate) =>
        candidate.labelKey === "object.kitchenIsland" ||
        candidate.labelKey === "object.counter",
    );

    if (nearestWorkSurface) {
      const distance = getObjectDistance(object, nearestWorkSurface);
      penalty += getDistanceRangePenalty(distance, 0.48, 1.05, 30);
      penalty += (1 - getFacingQuality(object, nearestWorkSurface.position)) * 20;
    }
  }

  if (isOfficeChairObject(object)) {
    const nearestDesk = getNearestMatchingObject(object, relatedObjects, isDeskObject);

    if (nearestDesk) {
      const distance = getObjectDistance(object, nearestDesk);
      penalty += getDistanceRangePenalty(distance, 0.42, 0.96, 32);
      penalty += (1 - getFacingQuality(object, nearestDesk.position)) * 24;
    }
  }

  if (isDeskObject(object)) {
    const nearestOfficeChair = getNearestMatchingObject(
      object,
      relatedObjects,
      isOfficeChairObject,
    );
    const nearestMonitor = getNearestMatchingObject(
      object,
      relatedObjects,
      (candidate) => candidate.labelKey === "object.monitor",
    );

    if (nearestOfficeChair) {
      penalty += getDistanceRangePenalty(getObjectDistance(object, nearestOfficeChair), 0.42, 1, 22);
    }

    if (nearestMonitor) {
      penalty += getDistanceRangePenalty(getObjectDistance(object, nearestMonitor), 0.08, 0.82, 18);
    }
  }

  if (object.category === "bed") {
    const nightstands = relatedObjects
      .filter(isNightstandObject)
      .map((candidate) => ({
        object: candidate,
        distance: getObjectDistance(object, candidate),
      }))
      .sort((left, right) => left.distance - right.distance);

    nightstands.slice(0, 2).forEach(({ distance }) => {
      penalty += getDistanceRangePenalty(distance, 0.58, 1.65, 24);
    });

    if (nightstands.length >= 2) {
      const [first, second] = nightstands;
      const angleA = Math.atan2(
        first.object.position.z - object.position.z,
        first.object.position.x - object.position.x,
      );
      const angleB = Math.atan2(
        second.object.position.z - object.position.z,
        second.object.position.x - object.position.x,
      );
      const angleDifference = Math.abs(Math.atan2(Math.sin(angleA - angleB), Math.cos(angleA - angleB)));

      penalty += angleDifference < 0.78 ? 28 : 0;
    }
  }

  if (isNightstandObject(object)) {
    const nearestBed = getNearestMatchingObject(
      object,
      relatedObjects,
      (candidate) => candidate.category === "bed",
    );

    if (nearestBed) {
      penalty += getDistanceRangePenalty(getObjectDistance(object, nearestBed), 0.5, 1.7, 28);
    }
  }

  if (isConversationTable(object)) {
    const seatsInReach = relatedObjects.filter(
      (candidate) => isSeatObject(candidate) && getObjectDistance(object, candidate) <= 1.8,
    );

    if (seatsInReach.length) {
      const nearestDistance = Math.min(
        ...seatsInReach.map((candidate) => getObjectDistance(object, candidate)),
      );

      penalty += getDistanceRangePenalty(nearestDistance, 0.48, 1.4, 20);
    } else {
      penalty += 18;
    }
  }

  if (isWasherDryerObject(object)) {
    const pairedMachine = getNearestMatchingObject(
      object,
      relatedObjects,
      (candidate) => isWasherDryerObject(candidate) && candidate.labelKey !== object.labelKey,
    );
    const foldingCounter = getNearestMatchingObject(
      object,
      relatedObjects,
      (candidate) => candidate.labelKey === "object.laundryCounter",
    );

    if (pairedMachine) {
      penalty += getDistanceRangePenalty(getObjectDistance(object, pairedMachine), 0.55, 1.35, 36);
      penalty += getSameWallPenalty(roomData, object, pairedMachine, 34);
    }

    if (foldingCounter) {
      penalty += getDistanceRangePenalty(getObjectDistance(object, foldingCounter), 0.65, 2.15, 12);
    }
  }

  if (object.labelKey === "object.vanity" || object.labelKey === "object.roundSink") {
    const nearestMirror = getNearestMatchingObject(object, relatedObjects, isMirrorObject);

    if (nearestMirror) {
      penalty += getDistanceRangePenalty(getObjectDistance(object, nearestMirror), 0.05, 0.95, 24);
      penalty += getSameWallPenalty(roomData, object, nearestMirror, 24);
    }
  }

  if (object.category === "carpet") {
    const nearestAnchor = getNearestMatchingObject(
      object,
      relatedObjects,
      (candidate) =>
        isSeatObject(candidate) ||
        isConversationTable(candidate) ||
        isDiningTableObject(candidate),
    );

    if (nearestAnchor) {
      penalty += getDistanceRangePenalty(getObjectDistance(object, nearestAnchor), 0, 0.95, 18);
    }
  }

  return penalty;
};

const getDoorCirculationZones = (roomData: RoomData) => {
  const corridorWidth = Math.max(0.72, roomData.constraints.minWalkwayWidth);

  return roomData.room.openings
    .filter((opening) => opening.type === "door" || opening.type === "balcony_door")
    .map((opening) => {
      const wall = getWallSegment(roomData.room, opening.wallId);

      if (!wall) {
        return null;
      }

      const metrics = getWallMetrics(wall);
      const start = {
        x: wall.from[0] + metrics.directionX * opening.position,
        z: wall.from[1] + metrics.directionZ * opening.position,
      };
      const depth = Math.min(
        2.3,
        Math.max(1.35, Math.max(roomData.room.width, roomData.room.depth) * 0.28),
      );
      const end = {
        x: start.x + metrics.inwardNormalX * depth,
        z: start.z + metrics.inwardNormalZ * depth,
      };
      const halfWidth = Math.max(corridorWidth, opening.width + 0.18) / 2;

      return {
        id: `circulation_${opening.id}`,
        type: opening.type,
        minX: Math.min(start.x, end.x) - halfWidth,
        maxX: Math.max(start.x, end.x) + halfWidth,
        minZ: Math.min(start.z, end.z) - halfWidth,
        maxZ: Math.max(start.z, end.z) + halfWidth,
      };
    })
    .filter((zone): zone is ReturnType<typeof getActiveClearanceZones>[number] =>
      Boolean(zone),
    );
};

const getFunctionalRunWallPenalty = (
  roomData: RoomData,
  objects: RoomObject[],
  candidate: RoomObject,
) => {
  const run = getFunctionalRun(candidate);

  if (!run) {
    return 0;
  }

  const candidateWallId = getNearestWallProjection(roomData, candidate)?.wall.id;

  if (!candidateWallId) {
    return 0;
  }

  const relatedWalls = objects
    .filter((object) => object.id !== candidate.id && getFunctionalRun(object) === run)
    .map((object) => getNearestWallProjection(roomData, object)?.wall.id)
    .filter((wallId): wallId is string => Boolean(wallId));

  if (!relatedWalls.length || relatedWalls.includes(candidateWallId)) {
    return 0;
  }

  return run === "storage" ? 10 : 24;
};

const getProfessionalObjectPlacementPenalty = (
  roomData: RoomData,
  objects: RoomObject[],
  object: RoomObject,
) => {
  if (isFixedDuringRandomize(object) || isWallAttachedObject(object) || isCeilingObject(object)) {
    return 0;
  }

  let penalty = 0;
  const wallGap = getWallBackGap(roomData, object);
  const roomCenter = {
    x: roomData.room.width / 2,
    z: roomData.room.depth / 2,
  };
  const centerDistanceRatio =
    Math.hypot(object.position.x - roomCenter.x, object.position.z - roomCenter.z) /
    Math.max(roomData.room.width, roomData.room.depth, 0.01);

  if (isServiceWallObject(object)) {
    penalty += wallGap > 0.18 ? 220 + wallGap * 120 : wallGap * 12;
    penalty += centerDistanceRatio < 0.28 ? 120 : 0;
  } else if (isWallBackedFurniture(object)) {
    penalty += wallGap > 0.28 ? 95 + wallGap * 58 : wallGap * 8;
  } else if (object.category === "sofa") {
    penalty += wallGap > 0.42 ? 42 + wallGap * 22 : 0;
  } else if (isCornerAccentObject(object)) {
    penalty += wallGap > 0.7 ? 20 + wallGap * 16 : 0;
    penalty += centerDistanceRatio < 0.24 ? 28 : 0;
  } else if (isCenterAllowedAnchor(object)) {
    penalty += wallGap < 0.28 && object.category !== "carpet" ? 22 : 0;
  }

  if (!isLowFloorObject(object)) {
    penalty += getDoorCirculationZones(roomData).reduce(
      (total, zone) => total + (objectIntersectsZone(object, zone) ? 95 : 0),
      0,
    );
  }

  penalty += getFunctionalRunWallPenalty(roomData, objects, object);

  if (object.category === "chair") {
    const nearestTable = getNearestMatchingObject(
      object,
      objects,
      (candidate) => candidate.category === "table" || isCenterAllowedAnchor(candidate),
    );

    if (nearestTable) {
      const tableDistance = Math.hypot(
        object.position.x - nearestTable.position.x,
        object.position.z - nearestTable.position.z,
      );

      penalty += tableDistance < 0.48 ? (0.48 - tableDistance) * 90 : 0;
      penalty += tableDistance > 1.35 ? Math.min(tableDistance - 1.35, 2) * 22 : 0;
      penalty += (1 - getFacingQuality(object, nearestTable.position)) * 16;
    }
  }

  if (isConversationTable(object)) {
    const nearestSeat = getNearestMatchingObject(
      object,
      objects,
      (candidate) => candidate.category === "sofa" || candidate.category === "chair",
    );

    if (nearestSeat) {
      const seatDistance = Math.hypot(
        object.position.x - nearestSeat.position.x,
        object.position.z - nearestSeat.position.z,
      );

      penalty += seatDistance < 0.45 ? (0.45 - seatDistance) * 70 : 0;
      penalty += seatDistance > 1.65 ? Math.min(seatDistance - 1.65, 2) * 20 : 0;
    }
  }

  return penalty;
};

const getNegativeSpacePenalty = (roomData: RoomData, objects: RoomObject[]) => {
  const center = {
    x: roomData.room.width / 2,
    z: roomData.room.depth / 2,
  };
  const openCoreRadius = Math.min(roomData.room.width, roomData.room.depth) * 0.2;
  const tallObjectsInCore = objects.filter((object) => {
    if (
      isFixedDuringRandomize(object) ||
      isWallAttachedObject(object) ||
      isLowFloorObject(object) ||
      isCenterAllowedAnchor(object)
    ) {
      return false;
    }

    return getObjectDistance(object, {
      ...object,
      id: "room_center",
      position: center,
    }) < openCoreRadius;
  });

  return tallObjectsInCore.reduce(
    (total, object) =>
      total +
      (isServiceWallObject(object) || isWallBackedFurniture(object) ? 46 : 16),
    0,
  );
};

const getDiningChairDistributionPenalty = (objects: RoomObject[]) =>
  objects
    .filter(isDiningTableObject)
    .reduce((total, table) => {
      const nearbyChairs = objects.filter(
        (object) => isDiningChairObject(object) && getObjectDistance(object, table) <= 1.45,
      );

      if (nearbyChairs.length < 3) {
        return total;
      }

      const quadrants = new Set(
        nearbyChairs.map((chair) => {
          const angle = Math.atan2(
            chair.position.z - table.position.z,
            chair.position.x - table.position.x,
          );

          return Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 4);
        }),
      );

      return total + (quadrants.size < Math.min(nearbyChairs.length, 4) ? 18 : 0);
    }, 0);

const getProfessionalLayoutPenalty = (roomData: RoomData, objects: RoomObject[]) =>
  objects.reduce(
    (total, object) =>
      total +
      getProfessionalObjectPlacementPenalty(roomData, objects, object) +
      getProfessionalObjectRelationshipPenalty(roomData, objects, object) +
      getRoomPurposeFitPenalty(roomData, object),
    0,
  ) +
  getNegativeSpacePenalty(roomData, objects) +
  getDiningChairDistributionPenalty(objects);

const hasHardProfessionalPlacementViolation = (
  roomData: RoomData,
  draftObjects: RoomObject[],
  object: RoomObject,
) => {
  if (isFixedDuringRandomize(object) || isWallAttachedObject(object) || isCeilingObject(object)) {
    return false;
  }

  if (isServiceWallObject(object) && getWallBackGap(roomData, object) > 0.32) {
    return true;
  }

  if (isWallBackedFurniture(object) && getWallBackGap(roomData, object) > 0.55) {
    return true;
  }

  if (isLowFloorObject(object)) {
    return false;
  }

  return getDoorCirculationZones(roomData).some((zone) =>
    objectIntersectsZone(object, zone),
  ) && !draftObjects.some((draftObject) => draftObject.id === object.id);
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
  center?: RoomObject["position"],
): WallSegment => {
  const ratios = [0.5, 0.35, 0.65, 0.25, 0.75];
  const outlineWallCount = getOutlineWallCount(walls);
  const dividerIndex = Math.max(0, walls.length - outlineWallCount);
  const ratio = ratios[dividerIndex % ratios.length];
  const margin = 0.45;

  if (room.width >= room.depth) {
    const x = Number(
      Math.min(
        room.width - margin,
        Math.max(margin, center?.x ?? room.width * ratio),
      ).toFixed(2),
    );

    return {
      id: createWallId(walls),
      from: [x, Number(Math.min(room.depth / 2, margin).toFixed(2))],
      to: [x, Number(Math.max(room.depth - margin, room.depth / 2).toFixed(2))],
      locked: true,
    };
  }

  const z = Number(
    Math.min(
      room.depth - margin,
      Math.max(margin, center?.z ?? room.depth * ratio),
    ).toFixed(2),
  );

  return {
    id: createWallId(walls),
    from: [Number(Math.min(room.width / 2, margin).toFixed(2)), z],
    to: [Number(Math.max(room.width - margin, room.width / 2).toFixed(2)), z],
    locked: true,
  };
};

const hasBlockingWarnings = (roomData: RoomData, objects: RoomObject[]) =>
  validateRoomLayout({
    ...roomData,
    objects,
  }).some((warning) => warning.level === "error" || warning.code === "collision");

const hasOpenRoomBoundary = (warnings: LayoutWarning[]) =>
  warnings.some((warning) => warning.code === "room_open_outline");

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

type AddTemplateResult =
  | { type: "object"; id: string }
  | { type: "wall"; id: string }
  | null;

const isDividerWallTemplate = (template: InventoryTemplate) =>
  template.params.createsWall === true ||
  String(template.params.baseShape ?? "") === "divider_wall_tool";

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
    algorithm: "professional-layout-v5",
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

    return (
      validationPenalty +
      getDesignPenalty(roomData, orientedObjects) +
      getProfessionalLayoutPenalty(roomData, orientedObjects)
    );
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
  getProfessionalLayoutPenalty(roomData, objects) +
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

const FLOOR_CANDIDATE_LIMIT = 120;
const PLACEMENT_CANDIDATE_SCAN_LIMIT = 42;
const LAYOUT_SEARCH_PASS_LIMIT = 360;
const MAX_PROFESSIONAL_RANDOM_OPTIONS = 24;

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

const spreadPlacementCandidates = (
  candidates: PlacementCandidate[],
  limit: number,
) => {
  if (candidates.length <= limit) {
    return candidates;
  }

  const selected: PlacementCandidate[] = [];
  const selectedIndexes = new Set<number>();
  const lastIndex = candidates.length - 1;

  for (let index = 0; index < limit; index += 1) {
    const candidateIndex =
      limit === 1 ? 0 : Math.round((index / (limit - 1)) * lastIndex);

    if (!selectedIndexes.has(candidateIndex)) {
      selectedIndexes.add(candidateIndex);
      selected.push(candidates[candidateIndex]);
    }
  }

  for (
    let candidateIndex = 0;
    selected.length < limit && candidateIndex < candidates.length;
    candidateIndex += 1
  ) {
    if (!selectedIndexes.has(candidateIndex)) {
      selectedIndexes.add(candidateIndex);
      selected.push(candidates[candidateIndex]);
    }
  }

  return selected;
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

  return spreadPlacementCandidates(
    dedupePlacementCandidates(candidates),
    FLOOR_CANDIDATE_LIMIT,
  );
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

const getFastCandidatePlacementScore = (
  roomData: RoomData,
  draftObjects: RoomObject[],
  candidate: RoomObject,
  sourceObject: RoomObject,
  zones: ReturnType<typeof getActiveClearanceZones>,
) => {
  const roomCenter = {
    x: roomData.room.width / 2,
    z: roomData.room.depth / 2,
  };
  const relationalObjects = getRelationalObjects(
    roomData,
    candidate.id,
    draftObjects,
  );
  const nearestTv = getNearestObject(
    candidate,
    relationalObjects.filter((object) => object.category === "tv_unit"),
  );
  const nearestSeat = getNearestObject(
    candidate,
    relationalObjects.filter(
      (object) => object.category === "sofa" || object.category === "chair",
    ),
  );
  const nearestTable = getNearestObject(
    candidate,
    relationalObjects.filter((object) => object.category === "table"),
  );
  const clearancePenalty =
    !isWallAttachedObject(candidate) && candidate.dimensions.height > 0.06
      ? zones.reduce(
          (total, zone) =>
            total + (objectIntersectsZone(candidate, zone) ? 120 : 0),
          0,
        )
      : 0;
  const movement = getCandidateMovement(sourceObject, candidate);
  const centerDistance =
    Math.hypot(candidate.position.x - roomCenter.x, candidate.position.z - roomCenter.z) /
    Math.max(roomData.room.width, roomData.room.depth, 0.01);
  let relationPenalty = 0;
  const professionalPenalty = getProfessionalObjectPlacementPenalty(
    roomData,
    draftObjects,
    candidate,
  );
  const draftWithCandidate = [
    ...draftObjects.filter((object) => object.id !== candidate.id),
    candidate,
  ];
  const professionalRelationshipPenalty =
    getProfessionalObjectRelationshipPenalty(
      roomData,
      draftWithCandidate,
      candidate,
    ) + getRoomPurposeFitPenalty(roomData, candidate);

  if (candidate.category === "sofa" || candidate.category === "chair") {
    const target = nearestTv?.position ?? nearestTable?.position ?? roomCenter;
    const targetDistance = Math.hypot(
      candidate.position.x - target.x,
      candidate.position.z - target.z,
    );

    relationPenalty += (1 - getFacingQuality(candidate, target)) * 12;
    relationPenalty +=
      nearestTv && (targetDistance < 1.15 || targetDistance > 5)
        ? Math.min(Math.abs(targetDistance - 2.6), 3) * 3
        : 0;
  }

  if (candidate.category === "tv_unit" && nearestSeat) {
    relationPenalty += (1 - getFacingQuality(candidate, nearestSeat.position)) * 14;
  }

  if (candidate.category === "table" && nearestSeat) {
    const seatDistance = Math.hypot(
      candidate.position.x - nearestSeat.position.x,
      candidate.position.z - nearestSeat.position.z,
    );

    relationPenalty += seatDistance < 0.6 ? (0.6 - seatDistance) * 12 : 0;
  }

  return (
    clearancePenalty +
    relationPenalty +
    professionalPenalty +
    professionalRelationshipPenalty +
    centerDistance * (isWallAttachedObject(candidate) ? 2 : 6) -
    Math.min(movement, 4) * 0.35
  );
};

const pickPlacementCandidate = (
  roomData: RoomData,
  draftObjects: RoomObject[],
  pool: PlacementPool,
  passIndex: number,
  seedSignature: string,
  zones: ReturnType<typeof getActiveClearanceZones>,
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
  const scanIndexes =
    forcedIndex === undefined
      ? indexes.slice(0, PLACEMENT_CANDIDATE_SCAN_LIMIT)
      : [
          forcedIndex,
          ...indexes.filter((candidateIndex) => candidateIndex !== forcedIndex),
        ].slice(0, PLACEMENT_CANDIDATE_SCAN_LIMIT);

  scanIndexes.forEach((candidateIndex, orderIndex) => {
    const candidate = cloneRoomObject(pool.candidates[candidateIndex].object);
    if (hasHardProfessionalPlacementViolation(roomData, draftObjects, candidate)) {
      return;
    }

    const intersects = draftObjects.some((existing) =>
      objectsHavePlacementCollision(existing, candidate, 0.06),
    );

    if (intersects) {
      return;
    }

    const score = getFastCandidatePlacementScore(
      roomData,
      draftObjects,
      candidate,
      pool.sourceObject,
      zones,
    );
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

  const anchorSweeps = candidateCounts.reduce((total, count) => total + count, 0);
  const desiredPasses = Math.max(anchorSweeps, Math.max(...candidateCounts));

  return Math.max(1, Math.min(LAYOUT_SEARCH_PASS_LIMIT, desiredPasses));
};

const finishSystematicLayout = (roomData: RoomData, objects: RoomObject[]) =>
  orientSocialObjects(
    roomData,
    objects.map((object) => cloneRoomObject(object)),
  ).map((object) => {
    const normalized = isFixedDuringRandomize(object)
      ? object
      : normalizeRoomObjects(roomData, [object])[0];

    return {
      ...normalized,
      position: {
        x: Number(normalized.position.x.toFixed(3)),
        z: Number(normalized.position.z.toFixed(3)),
      },
      rotation: Math.round(normalizeRotation(normalized.rotation)),
    };
  });

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
  const zones = getActiveClearanceZones(roomData);

  if (!movableObjects.length) {
    return finishSystematicLayout(roomData, fixedObjects);
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
        zones,
        object.id === anchorObject.id ? anchorCandidateIndex : undefined,
      ),
    );
  });

  return finishSystematicLayout(roomData, draftObjects).map((object) => {
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
    .slice(0, MAX_PROFESSIONAL_RANDOM_OPTIONS)
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
  loadRoomData: (roomData: RoomData) => void;
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
  toggleOpeningLock: (openingId: string, locked?: boolean) => void;
  deleteOpening: (openingId: string) => void;
  updateWallSegment: (
    wallId: string,
    payload: Partial<{
      from: [number, number];
      to: [number, number];
    }>,
  ) => void;
  toggleWallLock: (wallId: string, locked?: boolean) => void;
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
      mountHeight?: number;
    },
  ) => void;
  addObjectFromTemplate: (
    templateId: string,
    position?: RoomObject["position"],
  ) => AddTemplateResult;
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
        lastEditorStatus: {
          key: structureId.startsWith("wall_") ? "wallUpdated" : "openingUpdated",
        },
      };
    }),
  endTransform: () =>
    set((state) => ({
      activeTransformObjectId: null,
      lastEditorStatus: state.activeTransformObjectId
        ? state.activeTransformObjectId.startsWith("wall_")
          ? { key: "wallUpdated" }
          : state.activeTransformObjectId.startsWith("door_") ||
          state.activeTransformObjectId.startsWith("window_") ||
          state.activeTransformObjectId.startsWith("radiator_")
          ? { key: "openingUpdated" }
          : { key: "objectUpdated", objectId: state.activeTransformObjectId }
        : state.lastEditorStatus,
    })),
  loadRoomData: (nextRoomData) =>
    set((state) => {
      const roomData = cloneRoomData(nextRoomData);
      const selectedObjectId = roomData.objects[0]?.id ?? null;

      return {
        roomData,
        selectedObjectId,
        selectedObjectIds: selectedObjectId ? [selectedObjectId] : [],
        selectedGroupId: null,
        validationWarnings: validateRoomLayout(roomData),
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
        cameraMode: state.cameraMode,
        transformMode: state.transformMode,
      };
    }),
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
      const targetOpening = roomData.room.openings.find((opening) => opening.id === openingId);

      if (!targetOpening || isOpeningLocked(targetOpening)) {
        return state;
      }

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

      if (!opening || isOpeningLocked(opening)) {
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
  toggleOpeningLock: (openingId, locked) =>
    set((state) => {
      const roomData = cloneRoomData(state.roomData);
      const openingIndex = roomData.room.openings.findIndex(
        (opening) => opening.id === openingId,
      );

      if (openingIndex < 0) {
        return state;
      }

      const currentLocked = isOpeningLocked(roomData.room.openings[openingIndex]);
      roomData.room.openings[openingIndex] = {
        ...roomData.room.openings[openingIndex],
        locked: locked ?? !currentLocked,
      };

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
  deleteOpening: (openingId) =>
    set((state) => {
      if (!state.roomData.room.openings.some((opening) => opening.id === openingId)) {
        return state;
      }

      const roomData = cloneRoomData(state.roomData);
      roomData.room.openings = roomData.room.openings.filter(
        (opening) => opening.id !== openingId,
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
        lastEditorStatus: { key: "openingUpdated" },
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

      if (isWallLocked(walls[wallIndex])) {
        return state;
      }

      const outlineWallCount = getOutlineWallCount(walls);
      const isOutlineWall = wallIndex < outlineWallCount;
      const previousIndex = isOutlineWall
        ? wallIndex === 0
          ? outlineWallCount - 1
          : wallIndex - 1
        : wallIndex - 1;
      const nextIndex = isOutlineWall
        ? wallIndex === outlineWallCount - 1
          ? 0
          : wallIndex + 1
        : wallIndex + 1;
      const previousWall = walls[previousIndex] ?? null;
      const nextWall = walls[nextIndex] ?? null;
      const connectsPrevious =
        previousWall !== null && wallPointsEqual(previousWall.to, walls[wallIndex].from);
      const connectsNext =
        nextWall !== null && wallPointsEqual(nextWall.from, walls[wallIndex].to);
      const isActiveTransform = state.activeTransformObjectId === wallId;
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
        historyPast: isActiveTransform
          ? state.historyPast
          : limitHistory([
              ...state.historyPast,
              cloneRoomData(state.roomData),
            ]),
        historyFuture: isActiveTransform ? state.historyFuture : [],
        lastEditorStatus: { key: "wallUpdated" },
      };
    }),
  toggleWallLock: (wallId, locked) =>
    set((state) => {
      const roomData = cloneRoomData(state.roomData);
      const wallIndex = roomData.room.walls.findIndex((wall) => wall.id === wallId);

      if (wallIndex < 0) {
        return state;
      }

      const currentLocked = isWallLocked(roomData.room.walls[wallIndex]);
      const nextLocked = locked ?? !currentLocked;

      roomData.room.walls[wallIndex] = {
        ...roomData.room.walls[wallIndex],
        locked: nextLocked,
      };

      return {
        roomData,
        validationWarnings: validateRoomLayout(roomData),
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

      if (isWallLocked(wall) || length < 1.2) {
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
        locked: wall.locked ?? true,
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

        const motion = getObjectMotionRules(object);
        const nextRotation = motion.rotate
          ? normalizeRotation(payload.rotation ?? object.rotation)
          : object.rotation;
        const desiredPosition = {
          x: motion.translateX ? payload.position?.x ?? object.position.x : object.position.x,
          z: motion.translateZ ? payload.position?.z ?? object.position.z : object.position.z,
        };

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
          object.rotation = motion.rotate ? placement.rotation : object.rotation;
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
        applyObjectUpdate(roomData, object, payload);
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
  addObjectFromTemplate: (templateId, position) => {
    let result: AddTemplateResult = null;

    set((state) => {
      const template = getInventoryTemplateById(templateId);

      if (!template) {
        return state;
      }

      const roomData = cloneRoomData(state.roomData);

      if (isDividerWallTemplate(template)) {
        const walls = roomData.room.walls.map((wall) => ({ ...wall }));
        const dividerWall = createDividerWallSegment(roomData.room, walls, position);

        result = { type: "wall", id: dividerWall.id };
        walls.push(dividerWall);
        roomData.room = normalizeCustomRoom(roomData.room, walls);
        roomData.objects = normalizeRoomObjects(roomData, roomData.objects);

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
          lastEditorStatus: { key: "wallUpdated" },
        };
      }

      const newObject = createObjectFromTemplate(template, roomData, position);
      result = { type: "object", id: newObject.id };
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
    });

    return result;
  },
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
      const validationWarnings = validateRoomLayout(roomData);

      if (hasOpenRoomBoundary(validationWarnings)) {
        return {
          validationWarnings,
          randomLayoutOptions: [],
          activeRandomLayoutOptionId: null,
          randomLayoutSourceSignature: null,
          randomLayoutOptionSignatures: [],
          randomLayoutOptionsVisible: true,
          lastEditorStatus: { key: "randomLayoutOptionsReady" },
        };
      }

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
      const validationWarnings = validateRoomLayout(roomData);

      if (hasOpenRoomBoundary(validationWarnings)) {
        return {
          validationWarnings,
          randomLayoutOptions: [],
          activeRandomLayoutOptionId: null,
          randomLayoutSourceSignature: null,
          randomLayoutOptionSignatures: [],
          randomLayoutOptionsVisible: true,
          lastEditorStatus: { key: "randomLayoutOptionsReady" },
        };
      }

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

        const motion = getObjectMotionRules(object);
        if (!motion.rotate) {
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
