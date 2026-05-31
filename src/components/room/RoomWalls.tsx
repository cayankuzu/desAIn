"use client";

import { useRoomStore } from "@/store/roomStore";
import { useUIStore } from "@/store/uiStore";
import { getWallSegment } from "@/lib/room/roomGeometry";
import type { Opening, RoomDefinition, WallSegment } from "@/types/room";

interface RoomWallsProps {
  room: RoomDefinition;
}

const openingColorMap: Record<Opening["type"], string> = {
  door: "#d36c3d",
  window: "#7cb7cf",
  balcony_door: "#7cb7cf",
  radiator: "#c2803e",
};

const getWallMetrics = (wall: WallSegment) => {
  const dx = wall.to[0] - wall.from[0];
  const dz = wall.to[1] - wall.from[1];
  const length = Math.hypot(dx, dz) || 1;

  return {
    dx,
    dz,
    length,
    horizontal: Math.abs(dx) >= Math.abs(dz),
    directionX: dx / length,
    directionZ: dz / length,
    inwardNormalX: -dz / length,
    inwardNormalZ: dx / length,
  };
};

function OpeningVisual({
  opening,
  horizontal,
  selected,
}: {
  opening: Opening;
  horizontal: boolean;
  selected: boolean;
}) {
  const frameColor = selected ? "#ffddb2" : openingColorMap[opening.type];
  const innerDepth = horizontal ? 0.04 : 0.04;

  if (opening.type === "door" || opening.type === "balcony_door") {
    const openingHeight = 2.08;

    return (
      <group>
        <mesh castShadow receiveShadow>
          <boxGeometry
            args={
              horizontal
                ? [opening.width, openingHeight, 0.08]
                : [0.08, openingHeight, opening.width]
            }
          />
          <meshStandardMaterial color={frameColor} />
        </mesh>
        <mesh
          castShadow
          position={horizontal ? [0, 0, 0.05] : [0.05, 0, 0]}
        >
          <boxGeometry
            args={
              horizontal
                ? [Math.max(0.2, opening.width - 0.08), openingHeight - 0.08, 0.02]
                : [0.02, openingHeight - 0.08, Math.max(0.2, opening.width - 0.08)]
            }
          />
          <meshStandardMaterial color={selected ? "#f9d9b7" : "#f1cfaa"} />
        </mesh>
      </group>
    );
  }

  if (opening.type === "window") {
    const openingHeight = 1.12;

    return (
      <group>
        <mesh castShadow receiveShadow>
          <boxGeometry
            args={
              horizontal
                ? [opening.width, openingHeight, 0.08]
                : [0.08, openingHeight, opening.width]
            }
          />
          <meshStandardMaterial color={frameColor} />
        </mesh>
        <mesh castShadow position={horizontal ? [0, 0, innerDepth] : [innerDepth, 0, 0]}>
          <boxGeometry
            args={
              horizontal
                ? [Math.max(0.22, opening.width - 0.14), openingHeight - 0.14, 0.02]
                : [0.02, openingHeight - 0.14, Math.max(0.22, opening.width - 0.14)]
            }
          />
          <meshStandardMaterial
            color="#d8eef7"
            transparent
            opacity={0.5}
            emissive="#7cb7cf"
            emissiveIntensity={selected ? 0.42 : 0.22}
          />
        </mesh>
      </group>
    );
  }

  const radiatorHeight = 0.52;

  return (
    <group>
      {[-0.24, -0.12, 0, 0.12, 0.24].map((offset) => (
        <mesh
          key={offset}
          castShadow
          receiveShadow
          position={
            horizontal
              ? [offset * opening.width, 0, 0]
              : [0, 0, offset * opening.width]
          }
        >
          <boxGeometry
            args={
              horizontal
                ? [opening.width * 0.12, radiatorHeight, 0.08]
                : [0.08, radiatorHeight, opening.width * 0.12]
            }
          />
          <meshStandardMaterial color={frameColor} />
        </mesh>
      ))}
      <mesh castShadow receiveShadow position={horizontal ? [0, -0.2, 0] : [0, -0.2, 0]}>
        <boxGeometry
          args={
            horizontal ? [opening.width, 0.05, 0.09] : [0.09, 0.05, opening.width]
          }
        />
        <meshStandardMaterial color={selected ? "#f7c78c" : "#d69d54"} />
      </mesh>
    </group>
  );
}

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
        const { horizontal, length } = getWallMetrics(wall);
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

        const {
          horizontal,
          directionX,
          directionZ,
          inwardNormalX,
          inwardNormalZ,
        } = getWallMetrics(wall);
        const alongX = wall.from[0] + directionX * opening.position;
        const alongZ = wall.from[1] + directionZ * opening.position;
        const wallOffset = wallThickness / 2 + 0.03;
        const centerX = alongX + inwardNormalX * wallOffset;
        const centerZ = alongZ + inwardNormalZ * wallOffset;
        const openingHeight = opening.type === "radiator" ? 0.52 : opening.type === "window" ? 1.12 : 2.08;
        const centerY =
          opening.type === "radiator"
            ? 0.45
            : opening.type === "window"
              ? 1.38
              : openingHeight / 2;

        return (
          <group
            key={opening.id}
            position={[centerX, centerY, centerZ]}
            onClick={(event) => {
              event.stopPropagation();
              handleStructureSelect("opening", opening.id);
            }}
          >
            <OpeningVisual
              opening={opening}
              horizontal={horizontal}
              selected={selected}
            />
          </group>
        );
      })}
    </group>
  );
}
