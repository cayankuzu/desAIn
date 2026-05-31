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

  if (baseShape === "round_table") {
    return (
      <group>
        <mesh position={[0, height - 0.05, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[width / 2, width / 2, 0.1, 32]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[width * 0.08, width * 0.08, height, 16]} />
          <meshStandardMaterial color="#6f4f37" />
        </mesh>
        <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[width * 0.24, width * 0.32, 0.08, 24]} />
          <meshStandardMaterial color="#6f4f37" />
        </mesh>
      </group>
    );
  }

  if (baseShape === "plant") {
    return (
      <group>
        <mesh position={[0, height * 0.16, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[width * 0.28, width * 0.36, height * 0.32, 18]} />
          <meshStandardMaterial color="#8b6044" />
        </mesh>
        {[0, 1, 2].map((index) => (
          <mesh
            key={index}
            position={[
              (index - 1) * width * 0.12,
              height * (0.48 + index * 0.12),
              index % 2 === 0 ? -depth * 0.06 : depth * 0.08,
            ]}
            castShadow
            receiveShadow
          >
            <sphereGeometry args={[width * (0.26 - index * 0.03), 16, 12]} />
            <meshStandardMaterial color={index === 1 ? "#6f9a63" : primaryColor} />
          </mesh>
        ))}
      </group>
    );
  }

  if (baseShape === "bean_bag") {
    return (
      <group>
        <mesh
          position={[0, height * 0.45, 0]}
          scale={[width * 0.5, height * 0.58, depth * 0.5]}
          castShadow
          receiveShadow
        >
          <sphereGeometry args={[1, 24, 16]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[0, height * 0.18, depth * 0.08]} castShadow receiveShadow>
          <boxGeometry args={[width * 0.68, height * 0.08, depth * 0.46]} />
          <meshStandardMaterial color="#5c6473" />
        </mesh>
      </group>
    );
  }

  if (baseShape === "kitchen_sink") {
    return (
      <group>
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[0, height + 0.015, 0]} castShadow receiveShadow>
          <boxGeometry args={[width * 0.52, 0.03, depth * 0.48]} />
          <meshStandardMaterial color="#cfd6dc" />
        </mesh>
        <mesh position={[width * 0.18, height + 0.14, -depth * 0.08]} castShadow>
          <torusGeometry args={[0.08, 0.012, 8, 18, Math.PI]} />
          <meshStandardMaterial color="#d8c59d" />
        </mesh>
      </group>
    );
  }

  if (baseShape === "cooktop") {
    return (
      <group>
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        {[
          [-0.22, -0.16],
          [0.22, -0.16],
          [-0.22, 0.16],
          [0.22, 0.16],
        ].map(([x, z]) => (
          <mesh key={`${x}-${z}`} position={[x * width, height + 0.01, z * depth]}>
            <torusGeometry args={[Math.min(width, depth) * 0.1, 0.008, 8, 18]} />
            <meshStandardMaterial color="#cfd6dc" />
          </mesh>
        ))}
      </group>
    );
  }

  if (baseShape === "appliance_box" || baseShape === "washer") {
    return (
      <group>
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[0, height * 0.52, depth / 2 + 0.012]} castShadow>
          {baseShape === "washer" ? (
            <cylinderGeometry args={[width * 0.24, width * 0.24, 0.025, 28]} />
          ) : (
            <boxGeometry args={[width * 0.72, height * 0.62, 0.025]} />
          )}
          <meshStandardMaterial color={baseShape === "washer" ? "#9db1c0" : "#202830"} />
        </mesh>
      </group>
    );
  }

  if (baseShape === "bathtub") {
    return (
      <group>
        <mesh position={[0, height * 0.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, height * 0.6, depth]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[0, height * 0.64, 0]} castShadow>
          <boxGeometry args={[width * 0.78, height * 0.12, depth * 0.62]} />
          <meshStandardMaterial color="#f4f7f8" />
        </mesh>
      </group>
    );
  }

  if (baseShape === "toilet") {
    return (
      <group>
        <mesh position={[0, height * 0.22, depth * 0.08]} castShadow receiveShadow>
          <cylinderGeometry args={[width * 0.32, width * 0.25, height * 0.32, 24]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[0, height * 0.55, -depth * 0.24]} castShadow receiveShadow>
          <boxGeometry args={[width * 0.76, height * 0.42, depth * 0.18]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
      </group>
    );
  }

  if (baseShape === "shower") {
    return (
      <group>
        <mesh position={[0, height / 2, -depth / 2 + 0.03]} castShadow receiveShadow>
          <boxGeometry args={[width, height, 0.06]} />
          <meshStandardMaterial color={primaryColor} transparent opacity={0.42} />
        </mesh>
        <mesh position={[-width / 2 + 0.03, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.06, height, depth]} />
          <meshStandardMaterial color={primaryColor} transparent opacity={0.36} />
        </mesh>
        <mesh position={[0, 0.04, 0]} receiveShadow>
          <boxGeometry args={[width, 0.08, depth]} />
          <meshStandardMaterial color="#dce8ee" />
        </mesh>
        <mesh position={[width * 0.24, height * 0.72, -depth / 2 + 0.08]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.04, 18]} />
          <meshStandardMaterial color="#d8c59d" />
        </mesh>
      </group>
    );
  }

  if (baseShape === "wall_clock") {
    return (
      <group>
        <mesh position={[0, height / 2, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[width / 2, width / 2, Math.max(depth, 0.04), 32]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[0, height / 2, Math.max(depth, 0.04) / 2 + 0.01]} castShadow>
          <boxGeometry args={[width * 0.04, height * 0.34, 0.012]} />
          <meshStandardMaterial color="#25303b" />
        </mesh>
      </group>
    );
  }

  if (baseShape === "radiator") {
    return (
      <group>
        {[-0.36, -0.18, 0, 0.18, 0.36].map((offset) => (
          <mesh
            key={offset}
            position={[offset * width, height / 2, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[width * 0.12, height, Math.max(depth, 0.1)]} />
            <meshStandardMaterial color={primaryColor} />
          </mesh>
        ))}
        <mesh position={[0, height * 0.12, Math.max(depth, 0.1) / 2]} castShadow>
          <boxGeometry args={[width, height * 0.08, 0.035]} />
          <meshStandardMaterial color="#e4b174" />
        </mesh>
      </group>
    );
  }

  if (baseShape === "window_panel") {
    return (
      <group>
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, height, Math.max(depth, 0.06)]} />
          <meshStandardMaterial color={primaryColor} transparent opacity={0.55} />
        </mesh>
        <mesh position={[0, height / 2, Math.max(depth, 0.06) / 2 + 0.012]} castShadow>
          <boxGeometry args={[width * 0.05, height, 0.024]} />
          <meshStandardMaterial color="#e8f1f6" />
        </mesh>
        <mesh position={[0, height / 2, Math.max(depth, 0.06) / 2 + 0.014]} castShadow>
          <boxGeometry args={[width, height * 0.045, 0.024]} />
          <meshStandardMaterial color="#e8f1f6" />
        </mesh>
      </group>
    );
  }

  if (baseShape === "ceiling_light") {
    return (
      <group>
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[width * 0.48, width * 0.36, height, 28]} />
          <meshStandardMaterial color={primaryColor} emissive="#f1d8a7" emissiveIntensity={0.32} />
        </mesh>
        <pointLight position={[0, -0.08, 0]} intensity={0.45} color="#ffdca8" distance={4} />
      </group>
    );
  }

  if (baseShape === "wall_sconce") {
    return (
      <group>
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, height, Math.max(depth, 0.12)]} />
          <meshStandardMaterial color="#6f5b47" />
        </mesh>
        <mesh position={[0, height * 0.6, Math.max(depth, 0.12) / 2 + 0.04]} castShadow>
          <sphereGeometry args={[Math.min(width, height) * 0.28, 18, 12]} />
          <meshStandardMaterial color={primaryColor} emissive="#f1d8a7" emissiveIntensity={0.26} />
        </mesh>
      </group>
    );
  }

  if (baseShape === "low_shelf") {
    return (
      <group>
        {[0.22, 0.5, 0.78].map((ratio) => (
          <mesh key={ratio} position={[0, height * ratio, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, height * 0.06, depth]} />
            <meshStandardMaterial color={primaryColor} />
          </mesh>
        ))}
        {[-0.45, 0, 0.45].map((offset) => (
          <mesh key={offset} position={[offset * width, height / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[width * 0.05, height, depth]} />
            <meshStandardMaterial color="#6d5140" />
          </mesh>
        ))}
      </group>
    );
  }

  if (baseShape === "coat_stand") {
    return (
      <group>
        <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[width * 0.38, width * 0.46, 0.08, 20]} />
          <meshStandardMaterial color="#655448" />
        </mesh>
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[width * 0.055, width * 0.055, height, 16]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        {[0, 1, 2, 3].map((index) => (
          <mesh
            key={index}
            position={[
              Math.cos((index * Math.PI) / 2) * width * 0.24,
              height * 0.82,
              Math.sin((index * Math.PI) / 2) * depth * 0.24,
            ]}
            rotation={[0, (index * Math.PI) / 2, 0.45]}
            castShadow
          >
            <boxGeometry args={[width * 0.42, height * 0.035, depth * 0.055]} />
            <meshStandardMaterial color="#d1b48a" />
          </mesh>
        ))}
      </group>
    );
  }

  if (baseShape === "room_divider") {
    return (
      <group>
        {[-0.32, 0, 0.32].map((offset, index) => (
          <mesh
            key={offset}
            position={[offset * width, height / 2, index === 1 ? 0 : depth * 0.1]}
            rotation={[0, index === 1 ? 0 : offset > 0 ? -0.18 : 0.18, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[width * 0.31, height, Math.max(depth, 0.08)]} />
            <meshStandardMaterial color={index === 1 ? primaryColor : "#c8b08e"} />
          </mesh>
        ))}
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

  if (baseShape === "ladder_stairs") {
    return (
      <group>
        {[-0.24, 0.24].map((offset) => (
          <mesh
            key={offset}
            position={[offset * width, height / 2, 0]}
            rotation={[0.28, 0, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[width * 0.08, height, depth * 0.04]} />
            <meshStandardMaterial color={primaryColor} />
          </mesh>
        ))}
        {[0, 1, 2, 3, 4].map((step) => (
          <mesh
            key={step}
            position={[0, height * (0.15 + step * 0.16), -depth * 0.32 + step * depth * 0.16]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[width * 0.68, height * 0.035, depth * 0.08]} />
            <meshStandardMaterial color="#d2c0aa" />
          </mesh>
        ))}
      </group>
    );
  }

  if (baseShape === "wall_panel") {
    return (
      <group>
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, height, Math.max(depth, 0.06)]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[0, height / 2, Math.max(depth, 0.06) / 2 + 0.01]} castShadow>
          <boxGeometry args={[width * 0.78, height * 0.68, 0.02]} />
          <meshStandardMaterial color="#dfe6ef" />
        </mesh>
      </group>
    );
  }

  if (baseShape === "floor_mirror") {
    return (
      <group>
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, height, Math.max(depth, 0.08)]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[0, height / 2, Math.max(depth, 0.08) / 2 + 0.01]} castShadow>
          <boxGeometry args={[width * 0.76, height * 0.78, 0.02]} />
          <meshStandardMaterial color="#dcecf4" metalness={0.25} roughness={0.18} />
        </mesh>
        <mesh position={[0, 0.04, -depth * 0.36]} castShadow receiveShadow>
          <boxGeometry args={[width * 0.72, 0.08, Math.max(depth * 0.85, 0.12)]} />
          <meshStandardMaterial color="#6f5f50" />
        </mesh>
      </group>
    );
  }

  if (baseShape === "wall_box") {
    return (
      <group>
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, height, Math.max(depth, 0.14)]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        {[-0.18, 0, 0.18].map((offset) => (
          <mesh
            key={offset}
            position={[offset * width, height / 2, Math.max(depth, 0.14) / 2 + 0.01]}
            castShadow
          >
            <boxGeometry args={[width * 0.18, height * 0.12, 0.02]} />
            <meshStandardMaterial color="#9aa5b1" />
          </mesh>
        ))}
      </group>
    );
  }

  if (baseShape === "door_panel") {
    return (
      <group>
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, height, Math.max(depth, 0.08)]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh
          position={[width * 0.32, height * 0.52, Math.max(depth, 0.08) / 2 + 0.01]}
          castShadow
        >
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshStandardMaterial color="#e7c17f" />
        </mesh>
      </group>
    );
  }

  if (baseShape === "monitor") {
    return (
      <group>
        <mesh position={[0, height * 0.62, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, height * 0.62, Math.max(depth * 0.28, 0.04)]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[0, height * 0.62, Math.max(depth * 0.16, 0.03)]} castShadow>
          <boxGeometry args={[width * 0.86, height * 0.48, 0.018]} />
          <meshStandardMaterial color="#1f87b7" emissive="#1a5e85" emissiveIntensity={0.12} />
        </mesh>
        <mesh position={[0, height * 0.22, 0]} castShadow receiveShadow>
          <boxGeometry args={[width * 0.12, height * 0.32, depth * 0.14]} />
          <meshStandardMaterial color="#303840" />
        </mesh>
        <mesh position={[0, height * 0.05, 0]} castShadow receiveShadow>
          <boxGeometry args={[width * 0.42, height * 0.1, depth * 0.55]} />
          <meshStandardMaterial color="#303840" />
        </mesh>
      </group>
    );
  }

  if (baseShape === "guitar") {
    return (
      <group>
        <mesh position={[0, height * 0.3, 0]} castShadow receiveShadow>
          <sphereGeometry args={[width * 0.3, 18, 14]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[0, height * 0.66, 0]} castShadow receiveShadow>
          <boxGeometry args={[width * 0.12, height * 0.58, depth * 0.12]} />
          <meshStandardMaterial color="#6c4d36" />
        </mesh>
        <mesh position={[0, height * 0.08, depth * 0.1]} castShadow receiveShadow>
          <boxGeometry args={[width * 0.65, height * 0.08, depth * 0.18]} />
          <meshStandardMaterial color="#4f4037" />
        </mesh>
      </group>
    );
  }

  if (baseShape === "piano") {
    return (
      <group>
        <mesh position={[0, height * 0.42, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, height * 0.84, depth]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[0, height * 0.5, depth / 2 + 0.014]} castShadow>
          <boxGeometry args={[width * 0.72, height * 0.12, 0.025]} />
          <meshStandardMaterial color="#f4f0e6" />
        </mesh>
        {[...Array(8)].map((_, index) => (
          <mesh
            key={index}
            position={[-width * 0.3 + index * width * 0.085, height * 0.52, depth / 2 + 0.03]}
            castShadow
          >
            <boxGeometry args={[width * 0.035, height * 0.1, 0.025]} />
            <meshStandardMaterial color="#1f2429" />
          </mesh>
        ))}
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
