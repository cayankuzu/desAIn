import type { RoomObject } from "@/types/room";

interface WardrobeGeneratorProps {
  object: RoomObject;
  selected: boolean;
}

export function WardrobeGenerator({ object, selected }: WardrobeGeneratorProps) {
  const { width, depth, height } = object.dimensions;
  const doorCount = Number(object.params.doorCount ?? 3);

  return (
    <group>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={object.color} />
      </mesh>
      {[...Array(doorCount)].map((_, index) => (
        <mesh
          key={index}
          position={[
            -width / 2 + width / doorCount / 2 + (index * width) / doorCount,
            height / 2,
            depth / 2 + 0.01,
          ]}
        >
          <boxGeometry args={[width / doorCount - 0.04, height - 0.08, 0.02]} />
          <meshStandardMaterial color={selected ? "#f4d1ad" : "#ead8c4"} />
        </mesh>
      ))}
    </group>
  );
}
