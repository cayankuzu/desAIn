import type { RoomObject } from "@/types/room";

interface GenericObjectGeneratorProps {
  object: RoomObject;
  selected: boolean;
}

export function GenericObjectGenerator({
  object,
  selected,
}: GenericObjectGeneratorProps) {
  const { width, depth, height } = object.dimensions;
  const baseShape = String(object.params.baseShape ?? "box");
  const primaryColor = selected ? "#b6998a" : object.color;

  if (baseShape === "cylinder") {
    return (
      <group>
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[width / 2, width / 2, height, 24]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[0, height + 0.01, 0]} receiveShadow>
          <cylinderGeometry args={[width * 0.28, width * 0.28, 0.02, 20]} />
          <meshStandardMaterial color="#efe3d7" />
        </mesh>
      </group>
    );
  }

  if (baseShape === "lamp") {
    return (
      <group>
        <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[width * 0.42, width * 0.48, 0.08, 18]} />
          <meshStandardMaterial color="#5f574f" />
        </mesh>
        <mesh position={[0, height * 0.46, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[width * 0.08, width * 0.08, height * 0.9, 14]} />
          <meshStandardMaterial color="#c7af86" />
        </mesh>
        <mesh position={[0, height * 0.86, 0]} castShadow receiveShadow>
          <coneGeometry args={[width * 0.46, height * 0.28, 18]} />
          <meshStandardMaterial color={selected ? "#f5dfbe" : "#ecd1a3"} />
        </mesh>
      </group>
    );
  }

  if (baseShape === "stairs" || baseShape === "spiral_stairs") {
    const stepCount = 6;

    return (
      <group>
        {[...Array(stepCount)].map((_, index) => {
          const ratio = (index + 1) / stepCount;
          const stepHeight = height / stepCount;
          const stepDepth = depth / stepCount;

          return (
            <mesh
              key={index}
              position={[
                baseShape === "spiral_stairs"
                  ? Math.cos(index * 0.8) * width * 0.18
                  : 0,
                stepHeight * index + stepHeight / 2,
                baseShape === "spiral_stairs"
                  ? Math.sin(index * 0.8) * depth * 0.18
                  : -depth / 2 + stepDepth * (index + 0.5),
              ]}
              rotation={baseShape === "spiral_stairs" ? [0, index * 0.45, 0] : [0, 0, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry
                args={[
                  Math.max(width * (baseShape === "spiral_stairs" ? 0.55 : 1), width * 0.35),
                  stepHeight,
                  Math.max(stepDepth, depth * (baseShape === "spiral_stairs" ? 0.28 : ratio)),
                ]}
              />
              <meshStandardMaterial color={primaryColor} />
            </mesh>
          );
        })}
      </group>
    );
  }

  return (
    <group>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={primaryColor} />
      </mesh>
      <mesh position={[0, height + 0.01, 0]} receiveShadow>
        <boxGeometry args={[width * 0.72, 0.02, depth * 0.18]} />
        <meshStandardMaterial color="#efe3d7" />
      </mesh>
    </group>
  );
}
