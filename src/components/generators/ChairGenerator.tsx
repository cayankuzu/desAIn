import type { RoomObject } from "@/types/room";

interface ChairGeneratorProps {
  object: RoomObject;
  selected: boolean;
}

export function ChairGenerator({ object, selected }: ChairGeneratorProps) {
  const { width, depth, height } = object.dimensions;
  const seatHeight = height * 0.48;
  const legSize = width * 0.12;
  const backHeight = height * 0.42;

  return (
    <group>
      <mesh position={[0, seatHeight, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height * 0.09, depth]} />
        <meshStandardMaterial color={selected ? "#9dc2ca" : object.color} />
      </mesh>
      {[
        [-width / 2 + legSize, seatHeight / 2, -depth / 2 + legSize],
        [width / 2 - legSize, seatHeight / 2, -depth / 2 + legSize],
        [-width / 2 + legSize, seatHeight / 2, depth / 2 - legSize],
        [width / 2 - legSize, seatHeight / 2, depth / 2 - legSize],
      ].map((position, index) => (
        <mesh key={index} position={position as [number, number, number]} castShadow receiveShadow>
          <boxGeometry args={[legSize, seatHeight, legSize]} />
          <meshStandardMaterial color="#3f5158" />
        </mesh>
      ))}
      <mesh
        position={[0, seatHeight + backHeight / 2, -depth / 2 + legSize / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width, backHeight, legSize]} />
        <meshStandardMaterial color={selected ? "#9dc2ca" : object.color} />
      </mesh>
    </group>
  );
}
