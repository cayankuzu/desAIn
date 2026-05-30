import type { RoomObject } from "@/types/room";

interface CarpetGeneratorProps {
  object: RoomObject;
  selected: boolean;
}

export function CarpetGenerator({ object, selected }: CarpetGeneratorProps) {
  const { width, depth, height } = object.dimensions;

  return (
    <group>
      <mesh position={[0, height / 2, 0]} receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={object.color} />
      </mesh>
      <mesh position={[0, height + 0.004, 0]} receiveShadow>
        <boxGeometry args={[width * 0.92, 0.008, depth * 0.92]} />
        <meshStandardMaterial color={selected ? "#f7e1cb" : "#f8efdf"} />
      </mesh>
    </group>
  );
}
