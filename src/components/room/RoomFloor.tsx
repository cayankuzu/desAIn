interface RoomFloorProps {
  width: number;
  depth: number;
}

export function RoomFloor({ width, depth }: RoomFloorProps) {
  return (
    <group>
      <mesh position={[width / 2, 0, depth / 2]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#d8cab7" />
      </mesh>
      <gridHelper
        position={[width / 2, 0.01, depth / 2]}
        args={[
          Math.max(width, depth),
          Math.round(Math.max(width, depth) * 2),
          "#9f8b78",
          "#c8b7a5",
        ]}
      />
    </group>
  );
}
