import type { RoomObject } from "@/types/room";

interface GenericObjectGeneratorProps {
  object: RoomObject;
  selected: boolean;
}

export function GenericObjectGenerator({
  object,
  selected,
}: GenericObjectGeneratorProps) {
  const { width, depth, height } = object.dimensions;

  return (
    <group>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={selected ? "#b6998a" : object.color} />
      </mesh>
      <mesh position={[0, height + 0.01, 0]} receiveShadow>
        <boxGeometry args={[width * 0.72, 0.02, depth * 0.18]} />
        <meshStandardMaterial color="#efe3d7" />
      </mesh>
    </group>
  );
}
