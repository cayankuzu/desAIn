import type { RoomObject } from "@/types/room";
import { getObjectDetailProfile } from "@/lib/room/detailProfile";

interface TVUnitGeneratorProps {
  object: RoomObject;
  selected: boolean;
}

export function TVUnitGenerator({ object, selected }: TVUnitGeneratorProps) {
  const { width, depth, height } = object.dimensions;
  const detail = getObjectDetailProfile(object);
  const cabinetHeight = Math.min(0.55, height * 0.44);
  const screenHeight = height - cabinetHeight;

  return (
    <group>
      <mesh position={[0, cabinetHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, cabinetHeight, depth]} />
        <meshStandardMaterial color={object.color} />
      </mesh>
      <mesh position={[0, cabinetHeight * 0.64, depth / 2 + 0.022]} castShadow>
        <boxGeometry args={[width * 0.84, cabinetHeight * 0.06, 0.025]} />
        <meshStandardMaterial color={detail.trimColor} />
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
        position={[0, cabinetHeight + screenHeight * 0.58 + 0.08, depth / 2 + 0.08]}
        castShadow
      >
        <boxGeometry args={[width * 0.5, screenHeight * 0.08, 0.018]} />
        <meshStandardMaterial color={detail.glassColor} transparent opacity={0.2} />
      </mesh>
      <mesh
        position={[0, cabinetHeight + 0.05, depth / 2 + 0.04]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width * 0.18, 0.1, 0.12]} />
        <meshStandardMaterial color="#282f35" />
      </mesh>
      <mesh
        position={[-width * 0.28, cabinetHeight + 0.14, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width * 0.12, 0.2, depth * 0.52]} />
        <meshStandardMaterial color="#c8b79b" />
      </mesh>
      <mesh
        position={[-width * 0.28, cabinetHeight + 0.27, 0]}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[Math.min(width, depth) * 0.08, 18, 14]} />
        <meshStandardMaterial color={detail.accentColor} />
      </mesh>
      {[0, 1, 2].map((index) => (
        <mesh
          key={index}
          position={[width * 0.22, cabinetHeight * 0.48, -depth * 0.06 + index * 0.06]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[width * 0.045, cabinetHeight * 0.56, 0.04]} />
          <meshStandardMaterial color={index === 1 ? detail.darkTrimColor : detail.accentColor} />
        </mesh>
      ))}
      {[-0.24, 0.24].map((offset) => (
        <mesh key={offset} position={[width * offset, cabinetHeight * 0.34, depth / 2 + 0.025]} castShadow>
          <boxGeometry args={[width * 0.22, cabinetHeight * 0.05, 0.024]} />
          <meshStandardMaterial color={detail.metalColor} metalness={0.35} roughness={0.32} />
        </mesh>
      ))}
    </group>
  );
}
