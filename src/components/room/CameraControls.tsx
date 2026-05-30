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

const viewPositions: Record<CameraMode, [number, number, number]> = {
  orbit: [8, 6, 8],
  top: [0, 10.5, 0.01],
};

export function CameraControls({ enabled, mode, room }: CameraControlsProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const targetX = 0;
  const targetZ = 0;

  useEffect(() => {
    camera.position.set(
      viewPositions[mode][0] - (mode === "top" ? 0 : room.width / 3),
      viewPositions[mode][1],
      viewPositions[mode][2] - (mode === "top" ? 0 : room.depth / 3),
    );
    camera.lookAt(targetX, 0.6, targetZ);
    controlsRef.current?.target.set(targetX, 0.6, targetZ);
    controlsRef.current?.update();
  }, [camera, mode, room.depth, room.width, targetX, targetZ]);

  useFrame(() => {
    controlsRef.current?.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={enabled}
      enablePan
      minDistance={mode === "top" ? 4 : 4}
      maxDistance={14}
      minPolarAngle={mode === "top" ? Math.PI / 2 - 0.02 : 0.45}
      maxPolarAngle={mode === "top" ? Math.PI / 2 - 0.02 : 1.42}
      enableRotate
    />
  );
}
