"use client";

import { useEffect, useRef } from "react";
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { CameraMode, RoomDefinition } from "@/types/room";

interface CameraControlsProps {
  enabled: boolean;
  mode: CameraMode;
  room: RoomDefinition;
}

export function CameraControls({ enabled, mode, room }: CameraControlsProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const targetX = 0;
  const targetZ = 0;
  const roomSpan = Math.max(room.width, room.depth);
  const roomSpanRef = useRef(roomSpan);

  useEffect(() => {
    roomSpanRef.current = roomSpan;
  }, [roomSpan]);

  useEffect(() => {
    const currentRoomSpan = roomSpanRef.current;
    const orbitDistance = Math.max(7.2, currentRoomSpan * 1.05);
    const orbitHeight = Math.max(7.2, currentRoomSpan * 1.15);
    const topHeight = Math.max(9, currentRoomSpan * 1.7);

    camera.position.set(
      mode === "top" ? 0 : orbitDistance,
      mode === "top" ? topHeight : orbitHeight,
      mode === "top" ? 0.01 : orbitDistance,
    );
    camera.lookAt(targetX, 0.45, targetZ);
    controlsRef.current?.target.set(targetX, 0.45, targetZ);
    controlsRef.current?.update();
  }, [camera, mode]);

  useFrame(() => {
    controlsRef.current?.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={enabled}
      enablePan
      minDistance={mode === "top" ? 2.2 : 1.5}
      maxDistance={Math.max(22, roomSpan * 3.4)}
      minPolarAngle={mode === "top" ? Math.PI / 2 - 0.02 : 0.45}
      maxPolarAngle={mode === "top" ? Math.PI / 2 - 0.02 : 1.42}
      enableRotate
    />
  );
}
