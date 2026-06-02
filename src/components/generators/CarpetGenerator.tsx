import type { RoomObject } from "@/types/room";
import { getObjectDetailProfile } from "@/lib/room/detailProfile";

interface CarpetGeneratorProps {
  object: RoomObject;
  selected: boolean;
}

export function CarpetGenerator({ object, selected }: CarpetGeneratorProps) {
  const { width, depth, height } = object.dimensions;
  const detail = getObjectDetailProfile(object);
  const stripeCount = Math.max(2, Math.min(6, detail.lineCount));
  const stripeWidth = width / (stripeCount * 2.7);

  return (
    <group>
      <mesh position={[0, height / 2, 0]} receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={object.color} />
      </mesh>
      <mesh position={[0, height + 0.004, 0]} receiveShadow>
        <boxGeometry args={[width * 0.92, 0.008, depth * 0.92]} />
        <meshStandardMaterial color={selected ? "#f7e1cb" : detail.fabricColor} />
      </mesh>
      {[...Array(stripeCount)].map((_, index) => (
        <mesh
          key={index}
          position={[
            -width * 0.36 + index * (width * 0.72) / Math.max(1, stripeCount - 1),
            height + 0.011,
            0,
          ]}
          receiveShadow
        >
          <boxGeometry args={[stripeWidth, 0.006, depth * 0.82]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? detail.accentColor : detail.trimColor}
          />
        </mesh>
      ))}
      <mesh position={[0, height + 0.014, 0]} receiveShadow>
        <boxGeometry args={[width * 0.72, 0.006, depth * 0.52]} />
        <meshStandardMaterial color={detail.trimColor} transparent opacity={0.42} />
      </mesh>
    </group>
  );
}
