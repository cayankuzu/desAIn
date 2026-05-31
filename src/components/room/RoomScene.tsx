"use client";

import { useCallback, useMemo, useState } from "react";
import { ContactShadows, GizmoHelper, GizmoViewport } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { Group } from "three";
import {
  clampObjectPositionToRoom,
  getWallAttachedObjectTransform,
  isWallAttachedObject,
  normalizeRotation,
} from "@/lib/room/constraints";
import {
  getOpeningHeight,
  getOpeningSceneTransform,
} from "@/lib/room/openingPlacement";
import {
  findWallByRotation,
  getWallMetrics,
  getWallSegment,
  normalizeOpeningForRoom,
  projectPointToWall,
} from "@/lib/room/roomGeometry";
import { useRoomStore } from "@/store/roomStore";
import { useUIStore } from "@/store/uiStore";
import { CameraControls } from "./CameraControls";
import { ObjectControls } from "./ObjectControls";
import { RoomFloor } from "./RoomFloor";
import { RoomObject } from "./RoomObject";
import { RoomWalls } from "./RoomWalls";
import type { RoomObject as RoomObjectType } from "@/types/room";

interface RoomSceneProps {
  previewObject?: RoomObjectType | null;
}

export function RoomScene({ previewObject = null }: RoomSceneProps) {
  const roomData = useRoomStore((state) => state.roomData);
  const selectedObjectId = useRoomStore((state) => state.selectedObjectId);
  const selectedObjectIds = useRoomStore((state) => state.selectedObjectIds);
  const cameraMode = useRoomStore((state) => state.cameraMode);
  const transformMode = useRoomStore((state) => state.transformMode);
  const beginTransform = useRoomStore((state) => state.beginTransform);
  const beginStructureTransform = useRoomStore((state) => state.beginStructureTransform);
  const endTransform = useRoomStore((state) => state.endTransform);
  const updateObjectTransform = useRoomStore((state) => state.updateObjectTransform);
  const updateOpeningTransform = useRoomStore((state) => state.updateOpeningTransform);
  const setSelectedObjectId = useRoomStore((state) => state.setSelectedObjectId);
  const selectedStructure = useUIStore((state) => state.selectedStructure);
  const setSelectedStructure = useUIStore((state) => state.setSelectedStructure);
  const setMultiSelectMenu = useUIStore((state) => state.setMultiSelectMenu);
  const [isTransforming, setIsTransforming] = useState(false);
  const [objectMap, setObjectMap] = useState<Record<string, Group | null>>({});
  const [openingMap, setOpeningMap] = useState<Record<string, Group | null>>({});

  const selectedObject =
    roomData.objects.find((object) => object.id === selectedObjectId) ?? null;
  const selectedSceneObject = selectedObjectId ? objectMap[selectedObjectId] ?? null : null;
  const selectedOpening =
    selectedStructure?.type === "opening"
      ? roomData.room.openings.find((opening) => opening.id === selectedStructure.id) ?? null
      : null;
  const selectedSceneOpening = selectedOpening ? openingMap[selectedOpening.id] ?? null : null;

  const canTransform = Boolean(
    selectedObject &&
      selectedSceneObject &&
      selectedObject.movable &&
      !selectedObject.locked &&
      transformMode !== "select",
  );
  const canTransformOpening = Boolean(
    selectedOpening && selectedSceneOpening && transformMode !== "select",
  );

  const roomOffset = useMemo(
    () => [-roomData.room.width / 2, 0, -roomData.room.depth / 2] as const,
    [roomData.room.depth, roomData.room.width],
  );
  const handleObjectReady = useCallback((objectId: string, node: Group | null) => {
    setObjectMap((current) =>
      current[objectId] === node
        ? current
        : {
            ...current,
            [objectId]: node,
          },
    );
  }, []);
  const handleOpeningReady = useCallback((openingId: string, node: Group | null) => {
    setOpeningMap((current) =>
      current[openingId] === node
        ? current
        : {
            ...current,
            [openingId]: node,
          },
    );
  }, []);

  const syncSelectedFromScene = () => {
    if (!selectedSceneObject || !selectedObject) {
      return;
    }

    const mountHeight =
      typeof selectedObject.params.mountHeight === "number"
        ? selectedObject.params.mountHeight
        : 0;
    const isWallObject = isWallAttachedObject(selectedObject);
    const nextMountHeight = isWallObject
      ? Math.min(
          Math.max(0, selectedSceneObject.position.y),
          Math.max(0, roomData.room.height - selectedObject.dimensions.height),
        )
      : mountHeight;
    const nextRotation = normalizeRotation(
      (selectedSceneObject.rotation.y * 180) / Math.PI,
    );
    const desiredPosition = {
      x: selectedSceneObject.position.x,
      z: selectedSceneObject.position.z,
    };

    if (isWallObject) {
      const objectForPlacement = {
        ...selectedObject,
        params: {
          ...selectedObject.params,
          mountHeight: nextMountHeight,
        },
      };
      const placement = getWallAttachedObjectTransform(
        roomData,
        objectForPlacement,
        desiredPosition,
      );

      selectedSceneObject.position.set(
        placement.position.x,
        nextMountHeight,
        placement.position.z,
      );
      selectedSceneObject.rotation.set(0, (placement.rotation * Math.PI) / 180, 0);
      updateObjectTransform(selectedObject.id, {
        position: placement.position,
        rotation: placement.rotation,
        mountHeight: nextMountHeight,
      });
      return;
    }

    const clamped = clampObjectPositionToRoom(
      roomData,
      selectedObject,
      desiredPosition,
      nextRotation,
    );

    selectedSceneObject.position.set(clamped.x, nextMountHeight, clamped.z);
    selectedSceneObject.rotation.set(0, (nextRotation * Math.PI) / 180, 0);
    updateObjectTransform(selectedObject.id, {
      position: clamped,
      rotation: nextRotation,
      mountHeight: nextMountHeight,
    });
  };

  const syncSelectedOpeningFromScene = () => {
    if (!selectedOpening || !selectedSceneOpening) {
      return;
    }

    const openingHeight = getOpeningHeight(selectedOpening, roomData.room.height);
    const nextSillHeight = Math.min(
      Math.max(0, selectedSceneOpening.position.y - openingHeight / 2),
      Math.max(0, roomData.room.height - openingHeight),
    );
    const rotationWall = findWallByRotation(roomData.room, selectedSceneOpening.rotation.y);
    const projection = projectPointToWall(
      roomData.room,
      {
        x: selectedSceneOpening.position.x,
        z: selectedSceneOpening.position.z,
      },
      rotationWall?.id ?? selectedOpening.wallId,
    );
    const wallId = projection?.wall.id ?? rotationWall?.id ?? selectedOpening.wallId;
    const wall = getWallSegment(roomData.room, wallId);
    const wallRotation =
      wall
        ? normalizeRotation((getWallMetrics(wall).rotationY * 180) / Math.PI)
        : selectedOpening.rotation;
    const projectedOpening = normalizeOpeningForRoom(roomData.room, {
      ...selectedOpening,
      wallId,
      position: projection?.along ?? selectedOpening.position,
      rotation: wallRotation,
      sillHeight: nextSillHeight,
    });
    const transform = getOpeningSceneTransform(roomData.room, projectedOpening);

    selectedSceneOpening.position.set(
      transform.position.x,
      transform.position.y,
      transform.position.z,
    );
    selectedSceneOpening.rotation.set(0, transform.rotationY, 0);
    updateOpeningTransform(selectedOpening.id, {
      position: {
        x: transform.position.x,
        z: transform.position.z,
      },
      rotationY: transform.rotationY,
      sillHeight: nextSillHeight,
    });
  };

  return (
    <Canvas
      shadows="percentage"
      gl={{ preserveDrawingBuffer: true }}
      camera={{ position: [6.4, 5.8, 6.4], fov: 40 }}
      onPointerMissed={() => {
        setSelectedStructure(null);
        setMultiSelectMenu(null);
        setSelectedObjectId(null);
      }}
    >
      <color attach="background" args={["#0b1016"]} />
      <ambientLight intensity={1.35} />
      <hemisphereLight args={["#e9f4ff", "#4c3828", 0.85]} />
      <directionalLight
        castShadow
        position={[8, 12, 6]}
        intensity={1.55}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-8, 8, -6]} intensity={0.72} color="#d8ecff" />
      <pointLight position={[0.8, 4.8, 0.8]} intensity={0.72} color="#7fb7ff" distance={18} />
      <pointLight position={[-2.4, 4.2, 2.2]} intensity={0.48} color="#ffbf8a" distance={18} />

      <ObjectControls
        object={selectedSceneObject}
        enabled={canTransform}
        mode={transformMode === "rotate" ? "rotate" : "translate"}
        onBegin={() => {
          if (!selectedObjectId) {
            return;
          }

          setIsTransforming(true);
          beginTransform(selectedObjectId);
        }}
        onEnd={() => {
          setIsTransforming(false);
          endTransform();
        }}
        onObjectChange={syncSelectedFromScene}
        showTranslateY={selectedObject ? isWallAttachedObject(selectedObject) : false}
      />
      <ObjectControls
        object={selectedSceneOpening}
        enabled={canTransformOpening}
        mode={transformMode === "rotate" ? "rotate" : "translate"}
        onBegin={() => {
          if (!selectedOpening) {
            return;
          }

          setIsTransforming(true);
          beginStructureTransform(selectedOpening.id);
        }}
        onEnd={() => {
          setIsTransforming(false);
          endTransform();
        }}
        onObjectChange={syncSelectedOpeningFromScene}
        showTranslateY
      />

      <group position={roomOffset}>
        <RoomFloor room={roomData.room} />
        <RoomWalls room={roomData.room} onOpeningReady={handleOpeningReady} />
        {roomData.objects.map((object) => (
          <RoomObject
            key={object.id}
            object={object}
            isSelected={selectedObjectId === object.id || selectedObjectIds.includes(object.id)}
            onObjectReady={handleObjectReady}
          />
        ))}
        {previewObject ? (
          <RoomObject
            key={previewObject.id}
            object={previewObject}
            isSelected={false}
            interactive={false}
            isGhost
          />
        ) : null}
        <ContactShadows
          position={[roomData.room.width / 2, 0.01, roomData.room.depth / 2]}
          scale={Math.max(roomData.room.width, roomData.room.depth) * 1.2}
          blur={2.4}
          opacity={0.38}
          far={10}
        />
      </group>

      <CameraControls enabled={!isTransforming} mode={cameraMode} room={roomData.room} />
      <GizmoHelper alignment="bottom-left" margin={[72, 72]}>
        <GizmoViewport
          axisColors={["#ef4444", "#22c55e", "#3b82f6"]}
          labelColor="#f8fafc"
        />
      </GizmoHelper>
    </Canvas>
  );
}
