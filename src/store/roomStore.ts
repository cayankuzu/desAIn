"use client";

import { create } from "zustand";
import { buildMockLayoutResponse } from "@/lib/ai/mockResponses";
import { clampObjectPositionToRoom, normalizeRotation } from "@/lib/room/constraints";
import { defaultRoom } from "@/lib/room/defaultRoom";
import { validateRoomLayout } from "@/lib/room/layoutValidator";
import type { LayoutResponse, LayoutWarning, RoomData } from "@/types/room";
import type { CameraMode, RoomObject, TransformMode } from "@/types/room";

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
  rotateObjectBy: (objectId: string, delta: number) => void;
  toggleObjectLock: (objectId: string) => void;
  applyLayout: (layout: LayoutResponse) => void;
  applyMockPrompt: (message: string) => LayoutResponse;
  undo: () => void;
  redo: () => void;
  resetRoom: () => void;
}

export const useRoomStore = create<RoomStore>((set, get) => ({
  roomData: cloneRoomData(defaultRoom),
  selectedObjectId: "sofa_1",
  cameraMode: "orbit",
  transformMode: "translate",
  validationWarnings: validateRoomLayout(defaultRoom),
  historyPast: [],
  historyFuture: [],
  lastLayoutSummary: "Demo oda yüklendi.",
  activeTransformObjectId: null,
  setSelectedObjectId: (objectId) => set({ selectedObjectId: objectId }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setTransformMode: (mode) => set({ transformMode: mode }),
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
      };
    }),
  endTransform: () => set({ activeTransformObjectId: null }),
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
      };
    }),
  toggleObjectLock: (objectId) =>
    set((state) => {
      const roomData = cloneRoomData(state.roomData);

      updateObjectInRoom(roomData, objectId, (object) => {
        object.locked = !object.locked;
      });

      return {
        roomData,
        validationWarnings: validateRoomLayout(roomData),
        historyPast: limitHistory([
          ...state.historyPast,
          cloneRoomData(state.roomData),
        ]),
        historyFuture: [],
      };
    }),
  applyLayout: (layout) =>
    set((state) => {
      const roomData = cloneRoomData(state.roomData);

      layout.objects.forEach((item) => {
        updateObjectInRoom(roomData, item.id, (object) => {
          if (object.locked || !object.movable) {
            return;
          }

          const nextRotation = normalizeRotation(item.rotation);
          object.rotation = nextRotation;
          object.position = clampObjectPositionToRoom(
            roomData,
            object,
            { x: item.x, z: item.z },
            nextRotation,
          );
        });
      });

      return {
        roomData,
        validationWarnings: validateRoomLayout(roomData),
        historyPast: limitHistory([
          ...state.historyPast,
          cloneRoomData(state.roomData),
        ]),
        historyFuture: [],
        lastLayoutSummary: layout.summary,
      };
    }),
  applyMockPrompt: (message) => {
    const result = buildMockLayoutResponse(message, get().roomData);
    get().applyLayout(result.layout);
    return result.layout;
  },
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
        lastLayoutSummary: "Bir adım geri alındı.",
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
        lastLayoutSummary: "Geri alınan adım tekrar uygulandı.",
      };
    }),
  resetRoom: () =>
    set((state) => ({
      roomData: cloneRoomData(defaultRoom),
      selectedObjectId: "sofa_1",
      validationWarnings: validateRoomLayout(defaultRoom),
      historyPast: limitHistory([
        ...state.historyPast,
        cloneRoomData(state.roomData),
      ]),
      historyFuture: [],
      lastLayoutSummary: "Demo oda sıfırlandı.",
      activeTransformObjectId: null,
    })),
}));
