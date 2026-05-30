"use client";

import { Canvas } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { useRoomStore } from "@/store/roomStore";
import { RoomFloor } from "./RoomFloor";
import { RoomObject } from "./RoomObject";
import { RoomWalls } from "./RoomWalls";
import { CameraControls } from "./CameraControls";

export function RoomScene() {
  const roomData = useRoomStore((state) => state.roomData);
  const selectedObjectId = useRoomStore((state) => state.selectedObjectId);
  const cameraMode = useRoomStore((state) => state.cameraMode);
  const setSelectedObjectId = useRoomStore((state) => state.setSelectedObjectId);

  return (
    <Canvas
      shadows
      camera={{ position: [7.8, 6.1, 7.4], fov: 42 }}
      onPointerMissed={() => setSelectedObjectId(null)}
    >
      <color attach="background" args={["#f7f1e8"]} />
      <fog attach="fog" args={["#f7f1e8", 10, 22]} />
      <ambientLight intensity={1.2} />
      <directionalLight
        castShadow
        position={[8, 12, 6]}
        intensity={1.35}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[1.2, 4.6, 1.8]} intensity={0.6} color="#ffd7ad" />

      <group position={[-roomData.room.width / 2, 0, -roomData.room.depth / 2]}>
        <RoomFloor width={roomData.room.width} depth={roomData.room.depth} />
        <RoomWalls room={roomData.room} />
        {roomData.objects.map((object) => (
          <RoomObject
            key={object.id}
            object={object}
            roomData={roomData}
            isSelected={selectedObjectId === object.id}
          />
        ))}
        <ContactShadows
          position={[roomData.room.width / 2, 0.01, roomData.room.depth / 2]}
          scale={Math.max(roomData.room.width, roomData.room.depth) * 1.25}
          blur={2.6}
          opacity={0.36}
          far={10}
        />
      </group>
      <CameraControls mode={cameraMode} room={roomData.room} />
    </Canvas>
  );
}
