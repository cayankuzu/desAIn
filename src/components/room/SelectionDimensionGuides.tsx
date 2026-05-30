import { Line, Text } from "@react-three/drei";
import type { RoomObject } from "@/types/room";

interface SelectionDimensionGuidesProps {
  object: RoomObject;
}

export function SelectionDimensionGuides({
  object,
}: SelectionDimensionGuidesProps) {
  const { width, depth, height } = object.dimensions;
  const offset = 0.16;

  return (
    <group>
      <mesh position={[0, 0.04, 0]}>
        <sphereGeometry args={[0.05, 20, 20]} />
        <meshBasicMaterial color="#ff8c42" />
      </mesh>

      <Line
        points={[
          [-width / 2, 0.03, depth / 2 + offset],
          [width / 2, 0.03, depth / 2 + offset],
        ]}
        color="#ffb16a"
      />
      <Line
        points={[
          [width / 2 + offset, 0.03, -depth / 2],
          [width / 2 + offset, 0.03, depth / 2],
        ]}
        color="#ffb16a"
      />
      <Line
        points={[
          [-width / 2 - offset, 0, -depth / 2],
          [-width / 2 - offset, height, -depth / 2],
        ]}
        color="#ffb16a"
      />

      <Text
        position={[0, 0.09, depth / 2 + offset + 0.07]}
        fontSize={0.11}
        color="#ffe2b8"
        anchorX="center"
        anchorY="middle"
      >
        {`W ${width.toFixed(2)}m`}
      </Text>
      <Text
        position={[width / 2 + offset + 0.08, 0.09, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        fontSize={0.11}
        color="#ffe2b8"
        anchorX="center"
        anchorY="middle"
      >
        {`D ${depth.toFixed(2)}m`}
      </Text>
      <Text
        position={[-width / 2 - offset - 0.06, height / 2, -depth / 2]}
        rotation={[0, -Math.PI / 2, 0]}
        fontSize={0.11}
        color="#ffe2b8"
        anchorX="center"
        anchorY="middle"
      >
        {`H ${height.toFixed(2)}m`}
      </Text>

      <Text
        position={[0, height + 0.22, 0]}
        fontSize={0.13}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {object.label}
      </Text>
    </group>
  );
}
