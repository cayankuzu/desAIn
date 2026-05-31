import type { RoomObject } from "@/types/room";

interface TVUnitGeneratorProps {
  object: RoomObject;
  selected: boolean;
}

export function TVUnitGenerator({ object, selected }: TVUnitGeneratorProps) {
  const { width, depth, height } = object.dimensions;
  const cabinetHeight = Math.min(0.55, height * 0.44);
  const screenHeight = height - cabinetHeight;

  return (
    <group>
      <mesh position={[0, cabinetHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, cabinetHeight, depth]} />
        <meshStandardMaterial color={object.color} />
      </mesh>
      <mesh
        position={[0, cabinetHeight + screenHeight / 2 + 0.08, depth / 2 + 0.035]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width * 0.88, screenHeight * 0.82, 0.08]} />
        <meshStandardMaterial color={selected ? "#4e6671" : "#1f2830"} />
      </mesh>
      <mesh
        position={[0, cabinetHeight + 0.05, depth / 2 + 0.04]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width * 0.18, 0.1, 0.12]} />
        <meshStandardMaterial color="#282f35" />
      </mesh>
    </group>
  );
}
