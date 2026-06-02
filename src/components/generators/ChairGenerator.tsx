import type { RoomObject } from "@/types/room";
import { getObjectDetailProfile } from "@/lib/room/detailProfile";

interface ChairGeneratorProps {
  object: RoomObject;
  selected: boolean;
}

export function ChairGenerator({ object, selected }: ChairGeneratorProps) {
  const { width, depth, height } = object.dimensions;
  const detail = getObjectDetailProfile(object);
  const labelKey = object.labelKey.toLowerCase();
  const isOfficeChair = labelKey.includes("office");
  const isBarStool = labelKey.includes("barstool");
  const seatHeight = height * 0.48;
  const legSize = width * 0.12;
  const backHeight = height * 0.42;
  const seatColor = selected ? "#9dc2ca" : object.color;
  const frameColor = isOfficeChair ? "#2f3c45" : detail.darkTrimColor;
  const cushionColor = selected ? "#d6eef5" : detail.fabricColor;
  const slatWidth = Math.max(0.03, width * 0.12);

  return (
    <group>
      {isOfficeChair ? (
        <>
          <mesh position={[0, seatHeight * 0.26, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[width * 0.07, width * 0.08, seatHeight * 0.52, 16]} />
            <meshStandardMaterial color={detail.metalColor} metalness={0.35} roughness={0.36} />
          </mesh>
          {[0, 1, 2, 3, 4].map((index) => {
            const angle = (index * Math.PI * 2) / 5;

            return (
              <group key={index} rotation={[0, angle, 0]}>
                <mesh position={[width * 0.22, seatHeight * 0.08, 0]} castShadow receiveShadow>
                  <boxGeometry args={[width * 0.34, height * 0.035, width * 0.035]} />
                  <meshStandardMaterial color={detail.metalColor} metalness={0.3} roughness={0.38} />
                </mesh>
                <mesh position={[width * 0.38, seatHeight * 0.035, 0]} castShadow>
                  <cylinderGeometry args={[width * 0.035, width * 0.035, width * 0.045, 12]} />
                  <meshStandardMaterial color="#202830" />
                </mesh>
              </group>
            );
          })}
        </>
      ) : null}
      <mesh position={[0, seatHeight, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height * 0.09, depth]} />
        <meshStandardMaterial color={seatColor} />
      </mesh>
      <mesh position={[0, seatHeight + height * 0.055, 0]} castShadow receiveShadow>
        <boxGeometry args={[width * 0.88, height * 0.045, depth * 0.82]} />
        <meshStandardMaterial color={cushionColor} />
      </mesh>
      {(isOfficeChair
        ? []
        : [
        [-width / 2 + legSize, seatHeight / 2, -depth / 2 + legSize],
        [width / 2 - legSize, seatHeight / 2, -depth / 2 + legSize],
        [-width / 2 + legSize, seatHeight / 2, depth / 2 - legSize],
        [width / 2 - legSize, seatHeight / 2, depth / 2 - legSize],
      ]).map((position, index) => (
        <mesh key={index} position={position as [number, number, number]} castShadow receiveShadow>
          <boxGeometry args={[legSize, seatHeight, legSize]} />
          <meshStandardMaterial color={frameColor} />
        </mesh>
      ))}
      {isBarStool ? (
        <mesh position={[0, seatHeight * 0.54, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[width * 0.28, width * 0.018, 8, 28]} />
          <meshStandardMaterial color={detail.metalColor} metalness={0.32} roughness={0.35} />
        </mesh>
      ) : null}
      <mesh position={[0, seatHeight * 0.56, 0]} castShadow receiveShadow>
        <boxGeometry args={[width * 0.7, height * 0.04, legSize * 0.8]} />
        <meshStandardMaterial color={frameColor} />
      </mesh>
      <mesh
        position={[0, seatHeight + backHeight / 2, -depth / 2 + legSize / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width, backHeight, legSize]} />
        <meshStandardMaterial color={seatColor} />
      </mesh>
      <mesh
        position={[0, seatHeight + backHeight * 0.42, -depth / 2 + legSize * 1.1]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width * 0.78, backHeight * 0.3, legSize * 0.8]} />
        <meshStandardMaterial color={cushionColor} />
      </mesh>
      {[-1, 0, 1].map((side) => (
        <mesh
          key={side}
          position={[side * width * 0.2, seatHeight + backHeight * 0.08, -depth / 2 + legSize]}
          castShadow
          receiveShadow
        >
          <boxGeometry
            args={[
              side === 0 ? slatWidth * 0.72 : slatWidth,
              backHeight * (isOfficeChair ? 0.56 : 0.78),
              legSize * 0.56,
            ]}
          />
          <meshStandardMaterial color={side === 0 ? detail.accentColor : frameColor} />
        </mesh>
      ))}
    </group>
  );
}
