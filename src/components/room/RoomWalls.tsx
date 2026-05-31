"use client";

import type { ReactNode } from "react";
import type { Group } from "three";
import { useRoomStore } from "@/store/roomStore";
import { useUIStore } from "@/store/uiStore";
import {
  getOpeningBottom,
  getOpeningHeight,
  getOpeningSceneTransform,
} from "@/lib/room/openingPlacement";
import { getWallMetrics, getWallSegment, isWallLocked } from "@/lib/room/roomGeometry";
import type { Opening, RoomDefinition } from "@/types/room";

interface RoomWallsProps {
  room: RoomDefinition;
  onWallReady?: (wallId: string, node: Group | null) => void;
  onOpeningReady?: (openingId: string, node: Group | null) => void;
}

const openingColorMap: Record<Opening["type"], string> = {
  door: "#d36c3d",
  window: "#7cb7cf",
  balcony_door: "#7cb7cf",
  radiator: "#c2803e",
};

const getOpeningCutout = (opening: Opening, roomHeight: number) => {
  if (opening.type === "door" || opening.type === "balcony_door") {
    return {
      bottom: getOpeningBottom(opening, roomHeight),
      height: getOpeningHeight(opening, roomHeight),
    };
  }

  if (opening.type === "window") {
    return {
      bottom: getOpeningBottom(opening, roomHeight),
      height: getOpeningHeight(opening, roomHeight),
    };
  }

  return null;
};

function OpeningVisual({
  opening,
  roomHeight,
  selected,
}: {
  opening: Opening;
  roomHeight: number;
  selected: boolean;
}) {
  const frameColor = selected ? "#ffddb2" : openingColorMap[opening.type];
  const innerDepth = 0.04;
  const openingHeight = getOpeningHeight(opening, roomHeight);

  if (opening.type === "door" || opening.type === "balcony_door") {
    return (
      <group>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[opening.width, openingHeight, 0.08]} />
          <meshStandardMaterial color={frameColor} />
        </mesh>
        <mesh castShadow position={[0, 0, 0.05]}>
          <boxGeometry args={[Math.max(0.2, opening.width - 0.08), openingHeight - 0.08, 0.02]} />
          <meshStandardMaterial color={selected ? "#f9d9b7" : "#f1cfaa"} />
        </mesh>
      </group>
    );
  }

  if (opening.type === "window") {
    return (
      <group>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[opening.width, openingHeight, 0.08]} />
          <meshStandardMaterial color={frameColor} />
        </mesh>
        <mesh castShadow position={[0, 0, innerDepth]}>
          <boxGeometry args={[Math.max(0.22, opening.width - 0.14), openingHeight - 0.14, 0.02]} />
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

  const radiatorHeight = openingHeight;

  return (
    <group>
      {[-0.24, -0.12, 0, 0.12, 0.24].map((offset) => (
        <mesh
          key={offset}
          castShadow
          receiveShadow
          position={[offset * opening.width, 0, 0]}
        >
          <boxGeometry args={[opening.width * 0.12, radiatorHeight, 0.08]} />
          <meshStandardMaterial color={frameColor} />
        </mesh>
      ))}
      <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
        <boxGeometry args={[opening.width, 0.05, 0.09]} />
        <meshStandardMaterial color={selected ? "#f7c78c" : "#d69d54"} />
      </mesh>
    </group>
  );
}

export function RoomWalls({ room, onWallReady, onOpeningReady }: RoomWallsProps) {
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
        const { length, directionX, directionZ, rotationY } = getWallMetrics(wall);
        const selected =
          selectedStructure?.type === "wall" && selectedStructure.id === wall.id;
        const locked = isWallLocked(wall);
        const wallColor = selected
          ? "#8cb9ff"
          : locked
            ? index % 2 === 0
              ? "#626c78"
              : "#596370"
            : "#7289a8";
        const centerX = (wall.from[0] + wall.to[0]) / 2;
        const centerZ = (wall.from[1] + wall.to[1]) / 2;
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
              rotation={[0, rotationY, 0]}
              castShadow
              receiveShadow
              onClick={(event) => {
                event.stopPropagation();
                handleStructureSelect("wall", wall.id);
              }}
            >
              <boxGeometry args={[pieceLength, height, wallThickness]} />
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

        return (
          <group key={wall.id}>
            {wallPieces}
            <group
              ref={(node) => onWallReady?.(wall.id, node)}
              position={[centerX, wallHeight / 2, centerZ]}
              rotation={[0, rotationY, 0]}
            />
          </group>
        );
      })}

      {room.openings.map((opening) => {
        const selected =
          selectedStructure?.type === "opening" && selectedStructure.id === opening.id;
        const wall = getWallSegment(room, opening.wallId);

        if (!wall) {
          return null;
        }

        const transform = getOpeningSceneTransform(room, opening, wallThickness);

        return (
          <group
            key={opening.id}
            ref={(node) => onOpeningReady?.(opening.id, node)}
            position={[
              transform.position.x,
              transform.position.y,
              transform.position.z,
            ]}
            rotation={[0, transform.rotationY, 0]}
            onClick={(event) => {
              event.stopPropagation();
              handleStructureSelect("opening", opening.id);
            }}
          >
            <OpeningVisual
              opening={opening}
              roomHeight={room.height}
              selected={selected}
            />
          </group>
        );
      })}
    </group>
  );
}
