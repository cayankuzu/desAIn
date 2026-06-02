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
  resetToken?: number;
}

export function CameraControls({
  enabled,
  mode,
  room,
  resetToken = 0,
}: CameraControlsProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const targetX = 0;
  const targetZ = 0;
  const roomSpan = Math.max(room.width, room.depth);
  const focusY = Math.max(0.45, room.height * 0.16);

  useEffect(() => {
    const orbitDistance = Math.max(7.2, roomSpan * 1.05);
    const orbitHeight = Math.max(7.2, roomSpan * 1.15);
    const topHeight = Math.max(9, roomSpan * 1.7);

    camera.position.set(
      mode === "top" ? 0 : orbitDistance,
      mode === "top" ? topHeight : orbitHeight,
      mode === "top" ? 0.01 : orbitDistance,
    );
    camera.lookAt(targetX, focusY, targetZ);
    controlsRef.current?.target.set(targetX, focusY, targetZ);
    controlsRef.current?.update();
  }, [camera, focusY, mode, resetToken, roomSpan]);

  useFrame(() => {
    controlsRef.current?.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={enabled}
      enableDamping
      enablePan
      enableZoom
      dampingFactor={0.08}
      minDistance={mode === "top" ? 2.2 : 1.5}
      maxDistance={Math.max(22, roomSpan * 3.4)}
      minPolarAngle={mode === "top" ? Math.PI / 2 - 0.02 : 0.45}
      maxPolarAngle={mode === "top" ? Math.PI / 2 - 0.02 : 1.42}
      enableRotate
      panSpeed={0.78}
      rotateSpeed={0.74}
      zoomSpeed={0.88}
    />
  );
}
