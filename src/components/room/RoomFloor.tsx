interface RoomFloorProps {
  width: number;
  depth: number;
}

export function RoomFloor({ width, depth }: RoomFloorProps) {
  return (
    <group>
      <mesh position={[width / 2, 0, depth / 2]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#39424d" />
      </mesh>
      <gridHelper
        position={[width / 2, 0.01, depth / 2]}
        args={[
          Math.max(width, depth),
          Math.round(Math.max(width, depth) * 2),
          "#5d6a79",
          "#2b323b",
        ]}
      />
    </group>
  );
}
