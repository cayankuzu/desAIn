import type { RoomObject } from "@/types/room";

interface TableGeneratorProps {
  object: RoomObject;
  selected: boolean;
}

export function TableGenerator({ object, selected }: TableGeneratorProps) {
  const { width, depth, height } = object.dimensions;
  const topHeight = height * 0.1;
  const legSize = Math.min(width, depth) * 0.1;
  const legHeight = height - topHeight;

  return (
    <group>
      <mesh position={[0, height - topHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, topHeight, depth]} />
        <meshStandardMaterial color={selected ? "#d6865b" : object.color} />
      </mesh>
      {[
        [-width / 2 + legSize / 1.6, legHeight / 2, -depth / 2 + legSize / 1.6],
        [width / 2 - legSize / 1.6, legHeight / 2, -depth / 2 + legSize / 1.6],
        [-width / 2 + legSize / 1.6, legHeight / 2, depth / 2 - legSize / 1.6],
        [width / 2 - legSize / 1.6, legHeight / 2, depth / 2 - legSize / 1.6],
      ].map((position, index) => (
        <mesh key={index} position={position as [number, number, number]} castShadow receiveShadow>
          <boxGeometry args={[legSize, legHeight, legSize]} />
          <meshStandardMaterial color="#6f4f37" />
        </mesh>
      ))}
    </group>
  );
}
