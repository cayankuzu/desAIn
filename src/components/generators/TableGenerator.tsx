import type { RoomObject } from "@/types/room";
import { getObjectDetailProfile } from "@/lib/room/detailProfile";

interface TableGeneratorProps {
  object: RoomObject;
  selected: boolean;
}

export function TableGenerator({ object, selected }: TableGeneratorProps) {
  const { width, depth, height } = object.dimensions;
  const detail = getObjectDetailProfile(object);
  const labelKey = object.labelKey.toLowerCase();
  const isIsland = labelKey.includes("island");
  const isConsole = labelKey.includes("console") || labelKey.includes("tray");
  const isVanity = labelKey.includes("vanity");
  const topHeight = height * 0.1;
  const legSize = Math.min(width, depth) * 0.1;
  const legHeight = height - topHeight;
  const highlightColor = selected ? "#d6865b" : object.color;
  const isDiningTable = width >= 1.2 && depth >= 0.72;
  const isDeskLike = !isDiningTable && depth <= 0.75;

  return (
    <group>
      <mesh position={[0, height - topHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, topHeight, depth]} />
        <meshStandardMaterial color={highlightColor} />
      </mesh>
      <mesh position={[0, height + topHeight * 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[width * 0.9, topHeight * 0.16, depth * 0.86]} />
        <meshStandardMaterial color={detail.trimColor} />
      </mesh>
      {[
        [-width / 2 + legSize / 1.6, legHeight / 2, -depth / 2 + legSize / 1.6],
        [width / 2 - legSize / 1.6, legHeight / 2, -depth / 2 + legSize / 1.6],
        [-width / 2 + legSize / 1.6, legHeight / 2, depth / 2 - legSize / 1.6],
        [width / 2 - legSize / 1.6, legHeight / 2, depth / 2 - legSize / 1.6],
      ].map((position, index) => (
        <mesh key={index} position={position as [number, number, number]} castShadow receiveShadow>
          <boxGeometry args={[legSize, legHeight, legSize]} />
          <meshStandardMaterial color={detail.darkTrimColor} />
        </mesh>
      ))}

      {isDiningTable
        ? [-0.32, 0.32].flatMap((xOffset) =>
            [-0.22, 0.22].map((zOffset, index) => (
              <group
                key={`${xOffset}-${zOffset}`}
                position={[width * xOffset, height + topHeight * 0.58, depth * zOffset]}
              >
                <mesh castShadow receiveShadow>
                  <cylinderGeometry args={[0.1, 0.1, 0.02, 20]} />
                  <meshStandardMaterial color="#f1ede7" />
                </mesh>
                <mesh position={[0, 0.018, 0]} castShadow receiveShadow>
                  <cylinderGeometry args={[0.032, 0.032, 0.06, 14]} />
                  <meshStandardMaterial color={index % 2 === 0 ? detail.glassColor : detail.accentColor} />
                </mesh>
              </group>
            )),
          )
        : null}

      {isIsland ? (
        <>
          <mesh position={[0, height * 0.45, -depth * 0.36]} castShadow receiveShadow>
            <boxGeometry args={[width * 0.82, height * 0.48, depth * 0.08]} />
            <meshStandardMaterial color={detail.darkTrimColor} />
          </mesh>
          {[-0.28, 0, 0.28].map((offset) => (
            <mesh
              key={offset}
              position={[width * offset, height * 0.54, -depth * 0.41]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[width * 0.16, height * 0.055, depth * 0.035]} />
              <meshStandardMaterial color={detail.metalColor} metalness={0.32} roughness={0.35} />
            </mesh>
          ))}
        </>
      ) : null}

      {isDeskLike ? (
        <>
          <mesh
            position={[-width * 0.16, height + topHeight * 0.56, -depth * 0.06]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[width * 0.24, 0.03, depth * 0.32]} />
            <meshStandardMaterial color="#303845" />
          </mesh>
          <mesh
            position={[width * 0.06, height + topHeight * 0.52, depth * 0.04]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[width * 0.16, 0.045, depth * 0.2]} />
            <meshStandardMaterial color="#c8b79b" />
          </mesh>
          {[0, 1, 2].map((index) => (
            <mesh
              key={index}
              position={[width * 0.22, height + 0.055 + index * 0.015, -depth * 0.18]}
              castShadow
              receiveShadow
            >
              <cylinderGeometry args={[0.012, 0.012, 0.11, 10]} />
              <meshStandardMaterial color={index === 0 ? "#d97c63" : index === 1 ? "#5a8fd6" : "#d8c05f"} />
            </mesh>
          ))}
          {isConsole || isVanity ? (
            <mesh position={[0, height * 0.66, depth / 2 + 0.018]} castShadow receiveShadow>
              <boxGeometry args={[width * 0.58, height * 0.12, 0.035]} />
              <meshStandardMaterial color={isVanity ? detail.glassColor : detail.accentColor} />
            </mesh>
          ) : null}
        </>
      ) : null}
    </group>
  );
}
