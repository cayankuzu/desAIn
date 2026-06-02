import type { RoomObject } from "@/types/room";
import { getObjectDetailProfile } from "@/lib/room/detailProfile";

interface SofaGeneratorProps {
  object: RoomObject;
  selected: boolean;
}

export function SofaGenerator({ object, selected }: SofaGeneratorProps) {
  const { width, depth, height } = object.dimensions;
  const detail = getObjectDetailProfile(object);
  const isLShape = object.params.shape === "l";
  const cushionCount = Math.max(1, Math.min(5, Number(object.params.cushionCount ?? 3)));
  const seatHeight = height * 0.42;
  const backHeight = height * 0.48;
  const armWidth = width * 0.11;
  const highlight = selected ? "#f1b07a" : detail.fabricColor;
  const accent = selected ? "#ffd5b6" : detail.trimColor;
  const footWidth = Math.max(0.06, width * 0.05);
  const footDepth = Math.max(0.06, depth * 0.06);
  const footHeight = Math.max(0.05, height * 0.08);
  const pillowWidth = Math.max(width * 0.16, 0.22);
  const pillowHeight = Math.max(height * 0.16, 0.16);
  const pillowDepth = Math.max(depth * 0.16, 0.14);

  if (isLShape) {
    return (
      <group>
        <mesh position={[0, footHeight / 2, -depth * 0.18]} castShadow receiveShadow>
          <boxGeometry args={[width * 0.92, footHeight, depth * 0.5]} />
          <meshStandardMaterial color="#4d4035" />
        </mesh>
        <mesh position={[0, seatHeight / 2, -depth * 0.18]} castShadow receiveShadow>
          <boxGeometry args={[width, seatHeight, depth * 0.58]} />
          <meshStandardMaterial color={object.color} />
        </mesh>
        <mesh position={[-width * 0.28, footHeight / 2, depth * 0.18]} castShadow receiveShadow>
          <boxGeometry args={[width * 0.36, footHeight, depth * 0.72]} />
          <meshStandardMaterial color="#4d4035" />
        </mesh>
        <mesh
          position={[-width * 0.28, seatHeight / 2, depth * 0.18]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[width * 0.44, seatHeight, depth * 0.82]} />
          <meshStandardMaterial color={object.color} />
        </mesh>
        <mesh
          position={[0, seatHeight + backHeight / 2 - 0.04, -depth / 2 + 0.08]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[width, backHeight, depth * 0.14]} />
          <meshStandardMaterial color={highlight} />
        </mesh>
        <mesh
          position={[-width * 0.27, seatHeight + backHeight * 0.3, depth * 0.18]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[width * 0.38, backHeight * 0.54, depth * 0.12]} />
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
        {[
          [-width * 0.18, seatHeight + pillowHeight * 0.55, -depth * 0.1],
          [width * 0.16, seatHeight + pillowHeight * 0.55, -depth * 0.1],
        ].map((position, index) => (
          <mesh
            key={index}
            position={position as [number, number, number]}
            rotation={[0, index === 0 ? -0.2 : 0.18, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[pillowWidth, pillowHeight, pillowDepth]} />
            <meshStandardMaterial color={index === 0 ? accent : detail.accentColor} />
          </mesh>
        ))}
        {[-0.24, 0.08, 0.36].map((offset, index) => (
          <mesh
            key={offset}
            position={[width * offset, seatHeight + 0.025, -depth * 0.17]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[width * 0.18, seatHeight * 0.16, depth * 0.34]} />
            <meshStandardMaterial
              color={index % 2 === 0 ? detail.trimColor : detail.accentColor}
            />
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <group>
      {[
        [-width * 0.38, footHeight / 2, -depth * 0.34],
        [width * 0.38, footHeight / 2, -depth * 0.34],
        [-width * 0.38, footHeight / 2, depth * 0.34],
        [width * 0.38, footHeight / 2, depth * 0.34],
      ].map((position, index) => (
        <mesh key={index} position={position as [number, number, number]} castShadow receiveShadow>
          <boxGeometry args={[footWidth, footHeight, footDepth]} />
          <meshStandardMaterial color="#4d4035" />
        </mesh>
      ))}
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
      {[...Array(cushionCount)].map((_, index) => {
        const offset =
          cushionCount === 1
            ? 0
            : -0.34 + (index * 0.68) / Math.max(1, cushionCount - 1);

        return (
        <mesh
          key={index}
          position={[
            width * offset,
            seatHeight + 0.02,
            0,
          ]}
          castShadow
          receiveShadow
        >
          <boxGeometry
            args={[
              Math.min(width * 0.22, width / (cushionCount + 0.6)),
              seatHeight * 0.24,
              depth * 0.78,
            ]}
          />
          <meshStandardMaterial color={highlight} />
        </mesh>
        );
      })}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * width * 0.22, seatHeight + pillowHeight * 0.56, -depth * 0.08]}
          rotation={[0, side * 0.2, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[pillowWidth, pillowHeight, pillowDepth]} />
          <meshStandardMaterial color={side < 0 ? accent : detail.accentColor} />
        </mesh>
      ))}
      {[...Array(Math.max(2, Math.min(4, cushionCount + 1)))].map((_, index) => (
        <mesh
          key={`seam-${index}`}
          position={[-width * 0.38 + index * width * 0.25, seatHeight + 0.055, depth * 0.41]}
          castShadow
        >
          <boxGeometry args={[width * 0.012, seatHeight * 0.08, depth * 0.12]} />
          <meshStandardMaterial color={detail.darkTrimColor} />
        </mesh>
      ))}
    </group>
  );
}
