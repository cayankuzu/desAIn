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
  getWallAttachedObjectTransform,
  isWallAttachedObject,
  normalizeRotation,
} from "@/lib/room/constraints";
import { defaultRoom, resizeRoomDefinition } from "@/lib/room/defaultRoom";
import { validateRoomLayout } from "@/lib/room/layoutValidator";
import {
  getWallLength,
  normalizeOpeningForRoom,
} from "@/lib/room/roomGeometry";
import type {
  CameraMode,
  LayoutWarning,
  Opening,
  RoomData,
  RoomObject,
  RoomShape,
  TransformMode,
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

const getDesignPenalty = (roomData: RoomData, objects: RoomObject[]) => {
  const roomCenter = {
    x: roomData.room.width / 2,
    z: roomData.room.depth / 2,
  };
  const tvObjects = objects.filter((object) => object.category === "tv_unit");

  return objects.reduce((total, object) => {
    if (isFixedDuringRandomize(object) || isWallAttachedObject(object)) {
      return total;
    }

    if (object.category === "sofa" || object.category === "chair") {
      const nearestTv = [...tvObjects].sort(
        (left, right) =>
          Math.hypot(
            object.position.x - left.position.x,
            object.position.z - left.position.z,
          ) -
          Math.hypot(
            object.position.x - right.position.x,
            object.position.z - right.position.z,
          ),
      )[0];

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

      return total + (1 - getFacingQuality(object, roomCenter)) * 8;
    }

    if (shouldPreferWallPlacement(object)) {
      return total + (1 - getFacingQuality(object, roomCenter)) * 6;
    }

    return total;
  }, 0);
};

const orientSocialObjects = (objects: RoomObject[]) => {
  const tvObjects = objects.filter((object) => object.category === "tv_unit");

  if (!tvObjects.length) {
    return objects;
  }

  return objects.map((object) => {
    if (isFixedDuringRandomize(object)) {
      return object;
    }

    const shouldFaceTv =
      !shouldPreferWallPlacement(object) &&
      (object.category === "sofa" ||
        object.category === "chair" ||
        getObjectBaseShape(object) === "piano");

    if (!shouldFaceTv) {
      return object;
    }

    const nearestTv = [...tvObjects].sort(
      (left, right) =>
        Math.hypot(
          object.position.x - left.position.x,
          object.position.z - left.position.z,
        ) -
        Math.hypot(
          object.position.x - right.position.x,
          object.position.z - right.position.z,
        ),
    )[0];

    if (!nearestTv) {
      return object;
    }

    return {
      ...object,
      rotation: getFacingRotation(object.position, nearestTv.position),
    };
  });
};

const clampOpening = (roomData: RoomData, opening: Opening): Opening => {
  const wallLength = getWallLength(roomData.room, opening.wallId);
  const minPosition = opening.width / 2 + 0.2;
  const maxPosition = Math.max(minPosition, wallLength - opening.width / 2 - 0.2);

  return {
    ...opening,
    width: Math.max(0.3, Number(opening.width.toFixed(2))),
    position: Math.min(maxPosition, Math.max(minPosition, Number(opening.position.toFixed(2)))),
  };
};

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

  const scoreLayout = (layoutObjects: RoomObject[]) => {
    const orientedObjects = orientSocialObjects(layoutObjects);
    const warnings = validateRoomLayout({
      ...roomData,
      objects: orientedObjects,
    });

    const validationPenalty = warnings.reduce(
      (total, warning) => total + (warning.level === "error" ? 1000 : 120),
      0,
    );

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

  for (let layoutAttempt = 0; layoutAttempt < 220; layoutAttempt += 1) {
    const draftObjects = fixedObjects.map((object) => cloneRoomObject(object));

    movableObjects.forEach((object) => {
      const draft = cloneRoomObject(object);
      let bestCandidate: RoomObject | null = null;
      let bestCandidateScore = Number.POSITIVE_INFINITY;
      let bestCandidateMovement = Number.NEGATIVE_INFINITY;
      const rotations = [0, 90, 180, 270];

      for (let attempt = 0; attempt < 180; attempt += 1) {
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

        const candidateScore = scoreLayout([...draftObjects, candidate]);
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
      bestObjects = orientSocialObjects(draftObjects).map((object) =>
        cloneRoomObject(object),
      );
      bestScore = layoutScore;
      bestMovement = layoutMovement;
    }
  }

  return orientSocialObjects(bestObjects);
};

interface RoomStore {
  roomData: RoomData;
  selectedObjectId: string | null;
  cameraMode: CameraMode;
  transformMode: TransformMode;
  validationWarnings: LayoutWarning[];
  historyPast: RoomData[];
  historyFuture: RoomData[];
  lastEditorStatus: EditorStatus;
  activeTransformObjectId: string | null;
  clipboardObject: RoomObject | null;
  setSelectedObjectId: (objectId: string | null) => void;
  setCameraMode: (mode: CameraMode) => void;
  setTransformMode: (mode: TransformMode) => void;
  beginTransform: (objectId: string) => void;
  endTransform: () => void;
  updateRoomProperties: (payload: {
    shape?: RoomShape;
    width?: number;
    depth?: number;
    height?: number;
    cutoutWidth?: number;
    cutoutDepth?: number;
  }) => void;
  updateOpening: (
    openingId: string,
    payload: Partial<Pick<Opening, "wallId" | "position" | "width">>,
  ) => void;
  updateObjectTransform: (
    objectId: string,
    payload: Partial<Pick<RoomObject, "rotation" | "position">>,
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
  copySelectedObject: () => void;
  cutSelectedObject: () => void;
  pasteClipboardObject: () => void;
  randomizeLayout: () => void;
  saveRoomSnapshot: () => void;
  rotateObjectBy: (objectId: string, delta: number) => void;
  toggleObjectLock: (objectId: string) => void;
  undo: () => void;
  redo: () => void;
  resetRoom: () => void;
}

export const useRoomStore = create<RoomStore>((set) => ({
  roomData: cloneRoomData(defaultRoom),
  selectedObjectId: "sofa_1",
  cameraMode: "orbit",
  transformMode: "select",
  validationWarnings: validateRoomLayout(defaultRoom),
  historyPast: [],
  historyFuture: [],
  lastEditorStatus: { key: "roomLoaded" },
  activeTransformObjectId: null,
  clipboardObject: null,
  setSelectedObjectId: (objectId) =>
    set({
      selectedObjectId: objectId,
      lastEditorStatus: objectId
        ? { key: "objectSelected", objectId }
        : { key: "selectionCleared" },
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
  endTransform: () =>
    set((state) => ({
      activeTransformObjectId: null,
      lastEditorStatus: state.activeTransformObjectId
        ? { key: "objectUpdated", objectId: state.activeTransformObjectId }
        : state.lastEditorStatus,
    })),
  updateRoomProperties: (payload) =>
    set((state) => {
      const roomData = cloneRoomData(state.roomData);
      roomData.room = resizeRoomDefinition(roomData.room, payload);
      roomData.room.openings = roomData.room.openings.map((opening) =>
        normalizeOpeningForRoom(roomData.room, clampOpening(roomData, opening)),
      );
      roomData.objects = normalizeRoomObjects(roomData, roomData.objects);

      return {
        roomData,
        validationWarnings: validateRoomLayout(roomData),
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
        lastEditorStatus: { key: "roomUpdated" },
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
        validationWarnings: validateRoomLayout(roomData),
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
      const nextSelection = roomData.objects.at(-1)?.id ?? null;

      return {
        roomData,
        selectedObjectId: nextSelection,
        validationWarnings: validateRoomLayout(roomData),
        historyPast: limitHistory([
          ...state.historyPast,
          cloneRoomData(state.roomData),
        ]),
        historyFuture: [],
        lastEditorStatus: { key: "objectUpdated", objectId: targetId },
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

      return {
        clipboardObject: cloneRoomObject(selectedObject),
        roomData,
        selectedObjectId: roomData.objects.at(-1)?.id ?? null,
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
        validationWarnings: validateRoomLayout(roomData),
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
      let sourceObjects = roomData.objects;

      if (typeof window !== "undefined") {
        const savedRaw = window.localStorage.getItem(SAVED_ROOM_KEY);

        if (savedRaw) {
          try {
            const parsed = JSON.parse(savedRaw) as RoomData;
            sourceObjects = normalizeRoomObjects(roomData, parsed.objects);
          } catch {
            sourceObjects = roomData.objects;
          }
        }
      }

      const fixedCurrentObjects = roomData.objects
        .filter((object) => isFixedDuringRandomize(object))
        .map((object) => cloneRoomObject(object));
      const fixedIds = new Set(fixedCurrentObjects.map((object) => object.id));
      const movableSourceObjects = sourceObjects
        .filter((object) => !isFixedDuringRandomize(object))
        .map((object) => cloneRoomObject(object));
      const sourceLayoutObjects = [
        ...fixedCurrentObjects,
        ...movableSourceObjects.filter((object) => !fixedIds.has(object.id)),
      ];

      roomData.objects = tryRandomLayout(roomData, sourceLayoutObjects);

      return {
        roomData,
        validationWarnings: validateRoomLayout(roomData),
        historyPast: limitHistory([
          ...state.historyPast,
          cloneRoomData(state.roomData),
        ]),
        historyFuture: [],
        lastEditorStatus: { key: "roomUpdated" },
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
        lastEditorStatus: { key: "roomUpdated" },
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
  resetRoom: () =>
    set((state) => ({
      roomData: cloneRoomData(defaultRoom),
      selectedObjectId: "sofa_1",
      cameraMode: "orbit",
      transformMode: "select",
      validationWarnings: validateRoomLayout(defaultRoom),
      historyPast: limitHistory([
        ...state.historyPast,
        cloneRoomData(state.roomData),
      ]),
      historyFuture: [],
      lastEditorStatus: { key: "sceneReset" },
      activeTransformObjectId: null,
      clipboardObject: null,
    })),
}));
