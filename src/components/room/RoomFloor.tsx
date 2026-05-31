"use client";

import { useMemo } from "react";
import { Shape } from "three";
import { getRoomOutlinePoints } from "@/lib/room/roomGeometry";
import type { RoomDefinition } from "@/types/room";

interface RoomFloorProps {
  room: RoomDefinition;
}

export function RoomFloor({ room }: RoomFloorProps) {
  const floorShape = useMemo(() => {
    const points = getRoomOutlinePoints(room);
    const shape = new Shape();

    if (points.length > 1) {
      shape.moveTo(points[0][0], points[0][1]);
      points.slice(1).forEach(([x, z]) => shape.lineTo(x, z));
    }

    return shape;
  }, [room]);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <shapeGeometry args={[floorShape]} />
        <meshStandardMaterial color="#39424d" />
      </mesh>
      <gridHelper
        position={[room.width / 2, 0.01, room.depth / 2]}
        args={[
          Math.max(room.width, room.depth),
          Math.round(Math.max(room.width, room.depth) * 2),
          "#5d6a79",
          "#2b323b",
        ]}
      />
    </group>
  );
}
