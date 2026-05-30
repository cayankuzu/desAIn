import { Line, Text } from "@react-three/drei";

interface RoomDimensionGuidesProps {
  width: number;
  depth: number;
  height: number;
}

export function RoomDimensionGuides({
  width,
  depth,
  height,
}: RoomDimensionGuidesProps) {
  const offset = 0.34;
  const textColor = "#8fc3ff";

  return (
    <group>
      <Line
        points={[
          [0, 0.02, depth + offset],
          [width, 0.02, depth + offset],
        ]}
        color="#4ea8ff"
      />
      <Line
        points={[
          [-offset, 0.02, 0],
          [-offset, 0.02, depth],
        ]}
        color="#4ea8ff"
      />
      <Line
        points={[
          [-offset, 0, 0],
          [-offset, height, 0],
        ]}
        color="#4ea8ff"
      />

      <Text
        position={[width / 2, 0.09, depth + offset + 0.08]}
        fontSize={0.14}
        color={textColor}
        anchorX="center"
        anchorY="middle"
      >
        {`W ${width.toFixed(2)}m`}
      </Text>
      <Text
        position={[-offset - 0.12, 0.09, depth / 2]}
        rotation={[0, -Math.PI / 2, 0]}
        fontSize={0.14}
        color={textColor}
        anchorX="center"
        anchorY="middle"
      >
        {`D ${depth.toFixed(2)}m`}
      </Text>
      <Text
        position={[-offset - 0.08, height / 2, -0.08]}
        rotation={[0, -Math.PI / 2, 0]}
        fontSize={0.12}
        color={textColor}
        anchorX="center"
        anchorY="middle"
      >
        {`H ${height.toFixed(2)}m`}
      </Text>
    </group>
  );
}
