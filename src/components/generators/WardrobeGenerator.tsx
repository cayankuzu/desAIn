import { getObjectDetailProfile } from "@/lib/room/detailProfile";
import type { RoomObject } from "@/types/room";

interface WardrobeGeneratorProps {
  object: RoomObject;
  selected: boolean;
}

export function WardrobeGenerator({ object, selected }: WardrobeGeneratorProps) {
  const { width, depth, height } = object.dimensions;
  const detail = getObjectDetailProfile(object);
  const labelKey = object.labelKey.toLowerCase();
  const doorCount = Math.max(0, Math.round(Number(object.params.doorCount ?? 3)));
  const safeDoorCount = Math.max(1, doorCount);
  const trimHeight = Math.max(0.04, height * 0.04);
  const handleHeight = Math.max(0.16, height * 0.16);
  const handleWidth = Math.max(0.015, width * 0.012);
  const panelWidth = width / safeDoorCount - 0.04;
  const panelColor = selected ? "#f4d1ad" : detail.trimColor;
  const isOpenShelf =
    doorCount === 0 || labelKey.includes("bookshelf") || labelKey.includes("dividershelf");
  const isFridge = labelKey.includes("fridge");
  const isTallOven = labelKey.includes("oven");
  const isDresser = labelKey.includes("dresser") || labelKey.includes("sideboard");
  const isMirrored = object.params.mirrored === true || labelKey.includes("mirror");

  if (isOpenShelf) {
    const shelfCount = Math.max(3, Math.min(6, detail.lineCount + 1));

    return (
      <group>
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color={object.color} />
        </mesh>
        <mesh position={[0, height / 2, depth / 2 + 0.012]} castShadow receiveShadow>
          <boxGeometry args={[width * 0.9, height * 0.9, 0.024]} />
          <meshStandardMaterial color="#111820" />
        </mesh>
        {[...Array(shelfCount)].map((_, index) => (
          <mesh
            key={index}
            position={[
              0,
              height * (0.17 + (index * 0.66) / Math.max(1, shelfCount - 1)),
              depth / 2 + 0.026,
            ]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[width * 0.86, height * 0.028, 0.035]} />
            <meshStandardMaterial color={detail.trimColor} />
          </mesh>
        ))}
        {[-0.28, 0.02, 0.31].map((offset, index) => (
          <mesh
            key={offset}
            position={[width * offset, height * (0.25 + index * 0.16), depth / 2 + 0.05]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[width * 0.08, height * 0.18, depth * 0.08]} />
            <meshStandardMaterial
              color={index % 2 === 0 ? detail.accentColor : detail.fabricColor}
            />
          </mesh>
        ))}
        {[...Array(Math.max(1, Math.min(3, detail.variant % 4)))].map((_, index) => (
          <mesh
            key={`basket-${index}`}
            position={[-width * 0.24 + index * width * 0.24, height * 0.1, depth / 2 + 0.055]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[width * 0.16, height * 0.1, depth * 0.12]} />
            <meshStandardMaterial color={detail.darkTrimColor} />
          </mesh>
        ))}
      </group>
    );
  }

  if (isFridge || isTallOven) {
    return (
      <group>
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial
            color={object.color}
            metalness={isFridge ? 0.18 : 0}
            roughness={0.42}
          />
        </mesh>
        <mesh position={[0, height * 0.58, depth / 2 + 0.018]} castShadow receiveShadow>
          <boxGeometry args={[width * 0.9, height * (isTallOven ? 0.32 : 0.54), 0.035]} />
          <meshStandardMaterial color={isTallOven ? "#202830" : detail.glassColor} />
        </mesh>
        <mesh position={[0, height * 0.26, depth / 2 + 0.019]} castShadow receiveShadow>
          <boxGeometry args={[width * 0.9, height * 0.35, 0.032]} />
          <meshStandardMaterial color={isFridge ? "#e8edf0" : detail.trimColor} />
        </mesh>
        <mesh position={[width * 0.38, height * 0.56, depth / 2 + 0.042]} castShadow>
          <boxGeometry args={[handleWidth * 1.4, handleHeight * 1.42, 0.03]} />
          <meshStandardMaterial color={detail.metalColor} metalness={0.45} roughness={0.28} />
        </mesh>
        {isTallOven ? (
          <mesh position={[0, height * 0.58, depth / 2 + 0.045]} castShadow>
            <boxGeometry args={[width * 0.58, height * 0.035, 0.02]} />
            <meshStandardMaterial color={detail.metalColor} metalness={0.42} roughness={0.32} />
          </mesh>
        ) : null}
      </group>
    );
  }

  return (
    <group>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={object.color} />
      </mesh>
      <mesh position={[0, trimHeight / 2, depth * 0.02]} castShadow receiveShadow>
        <boxGeometry args={[width * 0.96, trimHeight, depth * 0.92]} />
        <meshStandardMaterial color={detail.darkTrimColor} />
      </mesh>
      <mesh position={[0, height - trimHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width * 0.98, trimHeight, depth * 0.94]} />
        <meshStandardMaterial color={detail.accentColor} />
      </mesh>
      {[...Array(safeDoorCount)].map((_, index) => (
        <group
          key={index}
          position={[
            -width / 2 + width / safeDoorCount / 2 + (index * width) / safeDoorCount,
            height / 2,
            depth / 2 + 0.01,
          ]}
        >
          <mesh castShadow receiveShadow>
            <boxGeometry args={[panelWidth, height - 0.08, 0.02]} />
            <meshStandardMaterial color={panelColor} />
          </mesh>
          <mesh position={[0, 0, 0.012]} castShadow receiveShadow>
            <boxGeometry args={[panelWidth * 0.78, height * 0.72, 0.012]} />
            <meshStandardMaterial
              color={isMirrored ? detail.glassColor : selected ? "#f9e2c8" : detail.fabricColor}
              metalness={isMirrored ? 0.25 : 0}
              roughness={isMirrored ? 0.18 : 0.72}
            />
          </mesh>
          <mesh
            position={[
              panelWidth * (index === 0 ? 0.28 : index === safeDoorCount - 1 ? -0.28 : 0.24),
              0,
              0.03,
            ]}
            castShadow
            receiveShadow
          >
            <boxGeometry
              args={[
                detail.handleStyle === "knob" ? handleWidth * 2.2 : handleWidth,
                detail.handleStyle === "slot" ? handleHeight * 0.38 : handleHeight,
                0.03,
              ]}
            />
            <meshStandardMaterial color={detail.metalColor} metalness={0.45} roughness={0.32} />
          </mesh>
        </group>
      ))}
      {isDresser ? (
        <>
          {[0.28, 0.46, 0.64].map((ratio) => (
            <mesh
              key={ratio}
              position={[0, height * ratio, depth / 2 + 0.034]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[width * 0.78, height * 0.035, 0.02]} />
              <meshStandardMaterial color={detail.darkTrimColor} />
            </mesh>
          ))}
          <mesh position={[0, height * 0.82, depth / 2 + 0.04]} castShadow receiveShadow>
            <boxGeometry args={[width * 0.34, height * 0.08, 0.035]} />
            <meshStandardMaterial color={detail.accentColor} />
          </mesh>
        </>
      ) : null}
    </group>
  );
}
