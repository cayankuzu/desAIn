"use client";

import { useCallback, useMemo, useState } from "react";
import { ContactShadows } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { Group } from "three";
import { clampObjectPositionToRoom, normalizeRotation } from "@/lib/room/constraints";
import { useRoomStore } from "@/store/roomStore";
import { useUIStore } from "@/store/uiStore";
import { CameraControls } from "./CameraControls";
import { ObjectControls } from "./ObjectControls";
import { RoomFloor } from "./RoomFloor";
import { RoomObject } from "./RoomObject";
import { RoomWalls } from "./RoomWalls";

export function RoomScene() {
  const roomData = useRoomStore((state) => state.roomData);
  const selectedObjectId = useRoomStore((state) => state.selectedObjectId);
  const cameraMode = useRoomStore((state) => state.cameraMode);
  const transformMode = useRoomStore((state) => state.transformMode);
  const beginTransform = useRoomStore((state) => state.beginTransform);
  const endTransform = useRoomStore((state) => state.endTransform);
  const updateObjectTransform = useRoomStore((state) => state.updateObjectTransform);
  const setSelectedObjectId = useRoomStore((state) => state.setSelectedObjectId);
  const setSelectedStructure = useUIStore((state) => state.setSelectedStructure);
  const [isTransforming, setIsTransforming] = useState(false);
  const [objectMap, setObjectMap] = useState<Record<string, Group | null>>({});

  const selectedObject =
    roomData.objects.find((object) => object.id === selectedObjectId) ?? null;
  const selectedSceneObject = selectedObjectId ? objectMap[selectedObjectId] ?? null : null;

  const canTransform = Boolean(
    selectedObject &&
      selectedSceneObject &&
      selectedObject.movable &&
      !selectedObject.locked &&
      transformMode !== "select",
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

  const syncSelectedFromScene = () => {
    if (!selectedSceneObject || !selectedObject) {
      return;
    }

    const mountHeight =
      typeof selectedObject.params.mountHeight === "number"
        ? selectedObject.params.mountHeight
        : 0;
    const nextRotation = normalizeRotation(
      (selectedSceneObject.rotation.y * 180) / Math.PI,
    );
    const desiredPosition = {
      x: selectedSceneObject.position.x,
      z: selectedSceneObject.position.z,
    };
    const clamped = clampObjectPositionToRoom(
      roomData,
      selectedObject,
      desiredPosition,
      nextRotation,
    );

    selectedSceneObject.position.set(clamped.x, mountHeight, clamped.z);
    selectedSceneObject.rotation.set(0, (nextRotation * Math.PI) / 180, 0);
    updateObjectTransform(selectedObject.id, {
      position: clamped,
      rotation: nextRotation,
    });
  };

  return (
    <Canvas
      shadows
      camera={{ position: [6.4, 5.8, 6.4], fov: 40 }}
      onPointerMissed={() => {
        setSelectedStructure(null);
        setSelectedObjectId(null);
      }}
    >
      <color attach="background" args={["#0b1016"]} />
      <fog attach="fog" args={["#0b1016", 11, 22]} />

      <ambientLight intensity={0.85} />
      <directionalLight
        castShadow
        position={[8, 12, 6]}
        intensity={1.35}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[0.8, 4.4, 0.8]} intensity={0.5} color="#7fb7ff" />
      <pointLight position={[-2.4, 3.8, 2.2]} intensity={0.35} color="#ff914d" />

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
      />

      <group position={roomOffset}>
        <RoomFloor room={roomData.room} />
        <RoomWalls room={roomData.room} />
        {roomData.objects.map((object) => (
          <RoomObject
            key={object.id}
            object={object}
            isSelected={selectedObjectId === object.id}
            onObjectReady={handleObjectReady}
          />
        ))}
        <ContactShadows
          position={[roomData.room.width / 2, 0.01, roomData.room.depth / 2]}
          scale={Math.max(roomData.room.width, roomData.room.depth) * 1.2}
          blur={2.4}
          opacity={0.38}
          far={10}
        />
      </group>

      <CameraControls enabled={!isTransforming} mode={cameraMode} room={roomData.room} />
    </Canvas>
  );
}
