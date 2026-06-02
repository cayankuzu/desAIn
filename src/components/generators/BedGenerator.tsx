import type { RoomObject } from "@/types/room";
import { getObjectDetailProfile } from "@/lib/room/detailProfile";

interface BedGeneratorProps {
  object: RoomObject;
  selected: boolean;
}

export function BedGenerator({ object, selected }: BedGeneratorProps) {
  const { width, depth, height } = object.dimensions;
  const frameHeight = height * 0.32;
  const mattressHeight = height * 0.22;
  const detail = getObjectDetailProfile(object);
  const pillowCount = Math.max(1, Math.min(4, Number(object.params.pillows ?? 2)));
  const pillowWidth = Math.min(width * 0.28, width / (pillowCount + 0.6));

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
        <meshStandardMaterial color={selected ? "#f7e0c5" : detail.fabricColor} />
      </mesh>
      <mesh
        position={[0, frameHeight + mattressHeight + 0.012, depth * 0.12]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width * 0.88, height * 0.035, depth * 0.46]} />
        <meshStandardMaterial color={detail.accentColor} />
      </mesh>
      <mesh
        position={[0, frameHeight + mattressHeight + 0.018, -depth * 0.12]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width * 0.82, height * 0.028, depth * 0.2]} />
        <meshStandardMaterial color={detail.trimColor} />
      </mesh>
      <mesh
        position={[0, frameHeight + mattressHeight + height * 0.18, -depth / 2 + 0.05]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width, height * 0.36, depth * 0.08]} />
        <meshStandardMaterial color={object.color} />
      </mesh>
      {[...Array(pillowCount)].map((_, index) => {
        const offset =
          pillowCount === 1
            ? 0
            : -0.32 + (index * 0.64) / Math.max(1, pillowCount - 1);

        return (
        <mesh
          key={index}
          position={[width * offset, frameHeight + mattressHeight + 0.04, depth * 0.24]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[pillowWidth, mattressHeight * 0.62, depth * 0.16]} />
          <meshStandardMaterial color={index % 2 === 0 ? "#fff8f0" : detail.trimColor} />
        </mesh>
        );
      })}
    </group>
  );
}
