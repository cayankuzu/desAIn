"use client";

import type { ReactNode } from "react";
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

const getOpeningCutout = (opening: Opening, roomHeight: number) => {
  if (opening.type === "door" || opening.type === "balcony_door") {
    return {
      bottom: 0,
      height: Math.min(2.08, Math.max(1.6, roomHeight - 0.18)),
    };
  }

  if (opening.type === "window") {
    return {
      bottom: Math.min(0.9, Math.max(0.45, roomHeight * 0.28)),
      height: Math.min(1.12, Math.max(0.55, roomHeight * 0.42)),
    };
  }

  return null;
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
        const { horizontal, length, directionX, directionZ } = getWallMetrics(wall);
        const selected =
          selectedStructure?.type === "wall" && selectedStructure.id === wall.id;
        const wallColor = selected ? "#8cb9ff" : index % 2 === 0 ? "#717a85" : "#646d78";
        const wallOpenings = room.openings
          .filter((opening) => opening.wallId === wall.id)
          .map((opening) => ({
            opening,
            cutout: getOpeningCutout(opening, wallHeight),
          }));
        const cutOpenings = wallOpenings
          .filter(
            (entry): entry is { opening: Opening; cutout: { bottom: number; height: number } } =>
              Boolean(entry.cutout),
          )
          .sort((left, right) => left.opening.position - right.opening.position);

        const renderWallPiece = (
          startAlong: number,
          endAlong: number,
          bottom: number,
          height: number,
          key: string,
        ) => {
          const pieceLength = endAlong - startAlong;

          if (pieceLength <= 0.02 || height <= 0.02) {
            return null;
          }

          const centerAlong = startAlong + pieceLength / 2;
          const centerX = wall.from[0] + directionX * centerAlong;
          const centerZ = wall.from[1] + directionZ * centerAlong;

          return (
            <mesh
              key={key}
              position={[centerX, bottom + height / 2, centerZ]}
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
                    ? [pieceLength, height, wallThickness]
                    : [wallThickness, height, pieceLength]
                }
              />
              <meshStandardMaterial color={wallColor} />
            </mesh>
          );
        };

        const wallPieces: ReactNode[] = [];
        let cursor = 0;

        cutOpenings.forEach(({ opening, cutout }) => {
          const start = Math.max(0, opening.position - opening.width / 2);
          const end = Math.min(length, opening.position + opening.width / 2);

          wallPieces.push(
            renderWallPiece(cursor, start, 0, wallHeight, `${wall.id}-before-${opening.id}`),
          );
          wallPieces.push(
            renderWallPiece(
              start,
              end,
              0,
              cutout.bottom,
              `${wall.id}-below-${opening.id}`,
            ),
          );
          wallPieces.push(
            renderWallPiece(
              start,
              end,
              cutout.bottom + cutout.height,
              Math.max(0, wallHeight - cutout.bottom - cutout.height),
              `${wall.id}-above-${opening.id}`,
            ),
          );
          cursor = Math.max(cursor, end);
        });

        wallPieces.push(renderWallPiece(cursor, length, 0, wallHeight, `${wall.id}-after`));

        return <group key={wall.id}>{wallPieces}</group>;
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
