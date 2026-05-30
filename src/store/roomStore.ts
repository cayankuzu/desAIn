"use client";

import { create } from "zustand";
import { clampObjectPositionToRoom, normalizeRotation } from "@/lib/room/constraints";
import { defaultRoom } from "@/lib/room/defaultRoom";
import { validateRoomLayout } from "@/lib/room/layoutValidator";
import type { LayoutWarning, RoomData, RoomObject } from "@/types/room";
import type { CameraMode, TransformMode } from "@/types/room";

const cloneRoomData = (roomData: RoomData): RoomData =>
  JSON.parse(JSON.stringify(roomData)) as RoomData;

const limitHistory = (history: RoomData[]) => history.slice(-40);

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

const findObjectLabel = (roomData: RoomData, objectId: string | null) => {
  if (!objectId) {
    return null;
  }

  return roomData.objects.find((object) => object.id === objectId)?.label ?? null;
};

const clampDimension = (value: number, fallback: number) => {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0.05, Number(value.toFixed(2)));
};

interface RoomStore {
  roomData: RoomData;
  selectedObjectId: string | null;
  cameraMode: CameraMode;
  transformMode: TransformMode;
  validationWarnings: LayoutWarning[];
  historyPast: RoomData[];
  historyFuture: RoomData[];
  lastLayoutSummary: string;
  activeTransformObjectId: string | null;
  setSelectedObjectId: (objectId: string | null) => void;
  setCameraMode: (mode: CameraMode) => void;
  setTransformMode: (mode: TransformMode) => void;
  beginTransform: (objectId: string) => void;
  endTransform: () => void;
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
  lastLayoutSummary: "Studio Loft loaded",
  activeTransformObjectId: null,
  setSelectedObjectId: (objectId) =>
    set((state) => ({
      selectedObjectId: objectId,
      lastLayoutSummary: objectId
        ? `${findObjectLabel(state.roomData, objectId) ?? "Object"} selected`
        : "Selection cleared",
    })),
  setCameraMode: (mode) =>
    set({
      cameraMode: mode,
      lastLayoutSummary:
        mode === "orbit" ? "Perspective viewport enabled" : "Top viewport enabled",
    }),
  setTransformMode: (mode) =>
    set({
      transformMode: mode,
      lastLayoutSummary:
        mode === "select"
          ? "Selection mode"
          : mode === "translate"
            ? "Move gizmo enabled"
            : "Rotate gizmo enabled",
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
        lastLayoutSummary: `${findObjectLabel(state.roomData, objectId) ?? "Object"} editing`,
      };
    }),
  endTransform: () =>
    set((state) => ({
      activeTransformObjectId: null,
      lastLayoutSummary: state.activeTransformObjectId
        ? `${findObjectLabel(state.roomData, state.activeTransformObjectId) ?? "Object"} updated`
        : state.lastLayoutSummary,
    })),
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
        lastLayoutSummary: `${findObjectLabel(roomData, objectId) ?? "Object"} properties updated`,
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
        lastLayoutSummary: `${findObjectLabel(roomData, objectId) ?? "Object"} rotated`,
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
        lastLayoutSummary: `${findObjectLabel(roomData, objectId) ?? "Object"} ${isLocked ? "locked" : "unlocked"}`,
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
        lastLayoutSummary: "Undo applied",
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
        lastLayoutSummary: "Redo applied",
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
      lastLayoutSummary: "Scene reset to default layout",
      activeTransformObjectId: null,
    })),
}));
