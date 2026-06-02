import { getObjectDetailProfile } from "@/lib/room/detailProfile";
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
  const detail = getObjectDetailProfile(object);
  const primaryColor = selected ? "#b6998a" : object.color;
  const labelKey = object.labelKey.toLowerCase();

  if (baseShape === "cylinder") {
    return (
      <group>
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[width / 2, width / 2, height, 24]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[0, height + 0.01, 0]} receiveShadow>
          <cylinderGeometry args={[width * 0.28, width * 0.28, 0.02, 20]} />
          <meshStandardMaterial color={detail.trimColor} />
        </mesh>
        <mesh position={[0, height * 0.56, width * 0.48]} castShadow>
          <boxGeometry args={[width * 0.06, height * 0.34, width * 0.018]} />
          <meshStandardMaterial color={detail.accentColor} />
        </mesh>
      </group>
    );
  }

  if (baseShape === "lamp") {
    return (
      <group>
        <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[width * 0.42, width * 0.48, 0.08, 18]} />
          <meshStandardMaterial color={detail.darkTrimColor} />
        </mesh>
        <mesh position={[0, height * 0.46, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[width * 0.08, width * 0.08, height * 0.9, 14]} />
          <meshStandardMaterial color={detail.metalColor} metalness={0.28} roughness={0.38} />
        </mesh>
        <mesh position={[0, height * 0.86, 0]} castShadow receiveShadow>
          <coneGeometry args={[width * 0.46, height * 0.28, 18]} />
          <meshStandardMaterial
            color={selected ? "#f5dfbe" : detail.accentColor}
            emissive="#f1d8a7"
            emissiveIntensity={0.1}
          />
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
          <meshStandardMaterial color={detail.darkTrimColor} />
        </mesh>
        <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[width * 0.24, width * 0.32, 0.08, 24]} />
          <meshStandardMaterial color={detail.darkTrimColor} />
        </mesh>
        {detail.variant % 2 === 0 ? (
          <mesh position={[width * 0.16, height + 0.012, -depth * 0.12]} castShadow>
            <cylinderGeometry args={[width * 0.08, width * 0.08, 0.02, 18]} />
            <meshStandardMaterial color={detail.trimColor} />
          </mesh>
        ) : null}
      </group>
    );
  }

  if (baseShape === "plant") {
    return (
      <group>
        <mesh position={[0, height * 0.16, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[width * 0.28, width * 0.36, height * 0.32, 18]} />
          <meshStandardMaterial color={detail.darkTrimColor} />
        </mesh>
        {[0, 1, 2, 3].map((index) => (
          <mesh
            key={index}
            position={[
              (index - 1.5) * width * 0.11,
              height * (0.46 + index * 0.09),
              index % 2 === 0 ? -depth * 0.06 : depth * 0.08,
            ]}
            castShadow
            receiveShadow
          >
            <sphereGeometry args={[width * Math.max(0.16, 0.27 - index * 0.025), 16, 12]} />
            <meshStandardMaterial
              color={index % 2 === 0 ? primaryColor : detail.accentColor}
            />
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
          <meshStandardMaterial color={detail.darkTrimColor} />
        </mesh>
        <mesh position={[-width * 0.18, height * 0.58, depth * 0.22]} castShadow>
          <boxGeometry args={[width * 0.28, height * 0.1, depth * 0.06]} />
          <meshStandardMaterial color={detail.trimColor} />
        </mesh>
      </group>
    );
  }

  if (baseShape === "bunk_bed") {
    const frameColor = selected ? "#d6ad7a" : primaryColor;

    return (
      <group>
        {[0.28, 0.72].map((heightRatio) => (
          <group key={heightRatio} position={[0, height * heightRatio, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[width, height * 0.12, depth]} />
              <meshStandardMaterial color="#a07454" />
            </mesh>
            <mesh position={[0, height * 0.08, 0]} castShadow receiveShadow>
              <boxGeometry args={[width * 0.94, height * 0.08, depth * 0.9]} />
              <meshStandardMaterial color={detail.fabricColor} />
            </mesh>
            <mesh position={[0, height * 0.16, -depth / 2 + 0.04]} castShadow>
              <boxGeometry args={[width, height * 0.16, depth * 0.08]} />
              <meshStandardMaterial color={frameColor} />
            </mesh>
          </group>
        ))}
        {[-0.46, 0.46].map((offset) => (
          <mesh key={offset} position={[offset * width, height / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[width * 0.05, height, depth * 0.08]} />
            <meshStandardMaterial color={frameColor} />
          </mesh>
        ))}
        <mesh position={[width * 0.44, height * 0.46, depth * 0.42]} castShadow receiveShadow>
          <boxGeometry args={[width * 0.08, height * 0.72, depth * 0.06]} />
          <meshStandardMaterial color={detail.darkTrimColor} />
        </mesh>
      </group>
    );
  }

  if (baseShape === "crib") {
    return (
      <group>
        <mesh position={[0, height * 0.28, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, height * 0.18, depth]} />
          <meshStandardMaterial color={detail.fabricColor} />
        </mesh>
        {[-0.48, -0.24, 0, 0.24, 0.48].map((offset) => (
          <mesh key={offset} position={[offset * width, height * 0.56, depth / 2]} castShadow>
            <boxGeometry args={[width * 0.035, height * 0.52, depth * 0.045]} />
            <meshStandardMaterial color={primaryColor} />
          </mesh>
        ))}
        <mesh position={[0, height * 0.82, depth / 2]} castShadow receiveShadow>
          <boxGeometry args={[width, height * 0.08, depth * 0.06]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[0, height * 0.82, -depth / 2]} castShadow receiveShadow>
          <boxGeometry args={[width, height * 0.08, depth * 0.06]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
      </group>
    );
  }

  if (baseShape === "laundry_basket") {
    return (
      <group>
        <mesh position={[0, height * 0.42, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[width * 0.42, width * 0.34, height * 0.82, 24]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[0, height * 0.86, 0]} castShadow>
          <torusGeometry args={[width * 0.39, width * 0.035, 10, 28]} />
          <meshStandardMaterial color={detail.trimColor} />
        </mesh>
        {[...Array(Math.max(3, Math.min(6, detail.lineCount)))].map((_, index) => (
          <mesh
            key={index}
            position={[
              Math.cos((index * Math.PI * 2) / detail.lineCount) * width * 0.31,
              height * 0.44,
              Math.sin((index * Math.PI * 2) / detail.lineCount) * depth * 0.31,
            ]}
            castShadow
          >
            <boxGeometry args={[width * 0.018, height * 0.58, depth * 0.018]} />
            <meshStandardMaterial color={detail.darkTrimColor} />
          </mesh>
        ))}
      </group>
    );
  }

  if (baseShape === "utility_cart") {
    return (
      <group>
        {[0.18, 0.52, 0.84].map((ratio) => (
          <mesh key={ratio} position={[0, height * ratio, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, height * 0.055, depth]} />
            <meshStandardMaterial color={ratio === 0.84 ? primaryColor : detail.trimColor} />
          </mesh>
        ))}
        {[-0.42, 0.42].flatMap((xOffset) =>
          [-0.34, 0.34].map((zOffset) => (
            <mesh
              key={`${xOffset}-${zOffset}`}
              position={[xOffset * width, height * 0.5, zOffset * depth]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[width * 0.04, height * 0.78, depth * 0.04]} />
              <meshStandardMaterial color={detail.darkTrimColor} />
            </mesh>
          )),
        )}
        <mesh position={[width * 0.18, height * 0.62, depth * 0.33]} castShadow>
          <boxGeometry args={[width * 0.2, height * 0.18, depth * 0.08]} />
          <meshStandardMaterial color={detail.accentColor} />
        </mesh>
        {[-0.36, 0.36].flatMap((xOffset) =>
          [-0.3, 0.3].map((zOffset) => (
            <mesh key={`wheel-${xOffset}-${zOffset}`} position={[xOffset * width, height * 0.04, zOffset * depth]} castShadow>
              <cylinderGeometry args={[width * 0.055, width * 0.055, depth * 0.05, 14]} />
              <meshStandardMaterial color="#2f3438" />
            </mesh>
          )),
        )}
      </group>
    );
  }

  if (baseShape === "ironing_board") {
    return (
      <group>
        <mesh position={[0, height * 0.82, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, height * 0.07, depth]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[width * 0.42, height * 0.82, 0]} castShadow receiveShadow>
          <sphereGeometry args={[depth * 0.5, 18, 10]} />
          <meshStandardMaterial color={detail.fabricColor} />
        </mesh>
        {[-1, 1].map((direction) => (
          <mesh
            key={direction}
            position={[direction * width * 0.18, height * 0.42, 0]}
            rotation={[0, 0, direction * 0.45]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[width * 0.06, height * 0.82, depth * 0.08]} />
            <meshStandardMaterial color={detail.metalColor} metalness={0.22} roughness={0.38} />
          </mesh>
        ))}
        <mesh position={[-width * 0.34, height * 0.09, 0]} castShadow receiveShadow>
          <boxGeometry args={[width * 0.28, height * 0.06, depth * 0.18]} />
          <meshStandardMaterial color={detail.metalColor} metalness={0.22} roughness={0.38} />
        </mesh>
      </group>
    );
  }

  if (baseShape === "drying_rack") {
    return (
      <group>
        {[-0.42, 0.42].map((xOffset) => (
          <mesh key={xOffset} position={[xOffset * width, height * 0.46, 0]} rotation={[0, 0, xOffset > 0 ? -0.28 : 0.28]} castShadow>
            <boxGeometry args={[width * 0.04, height * 0.88, depth * 0.04]} />
            <meshStandardMaterial color={detail.metalColor} metalness={0.28} roughness={0.36} />
          </mesh>
        ))}
        {[0.28, 0.42, 0.56, 0.7].map((ratio) => (
          <mesh key={ratio} position={[0, height * ratio, 0]} castShadow receiveShadow>
            <boxGeometry args={[width * 0.86, height * 0.025, depth * 0.04]} />
            <meshStandardMaterial color={primaryColor} />
          </mesh>
        ))}
        {[-0.3, 0, 0.3].map((xOffset) => (
          <mesh key={xOffset} position={[xOffset * width, height * 0.72, 0]} castShadow>
            <boxGeometry args={[width * 0.025, height * 0.025, depth * 0.78]} />
            <meshStandardMaterial color={detail.trimColor} />
          </mesh>
        ))}
      </group>
    );
  }

  if (baseShape === "umbrella_stand") {
    return (
      <group>
        <mesh position={[0, height * 0.38, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[width * 0.34, width * 0.42, height * 0.76, 24]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[0, height * 0.78, 0]} castShadow>
          <torusGeometry args={[width * 0.34, width * 0.025, 8, 24]} />
          <meshStandardMaterial color={detail.trimColor} />
        </mesh>
        {[-0.16, 0.08, 0.22].map((offset, index) => (
          <mesh
            key={offset}
            position={[offset * width, height * 0.72, (index - 1) * depth * 0.08]}
            rotation={[0, 0, offset > 0 ? -0.16 : 0.12]}
            castShadow
          >
            <boxGeometry args={[width * 0.035, height * 0.58, depth * 0.035]} />
            <meshStandardMaterial color={index === 1 ? detail.accentColor : "#4f565f"} />
          </mesh>
        ))}
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
          <meshStandardMaterial color={detail.glassColor} metalness={0.12} roughness={0.24} />
        </mesh>
        <mesh position={[width * 0.18, height + 0.14, -depth * 0.08]} castShadow>
          <torusGeometry args={[0.08, 0.012, 8, 18, Math.PI]} />
          <meshStandardMaterial color={detail.metalColor} metalness={0.38} roughness={0.28} />
        </mesh>
        <mesh position={[-width * 0.32, height + 0.025, depth * 0.26]} castShadow>
          <boxGeometry args={[width * 0.18, 0.018, depth * 0.1]} />
          <meshStandardMaterial color={detail.trimColor} />
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
            <meshStandardMaterial color={detail.metalColor} metalness={0.42} roughness={0.3} />
          </mesh>
        ))}
        <mesh position={[0, height + 0.02, depth * 0.32]} castShadow>
          <boxGeometry args={[width * 0.68, 0.018, depth * 0.035]} />
          <meshStandardMaterial color={detail.accentColor} />
        </mesh>
      </group>
    );
  }

  if (baseShape === "appliance_box" || baseShape === "washer") {
    const isDryer = labelKey.includes("dryer");
    const isDishwasher = labelKey.includes("dishwasher");
    const isMicrowave = labelKey.includes("microwave");

    return (
      <group>
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[0, height - height * 0.06, depth / 2 + 0.014]} castShadow>
          <boxGeometry args={[width * 0.84, height * 0.055, 0.025]} />
          <meshStandardMaterial color={detail.trimColor} />
        </mesh>
        <mesh position={[0, height * 0.52, depth / 2 + 0.012]} castShadow>
          {baseShape === "washer" ? (
            <cylinderGeometry args={[width * 0.24, width * 0.24, 0.025, 28]} />
          ) : (
            <boxGeometry
              args={[
                width * (isMicrowave ? 0.68 : 0.72),
                height * (isDishwasher ? 0.5 : 0.62),
                0.025,
              ]}
            />
          )}
          <meshStandardMaterial
            color={baseShape === "washer" ? (isDryer ? "#cdd5dc" : "#9db1c0") : "#202830"}
          />
        </mesh>
        {baseShape === "washer" ? (
          <mesh position={[0, height * 0.52, depth / 2 + 0.026]} castShadow>
            <torusGeometry args={[width * 0.2, width * 0.018, 10, 28]} />
            <meshStandardMaterial color={isDryer ? detail.accentColor : detail.glassColor} />
          </mesh>
        ) : null}
        {isMicrowave || isDishwasher ? (
          <mesh position={[width * 0.34, height * 0.52, depth / 2 + 0.032]} castShadow>
            <boxGeometry args={[width * 0.035, height * 0.5, 0.02]} />
            <meshStandardMaterial color={detail.metalColor} metalness={0.36} roughness={0.32} />
          </mesh>
        ) : null}
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
        <mesh position={[width * 0.38, height * 0.7, -depth * 0.2]} castShadow>
          <torusGeometry args={[width * 0.045, width * 0.01, 8, 16, Math.PI]} />
          <meshStandardMaterial color={detail.metalColor} metalness={0.38} roughness={0.28} />
        </mesh>
      </group>
    );
  }

  if (baseShape === "toilet") {
    return (
      <group>
        <mesh position={[0, height * 0.13, depth * 0.02]} castShadow receiveShadow>
          <boxGeometry args={[width * 0.42, height * 0.26, depth * 0.38]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[0, height * 0.34, depth * 0.08]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <torusGeometry args={[width * 0.25, width * 0.06, 16, 32]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[0, height * 0.335, depth * 0.08]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[width * 0.16, width * 0.16, depth * 0.035, 24]} />
          <meshStandardMaterial color={detail.glassColor} />
        </mesh>
        <mesh position={[0, height * 0.48, -depth * 0.24]} castShadow receiveShadow>
          <boxGeometry args={[width * 0.78, height * 0.38, depth * 0.18]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[0, height * 0.7, -depth * 0.245]} castShadow receiveShadow>
          <boxGeometry args={[width * 0.82, height * 0.08, depth * 0.2]} />
          <meshStandardMaterial color="#f2f6f8" />
        </mesh>
        <mesh position={[0, height * 0.05, depth * 0.28]} castShadow receiveShadow>
          <boxGeometry args={[width * 0.55, height * 0.09, depth * 0.26]} />
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
          <meshStandardMaterial color={detail.metalColor} metalness={0.36} roughness={0.3} />
        </mesh>
        <mesh position={[width * 0.24, height * 0.52, -depth / 2 + 0.08]} castShadow>
          <boxGeometry args={[0.035, height * 0.35, 0.035]} />
          <meshStandardMaterial color={detail.metalColor} metalness={0.36} roughness={0.3} />
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
        <mesh position={[width * 0.12, height * 0.57, Math.max(depth, 0.04) / 2 + 0.012]} castShadow>
          <boxGeometry args={[width * 0.26, height * 0.025, 0.012]} />
          <meshStandardMaterial color={detail.accentColor} />
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
        {[-0.27, -0.09, 0.09, 0.27].map((offset) => (
          <mesh
            key={`slot-${offset}`}
            position={[offset * width, height * 0.56, Math.max(depth, 0.1) / 2 + 0.02]}
            castShadow
          >
            <boxGeometry args={[width * 0.08, height * 0.06, 0.018]} />
            <meshStandardMaterial color={detail.trimColor} />
          </mesh>
        ))}
        <mesh position={[0, height * 0.12, Math.max(depth, 0.1) / 2]} castShadow>
          <boxGeometry args={[width, height * 0.08, 0.035]} />
          <meshStandardMaterial color={detail.accentColor} />
        </mesh>
      </group>
    );
  }

  if (baseShape === "window_panel") {
    return (
      <group>
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, height, Math.max(depth, 0.06)]} />
          <meshStandardMaterial color={detail.glassColor} transparent opacity={0.55} />
        </mesh>
        <mesh position={[0, height / 2, Math.max(depth, 0.06) / 2 + 0.012]} castShadow>
          <boxGeometry args={[width * 0.05, height, 0.024]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[0, height / 2, Math.max(depth, 0.06) / 2 + 0.014]} castShadow>
          <boxGeometry args={[width, height * 0.045, 0.024]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[-width * 0.28, height * 0.72, Math.max(depth, 0.06) / 2 + 0.018]} castShadow>
          <boxGeometry args={[width * 0.2, height * 0.035, 0.018]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.42} />
        </mesh>
      </group>
    );
  }

  if (baseShape === "ceiling_light") {
    return (
      <group>
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[width * 0.48, width * 0.36, height, 28]} />
          <meshStandardMaterial
            color={primaryColor}
            emissive={detail.accentColor}
            emissiveIntensity={0.32}
          />
        </mesh>
        <pointLight position={[0, -0.08, 0]} intensity={0.45} color={detail.accentColor} distance={4} />
      </group>
    );
  }

  if (baseShape === "wall_sconce") {
    return (
      <group>
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, height, Math.max(depth, 0.12)]} />
          <meshStandardMaterial color={detail.darkTrimColor} />
        </mesh>
        <mesh position={[0, height * 0.6, Math.max(depth, 0.12) / 2 + 0.04]} castShadow>
          <sphereGeometry args={[Math.min(width, height) * 0.28, 18, 12]} />
          <meshStandardMaterial color={primaryColor} emissive={detail.accentColor} emissiveIntensity={0.26} />
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
            <meshStandardMaterial color={ratio === 0.78 ? primaryColor : detail.trimColor} />
          </mesh>
        ))}
        {[-0.45, 0, 0.45].map((offset) => (
          <mesh key={offset} position={[offset * width, height / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[width * 0.05, height, depth]} />
            <meshStandardMaterial color={detail.darkTrimColor} />
          </mesh>
        ))}
        {[-0.22, 0.22].map((offset) => (
          <mesh key={`shoe-${offset}`} position={[offset * width, height * 0.1, depth * 0.34]} castShadow>
            <boxGeometry args={[width * 0.18, height * 0.08, depth * 0.18]} />
            <meshStandardMaterial color={detail.accentColor} />
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
          <meshStandardMaterial color={detail.darkTrimColor} />
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
            <meshStandardMaterial color={index % 2 === 0 ? detail.trimColor : detail.accentColor} />
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
            <meshStandardMaterial color={index === 1 ? primaryColor : detail.trimColor} />
          </mesh>
        ))}
        {[...Array(Math.max(3, Math.min(6, detail.lineCount)))].map((_, index) => (
          <mesh
            key={`slat-${index}`}
            position={[-width * 0.36 + index * (width * 0.72) / Math.max(1, detail.lineCount - 1), height / 2, depth * 0.16]}
            castShadow
          >
            <boxGeometry args={[width * 0.018, height * 0.92, Math.max(depth, 0.08)]} />
            <meshStandardMaterial color={detail.darkTrimColor} />
          </mesh>
        ))}
      </group>
    );
  }

  if (baseShape === "stairs") {
    const stepCount = 8;
    const stepHeight = height / stepCount;
    const runDepth = depth * 0.88;
    const treadDepth = runDepth / stepCount;
    const treadWidth = width * 0.82;
    const stringerWidth = Math.max(width * 0.08, 0.05);
    const diagonalLength = Math.sqrt(height * height + runDepth * runDepth);
    const stringerAngle = Math.atan(runDepth / height);

    return (
      <group>
        <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
          <boxGeometry args={[width * 0.9, 0.06, runDepth]} />
          <meshStandardMaterial color="#4b4036" />
        </mesh>
        {[-1, 1].map((direction) => (
          <mesh
            key={direction}
            position={[direction * (treadWidth * 0.5 - stringerWidth * 0.5), height * 0.48, 0]}
            rotation={[-stringerAngle, 0, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[stringerWidth, diagonalLength, 0.08]} />
            <meshStandardMaterial color="#5e4e42" />
          </mesh>
        ))}
        {[...Array(stepCount)].map((_, index) => {
          const z = -runDepth / 2 + treadDepth * (index + 0.5);
          const y = stepHeight * index + stepHeight * 0.36;
          const topRailHeight = y + stepHeight * 0.95;

          return (
            <group key={index}>
              <mesh position={[0, y, z]} castShadow receiveShadow>
                <boxGeometry args={[treadWidth, stepHeight * 0.72, treadDepth * 0.92]} />
                <meshStandardMaterial color={primaryColor} />
              </mesh>
              {index % 2 === 0 ? (
                <>
                  <mesh
                    position={[treadWidth * 0.46, topRailHeight, z]}
                    castShadow
                    receiveShadow
                  >
                    <cylinderGeometry args={[0.018, 0.018, stepHeight * 1.15, 10]} />
                    <meshStandardMaterial color="#cdc7c1" />
                  </mesh>
                  <mesh
                    position={[-treadWidth * 0.46, topRailHeight, z]}
                    castShadow
                    receiveShadow
                  >
                    <cylinderGeometry args={[0.018, 0.018, stepHeight * 1.15, 10]} />
                    <meshStandardMaterial color="#cdc7c1" />
                  </mesh>
                </>
              ) : null}
            </group>
          );
        })}
      </group>
    );
  }

  if (baseShape === "spiral_stairs") {
    const stepCount = 11;
    const stepHeight = height / stepCount;
    const outerRadius = Math.min(width, depth) * 0.46;
    const stepOrbitRadius = outerRadius * 0.42;
    const treadLength = outerRadius * 0.72;
    const treadDepth = outerRadius * 0.28;
    const postRadius = Math.max(width * 0.022, 0.016);

    return (
      <group>
        <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[outerRadius * 1.03, outerRadius * 1.08, 0.06, 28]} />
          <meshStandardMaterial color="#4b4036" />
        </mesh>
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[outerRadius * 0.1, outerRadius * 0.12, height, 18]} />
          <meshStandardMaterial color="#6b5a4f" />
        </mesh>
        {[...Array(stepCount)].map((_, index) => {
          const angle = -Math.PI * 0.72 + index * 0.58;
          const x = Math.cos(angle) * stepOrbitRadius;
          const z = Math.sin(angle) * stepOrbitRadius;
          const y = stepHeight * index + stepHeight * 0.34;

          return (
            <group key={index} position={[x, y, z]} rotation={[0, Math.PI / 2 - angle, 0]}>
              <mesh position={[outerRadius * 0.12, 0, 0]} castShadow receiveShadow>
                <boxGeometry args={[treadLength, stepHeight * 0.68, treadDepth]} />
                <meshStandardMaterial color={primaryColor} />
              </mesh>
              {index % 2 === 0 ? (
                <mesh
                  position={[outerRadius * 0.38, stepHeight * 0.58, 0]}
                  castShadow
                  receiveShadow
                >
                  <cylinderGeometry args={[postRadius, postRadius, stepHeight * 1.2, 10]} />
                  <meshStandardMaterial color="#d7d2cd" />
                </mesh>
              ) : null}
            </group>
          );
        })}
        <mesh position={[0, height - 0.04, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[outerRadius * 0.22, outerRadius * 0.32, 0.08, 18]} />
          <meshStandardMaterial color="#7a6b60" />
        </mesh>
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
            <boxGeometry args={[width * 0.07, height, depth * 0.035]} />
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
            <boxGeometry args={[width * 0.62, height * 0.03, depth * 0.07]} />
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
          <meshStandardMaterial
            color={labelKey.includes("mirror") || labelKey.includes("window") ? detail.glassColor : detail.fabricColor}
            metalness={labelKey.includes("mirror") ? 0.26 : 0}
            roughness={labelKey.includes("mirror") ? 0.18 : 0.72}
          />
        </mesh>
        <mesh position={[0, height * 0.18, Math.max(depth, 0.06) / 2 + 0.015]} castShadow>
          <boxGeometry args={[width * 0.62, height * 0.035, 0.016]} />
          <meshStandardMaterial color={detail.accentColor} />
        </mesh>
      </group>
    );
  }

  if (baseShape === "wall_tv") {
    return (
      <group>
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, height, Math.max(depth, 0.06)]} />
          <meshStandardMaterial color="#111820" />
        </mesh>
        <mesh position={[0, height / 2, Math.max(depth, 0.06) / 2 + 0.012]} castShadow>
          <boxGeometry args={[width * 0.88, height * 0.78, 0.018]} />
          <meshStandardMaterial color={selected ? "#2e83a8" : primaryColor} emissive="#12344a" emissiveIntensity={0.12} />
        </mesh>
        <mesh position={[0, height * 0.58, Math.max(depth, 0.06) / 2 + 0.016]} castShadow>
          <boxGeometry args={[width * 0.48, height * 0.08, 0.016]} />
          <meshStandardMaterial color={detail.glassColor} transparent opacity={0.26} />
        </mesh>
        <mesh position={[0, height * 0.08, Math.max(depth, 0.06) / 2 + 0.014]} castShadow>
          <boxGeometry args={[width * 0.42, height * 0.035, 0.018]} />
          <meshStandardMaterial color={detail.metalColor} metalness={0.28} roughness={0.38} />
        </mesh>
      </group>
    );
  }

  if (baseShape === "pegboard") {
    return (
      <group>
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, height, Math.max(depth, 0.06)]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        {[-0.3, -0.1, 0.1, 0.3].flatMap((xOffset) =>
          [0.28, 0.5, 0.72].map((yRatio) => (
            <mesh
              key={`${xOffset}-${yRatio}`}
              position={[xOffset * width, height * yRatio, Math.max(depth, 0.06) / 2 + 0.014]}
              castShadow
            >
              <cylinderGeometry args={[width * 0.018, width * 0.018, 0.02, 10]} />
              <meshStandardMaterial color={detail.darkTrimColor} />
            </mesh>
          )),
        )}
        <mesh position={[width * 0.18, height * 0.36, Math.max(depth, 0.06) / 2 + 0.03]} rotation={[0.45, 0, 0]} castShadow>
          <boxGeometry args={[width * 0.22, height * 0.035, depth * 0.08]} />
          <meshStandardMaterial color={detail.accentColor} />
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
          <meshStandardMaterial color={detail.glassColor} metalness={0.25} roughness={0.18} />
        </mesh>
        <mesh position={[0, 0.04, -depth * 0.36]} castShadow receiveShadow>
          <boxGeometry args={[width * 0.72, 0.08, Math.max(depth * 0.85, 0.12)]} />
          <meshStandardMaterial color={detail.darkTrimColor} />
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
            <meshStandardMaterial color={offset === 0 ? detail.accentColor : detail.trimColor} />
          </mesh>
        ))}
      </group>
    );
  }

  if (baseShape === "wall_hook") {
    return (
      <group>
        <mesh position={[0, height * 0.62, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, height * 0.22, Math.max(depth, 0.08)]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        <mesh position={[0, height * 0.72, Math.max(depth, 0.08) / 2 + 0.016]} castShadow>
          <boxGeometry args={[width * 0.72, height * 0.04, 0.018]} />
          <meshStandardMaterial color={detail.trimColor} />
        </mesh>
        {[-0.32, 0, 0.32].map((offset, index) => (
          <mesh
            key={offset}
            position={[offset * width, height * 0.34, Math.max(depth, 0.08) / 2 + 0.03]}
            rotation={[0.55, 0, 0]}
            castShadow
          >
            <boxGeometry args={[width * 0.08, height * 0.38, depth * 0.08]} />
            <meshStandardMaterial color={index % 2 === 0 ? detail.accentColor : detail.metalColor} />
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
          <meshStandardMaterial color={detail.metalColor} metalness={0.42} roughness={0.28} />
        </mesh>
        {[0.28, 0.5, 0.72].map((ratio) => (
          <mesh key={ratio} position={[0, height * ratio, Math.max(depth, 0.08) / 2 + 0.012]} castShadow>
            <boxGeometry args={[width * 0.62, height * 0.018, 0.014]} />
            <meshStandardMaterial color={detail.trimColor} />
          </mesh>
        ))}
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
        <mesh position={[0, height * 0.31, depth * 0.27]} castShadow>
          <cylinderGeometry args={[width * 0.08, width * 0.08, 0.018, 18]} />
          <meshStandardMaterial color={detail.darkTrimColor} />
        </mesh>
        <mesh position={[0, height * 0.66, 0]} castShadow receiveShadow>
          <boxGeometry args={[width * 0.12, height * 0.58, depth * 0.12]} />
          <meshStandardMaterial color={detail.darkTrimColor} />
        </mesh>
        <mesh position={[0, height * 0.08, depth * 0.1]} castShadow receiveShadow>
          <boxGeometry args={[width * 0.65, height * 0.08, depth * 0.18]} />
          <meshStandardMaterial color="#4f4037" />
        </mesh>
        {[...Array(4)].map((_, index) => (
          <mesh
            key={index}
            position={[-width * 0.06 + index * width * 0.04, height * 0.58, depth * 0.08]}
            castShadow
          >
            <boxGeometry args={[width * 0.008, height * 0.5, depth * 0.01]} />
            <meshStandardMaterial color={detail.metalColor} metalness={0.4} roughness={0.3} />
          </mesh>
        ))}
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
        <mesh position={[0, height * 0.88, -depth * 0.12]} castShadow receiveShadow>
          <boxGeometry args={[width * 0.86, height * 0.18, depth * 0.08]} />
          <meshStandardMaterial color={detail.darkTrimColor} />
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
        <mesh position={[width * 0.32, height * 0.72, depth / 2 + 0.028]} castShadow>
          <boxGeometry args={[width * 0.12, height * 0.08, 0.024]} />
          <meshStandardMaterial color={detail.accentColor} />
        </mesh>
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
        <meshStandardMaterial color={detail.trimColor} />
      </mesh>
      <mesh position={[0, height * 0.58, depth / 2 + 0.012]} castShadow>
        <boxGeometry args={[width * 0.54, height * 0.08, 0.024]} />
        <meshStandardMaterial color={detail.accentColor} />
      </mesh>
      <mesh position={[width * 0.28, height * 0.34, depth / 2 + 0.014]} castShadow>
        <boxGeometry args={[width * 0.08, height * 0.34, 0.02]} />
        <meshStandardMaterial color={detail.metalColor} metalness={0.35} roughness={0.34} />
      </mesh>
    </group>
  );
}
