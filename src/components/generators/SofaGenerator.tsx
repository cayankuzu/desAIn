import type { RoomObject } from "@/types/room";

interface SofaGeneratorProps {
  object: RoomObject;
  selected: boolean;
}

export function SofaGenerator({ object, selected }: SofaGeneratorProps) {
  const { width, depth, height } = object.dimensions;
  const seatHeight = height * 0.42;
  const backHeight = height * 0.48;
  const armWidth = width * 0.11;
  const highlight = selected ? "#f1b07a" : "#f3e5d0";

  return (
    <group>
      <mesh position={[0, seatHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, seatHeight, depth]} />
        <meshStandardMaterial color={object.color} />
      </mesh>
      <mesh
        position={[0, seatHeight + backHeight / 2 - 0.04, -depth / 2 + 0.08]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width, backHeight, depth * 0.18]} />
        <meshStandardMaterial color={highlight} />
      </mesh>
      <mesh
        position={[-width / 2 + armWidth / 2, seatHeight + armWidth / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[armWidth, height * 0.55, depth]} />
        <meshStandardMaterial color={object.color} />
      </mesh>
      <mesh
        position={[width / 2 - armWidth / 2, seatHeight + armWidth / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[armWidth, height * 0.55, depth]} />
        <meshStandardMaterial color={object.color} />
      </mesh>
      {[...Array(3)].map((_, index) => (
        <mesh
          key={index}
          position={[
            -width * 0.26 + index * width * 0.26,
            seatHeight + 0.02,
            0,
          ]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[width * 0.22, seatHeight * 0.24, depth * 0.78]} />
          <meshStandardMaterial color={highlight} />
        </mesh>
      ))}
    </group>
  );
}
