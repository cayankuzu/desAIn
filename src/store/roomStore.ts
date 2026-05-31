"use client";

import { create } from "zustand";
import { boundsIntersect, getObjectBounds } from "@/lib/room/collision";
import type { EditorStatus } from "@/lib/i18n/translations";
import {
  getInventoryTemplateById,
  type InventoryTemplate,
} from "@/lib/room/inventoryCatalog";
import { clampObjectPositionToRoom, normalizeRotation } from "@/lib/room/constraints";
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
    .filter(
      (object) =>
        object.locked || !object.movable || getMountHeight(object) > 0,
    )
    .map((object) => cloneRoomObject(object));
  const movableObjects = objects
    .filter(
      (object) =>
        !object.locked && object.movable && getMountHeight(object) === 0,
    )
    .map((object) => cloneRoomObject(object))
    .sort(
      (left, right) =>
        right.dimensions.width * right.dimensions.depth -
        left.dimensions.width * left.dimensions.depth,
    );

  const scoreLayout = (layoutObjects: RoomObject[]) =>
    validateRoomLayout({
      ...roomData,
      objects: layoutObjects,
    }).length;

  let bestObjects: RoomObject[] = [
    ...fixedObjects,
    ...movableObjects.map((object) => cloneRoomObject(object)),
  ];
  let bestScore = scoreLayout(bestObjects);

  for (let layoutAttempt = 0; layoutAttempt < 140; layoutAttempt += 1) {
    const draftObjects = fixedObjects.map((object) => cloneRoomObject(object));

    movableObjects.forEach((object) => {
      const draft = cloneRoomObject(object);
      let bestCandidate: RoomObject | null = null;
      let bestCandidateScore = Number.POSITIVE_INFINITY;
      const rotations = [0, 90, 180, 270];

      for (let attempt = 0; attempt < 80; attempt += 1) {
        const rotation = rotations[Math.floor(Math.random() * rotations.length)];
        const desiredPosition = {
          x: 0.3 + Math.random() * Math.max(0.4, roomData.room.width - 0.6),
          z: 0.3 + Math.random() * Math.max(0.4, roomData.room.depth - 0.6),
        };
        const clampedPosition = clampObjectPositionToRoom(
          roomData,
          draft,
          desiredPosition,
          rotation,
        );
        const candidate = {
          ...draft,
          rotation,
          position: clampedPosition,
        };
        const intersects = draftObjects.some((existing) =>
          boundsIntersect(getObjectBounds(existing), getObjectBounds(candidate), 0.06),
        );

        if (intersects) {
          continue;
        }

        const candidateScore = scoreLayout([...draftObjects, candidate]);

        if (candidateScore < bestCandidateScore) {
          bestCandidate = candidate;
          bestCandidateScore = candidateScore;

          if (candidateScore === 0) {
            break;
          }
        }
      }

      if (bestCandidate) {
        draftObjects.push(bestCandidate);
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

    if (layoutScore < bestScore) {
      bestObjects = draftObjects.map((object) => cloneRoomObject(object));
      bestScore = layoutScore;
    }

    if (bestScore === 0) {
      break;
    }
  }

  return bestObjects;
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
        object.rotation = nextRotation;
        object.position = clampObjectPositionToRoom(
          roomData,
          object,
          desiredPosition,
          nextRotation,
        );

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
      pasted.position = clampObjectPositionToRoom(
        roomData,
        pasted,
        {
          x: pasted.position.x + 0.35,
          z: pasted.position.z + 0.35,
        },
        pasted.rotation,
      );

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
      let sourceRoom = roomData;

      if (typeof window !== "undefined") {
        const savedRaw = window.localStorage.getItem(SAVED_ROOM_KEY);

        if (savedRaw) {
          try {
            const parsed = JSON.parse(savedRaw) as RoomData;
            sourceRoom = {
              ...roomData,
              objects: normalizeRoomObjects(roomData, parsed.objects),
            };
          } catch {
            sourceRoom = roomData;
          }
        }
      }

      roomData.objects = tryRandomLayout(roomData, sourceRoom.objects);

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
