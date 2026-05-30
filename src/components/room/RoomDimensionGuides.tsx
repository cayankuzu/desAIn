"use client";

import { Line, Text } from "@react-three/drei";
import { t } from "@/lib/i18n/translations";
import { useUIStore } from "@/store/uiStore";

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
  const locale = useUIStore((state) => state.locale);
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
        {`${t(locale, "widthShort")} ${width.toFixed(2)}m`}
      </Text>
      <Text
        position={[-offset - 0.12, 0.09, depth / 2]}
        rotation={[0, -Math.PI / 2, 0]}
        fontSize={0.14}
        color={textColor}
        anchorX="center"
        anchorY="middle"
      >
        {`${t(locale, "depthShort")} ${depth.toFixed(2)}m`}
      </Text>
      <Text
        position={[-offset - 0.08, height / 2, -0.08]}
        rotation={[0, -Math.PI / 2, 0]}
        fontSize={0.12}
        color={textColor}
        anchorX="center"
        anchorY="middle"
      >
        {`${t(locale, "heightShort")} ${height.toFixed(2)}m`}
      </Text>
    </group>
  );
}
