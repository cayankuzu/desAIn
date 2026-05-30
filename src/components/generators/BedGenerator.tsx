import type { RoomObject } from "@/types/room";

interface BedGeneratorProps {
  object: RoomObject;
  selected: boolean;
}

export function BedGenerator({ object, selected }: BedGeneratorProps) {
  const { width, depth, height } = object.dimensions;
  const frameHeight = height * 0.32;
  const mattressHeight = height * 0.22;

  return (
    <group>
      <mesh position={[0, frameHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, frameHeight, depth]} />
        <meshStandardMaterial color="#a07454" />
      </mesh>
      <mesh
        position={[0, frameHeight + mattressHeight / 2 - 0.02, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width * 0.95, mattressHeight, depth * 0.94]} />
        <meshStandardMaterial color={selected ? "#f7e0c5" : "#efe2d6"} />
      </mesh>
      <mesh
        position={[0, frameHeight + mattressHeight + height * 0.18, -depth / 2 + 0.05]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width, height * 0.36, depth * 0.08]} />
        <meshStandardMaterial color={object.color} />
      </mesh>
      {[-0.22, 0.22].map((offset) => (
        <mesh
          key={offset}
          position={[width * offset, frameHeight + mattressHeight + 0.04, depth * 0.22]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[width * 0.26, mattressHeight * 0.62, depth * 0.16]} />
          <meshStandardMaterial color="#fff8f0" />
        </mesh>
      ))}
    </group>
  );
}
