"use client";

import { useRoomStore } from "@/store/roomStore";
import { useUIStore } from "@/store/uiStore";
import { getWallSegment } from "@/lib/room/roomGeometry";
import type { Opening, RoomDefinition } from "@/types/room";

interface RoomWallsProps {
  room: RoomDefinition;
}

const openingColorMap: Record<Opening["type"], string> = {
  door: "#d36c3d",
  window: "#7cb7cf",
  balcony_door: "#7cb7cf",
  radiator: "#c2803e",
};

export function RoomWalls({ room }: RoomWallsProps) {
  const selectedStructure = useUIStore((state) => state.selectedStructure);
  const setSelectedStructure = useUIStore((state) => state.setSelectedStructure);
  const setActiveSidebarTab = useUIStore((state) => state.setActiveSidebarTab);
  const setSelectedObjectId = useRoomStore((state) => state.setSelectedObjectId);
  const wallHeight = room.height;
  const wallThickness = 0.1;

  const handleStructureSelect = (type: "wall" | "opening", id: string) => {
    setSelectedObjectId(null);
    setSelectedStructure({ type, id });
    setActiveSidebarTab("details");
  };

  return (
    <group>
      {room.walls.map((wall, index) => {
        const dx = wall.to[0] - wall.from[0];
        const dz = wall.to[1] - wall.from[1];
        const horizontal = Math.abs(dx) >= Math.abs(dz);
        const length = Math.hypot(dx, dz);
        const selected =
          selectedStructure?.type === "wall" && selectedStructure.id === wall.id;

        return (
          <mesh
            key={wall.id}
            position={[
              (wall.from[0] + wall.to[0]) / 2,
              wallHeight / 2,
              (wall.from[1] + wall.to[1]) / 2,
            ]}
            castShadow
            receiveShadow
            onClick={(event) => {
              event.stopPropagation();
              handleStructureSelect("wall", wall.id);
            }}
          >
            <boxGeometry
              args={
                horizontal
                  ? [length, wallHeight, wallThickness]
                  : [wallThickness, wallHeight, length]
              }
            />
            <meshStandardMaterial
              color={selected ? "#8cb9ff" : index % 2 === 0 ? "#717a85" : "#646d78"}
            />
          </mesh>
        );
      })}

      {room.openings.map((opening) => {
        const selected =
          selectedStructure?.type === "opening" && selectedStructure.id === opening.id;
        const wall = getWallSegment(room, opening.wallId);

        if (!wall) {
          return null;
        }

        const dx = wall.to[0] - wall.from[0];
        const dz = wall.to[1] - wall.from[1];
        const horizontal = Math.abs(dx) >= Math.abs(dz);
        const direction = horizontal ? Math.sign(dx) || 1 : Math.sign(dz) || 1;
        const centerX = horizontal
          ? wall.from[0] + direction * opening.position
          : wall.from[0];
        const centerZ = horizontal
          ? wall.from[1]
          : wall.from[1] + direction * opening.position;
        const openingHeight = opening.type === "radiator" ? 0.45 : 1.4;
        const centerY = opening.type === "radiator" ? 0.45 : 1.1;

        return (
          <mesh
            key={opening.id}
            position={[centerX, centerY, centerZ]}
            onClick={(event) => {
              event.stopPropagation();
              handleStructureSelect("opening", opening.id);
            }}
          >
            <boxGeometry
              args={
                horizontal
                  ? [opening.width, openingHeight, 0.08]
                  : [0.08, openingHeight, opening.width]
              }
            />
            <meshStandardMaterial
              color={selected ? "#ffddb2" : openingColorMap[opening.type]}
            />
          </mesh>
        );
      })}
    </group>
  );
}
