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
  const wallHeight = room.height;
  const wallThickness = 0.1;

  return (
    <group>
      <mesh
        position={[room.width / 2, wallHeight / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[room.width, wallHeight, wallThickness]} />
        <meshStandardMaterial color="#f0e6d7" />
      </mesh>
      <mesh
        position={[room.width, wallHeight / 2, room.depth / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[wallThickness, wallHeight, room.depth]} />
        <meshStandardMaterial color="#e9dece" />
      </mesh>
      <mesh
        position={[room.width / 2, wallHeight / 2, room.depth]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[room.width, wallHeight, wallThickness]} />
        <meshStandardMaterial color="#f0e6d7" />
      </mesh>
      <mesh
        position={[0, wallHeight / 2, room.depth / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[wallThickness, wallHeight, room.depth]} />
        <meshStandardMaterial color="#e9dece" />
      </mesh>

      {room.openings.map((opening) => {
        if (opening.wallId === "wall_1") {
          return (
            <mesh
              key={opening.id}
              position={[opening.position, 1.1, 0.06]}
            >
              <boxGeometry args={[opening.width, opening.type === "radiator" ? 0.45 : 1.4, 0.08]} />
              <meshStandardMaterial color={openingColorMap[opening.type]} />
            </mesh>
          );
        }

        if (opening.wallId === "wall_2") {
          return (
            <mesh
              key={opening.id}
              position={[room.width - 0.06, 1.1, opening.position]}
            >
              <boxGeometry args={[0.08, opening.type === "radiator" ? 0.45 : 1.4, opening.width]} />
              <meshStandardMaterial color={openingColorMap[opening.type]} />
            </mesh>
          );
        }

        if (opening.wallId === "wall_3") {
          return (
            <mesh
              key={opening.id}
              position={[opening.position, 1.1, room.depth - 0.06]}
            >
              <boxGeometry args={[opening.width, opening.type === "radiator" ? 0.45 : 1.4, 0.08]} />
              <meshStandardMaterial color={openingColorMap[opening.type]} />
            </mesh>
          );
        }

        return (
          <mesh key={opening.id} position={[0.06, 1.1, opening.position]}>
            <boxGeometry args={[0.08, opening.type === "radiator" ? 0.45 : 1.4, opening.width]} />
            <meshStandardMaterial color={openingColorMap[opening.type]} />
          </mesh>
        );
      })}
    </group>
  );
}
