"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { RoomFloor } from "@/components/room/RoomFloor";
import { generatorMap } from "@/lib/room/generatorMap";
import {
  getOpeningHeight,
  getOpeningSceneTransform,
} from "@/lib/room/openingPlacement";
import { getWallMetrics } from "@/lib/room/roomGeometry";
import { createRoomPreset, roomPurposeOptions } from "@/lib/room/roomPresets";
import type { Opening, RoomData, RoomObject, RoomPurpose } from "@/types/room";

function PreviewCamera({ room }: { room: RoomData["room"] }) {
  const { camera, invalidate } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const focusY = room.height * 0.28;
  const maxSpan = Math.max(room.width, room.depth);

  useEffect(() => {
    camera.position.set(
      room.width * 0.58,
      Math.max(room.height * 1.18, 4.25),
      room.depth * 0.94,
    );
    controlsRef.current?.target.set(0, focusY, 0);
    controlsRef.current?.update();
    invalidate();
  }, [camera, focusY, invalidate, room.depth, room.height, room.width]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan
      enableRotate
      enableZoom
      enableDamping
      dampingFactor={0.08}
      onChange={() => invalidate()}
      rotateSpeed={0.72}
      zoomSpeed={0.8}
      panSpeed={0.7}
      minDistance={Math.max(2.6, maxSpan * 0.5)}
      maxDistance={Math.max(7.2, maxSpan * 1.75)}
      minPolarAngle={Math.PI / 4.2}
      maxPolarAngle={Math.PI / 2.02}
      target={[0, focusY, 0]}
    />
  );
}

function StaticRoomObject({ object }: { object: RoomObject }) {
  const Generator = generatorMap[object.generator];
  const mountHeight =
    typeof object.params.mountHeight === "number" ? object.params.mountHeight : 0;

  return (
    <group
      position={[object.position.x, mountHeight, object.position.z]}
      rotation={[0, (object.rotation * Math.PI) / 180, 0]}
    >
      <Generator object={object} selected={false} />
    </group>
  );
}

function PreviewOpeningVisual({ opening, roomHeight }: { opening: Opening; roomHeight: number }) {
  const frameColor =
    opening.type === "door"
      ? "#d18451"
      : opening.type === "radiator"
        ? "#c89b5f"
        : "#7db7d2";
  const innerDepth = 0.04;
  const openingHeight = getOpeningHeight(opening, roomHeight);

  if (opening.type === "door" || opening.type === "balcony_door") {
    return (
      <group>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[opening.width, openingHeight, 0.08]} />
          <meshStandardMaterial color={frameColor} />
        </mesh>
        <mesh castShadow position={[0, 0, 0.05]}>
          <boxGeometry args={[Math.max(0.2, opening.width - 0.08), openingHeight - 0.08, 0.02]} />
          <meshStandardMaterial color="#f2d4b5" />
        </mesh>
      </group>
    );
  }

  if (opening.type === "window") {
    return (
      <group>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[opening.width, openingHeight, 0.08]} />
          <meshStandardMaterial color={frameColor} />
        </mesh>
        <mesh castShadow position={[0, 0, innerDepth]}>
          <boxGeometry args={[Math.max(0.22, opening.width - 0.14), openingHeight - 0.14, 0.02]} />
          <meshStandardMaterial
            color="#d8eef7"
            transparent
            opacity={0.52}
            emissive="#7cb7cf"
            emissiveIntensity={0.2}
          />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      {[-0.24, -0.12, 0, 0.12, 0.24].map((offset) => (
        <mesh key={offset} castShadow receiveShadow position={[offset * opening.width, 0, 0]}>
          <boxGeometry args={[opening.width * 0.12, openingHeight, 0.08]} />
          <meshStandardMaterial color={frameColor} />
        </mesh>
      ))}
      <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
        <boxGeometry args={[opening.width, 0.05, 0.09]} />
        <meshStandardMaterial color="#dfb070" />
      </mesh>
    </group>
  );
}

function PreviewRoomWalls({ room }: { room: RoomData["room"] }) {
  return (
    <group>
      {room.walls.map((wall, index) => {
        const { length, rotationY } = getWallMetrics(wall);
        const centerX = (wall.from[0] + wall.to[0]) / 2;
        const centerZ = (wall.from[1] + wall.to[1]) / 2;

        return (
          <mesh
            key={wall.id}
            position={[centerX, room.height / 2, centerZ]}
            rotation={[0, rotationY, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[length, room.height, 0.1]} />
            <meshStandardMaterial color={index % 2 === 0 ? "#6f7f91" : "#5d6b7c"} />
          </mesh>
        );
      })}

      {room.openings.map((opening) => {
        const transform = getOpeningSceneTransform(room, opening, 0.1);

        return (
          <group
            key={opening.id}
            position={[
              transform.position.x,
              transform.position.y,
              transform.position.z,
            ]}
            rotation={[0, transform.rotationY, 0]}
          >
            <PreviewOpeningVisual opening={opening} roomHeight={room.height} />
          </group>
        );
      })}
    </group>
  );
}

export function MobileRoomViewportPreview({
  locale,
  purpose,
}: {
  locale: "tr" | "en";
  purpose: RoomPurpose;
}) {
  const roomData = useMemo(() => createRoomPreset("rectangle", purpose), [purpose]);
  const purposeLabel =
    roomPurposeOptions.find((option) => option.id === purpose)?.label[locale] ??
    roomData.room.label;
  const roomOffset = useMemo(
    () => [-roomData.room.width / 2, 0, -roomData.room.depth / 2] as const,
    [roomData.room.depth, roomData.room.width],
  );
  const footprintLabel = `${roomData.room.width.toFixed(1)}m x ${roomData.room.depth.toFixed(1)}m`;
  const openingCount = roomData.room.openings.length;
  const overheadObjects = roomData.objects.filter(
    (object) =>
      String(object.params.baseShape ?? "") === "ceiling_light" ||
      typeof object.params.mountHeight === "number",
  ).length;
  const stageStats =
    locale === "en"
      ? `${roomData.objects.length} items · ${openingCount} openings`
      : `${roomData.objects.length} öğe · ${openingCount} açıklık`;
  const stageMeta =
    locale === "en"
      ? `${footprintLabel} · ${overheadObjects} wall/ceiling`
      : `${footprintLabel} · ${overheadObjects} duvar/tavan`;
  const gestureHint =
    locale === "en"
      ? "Drag to orbit · pinch to zoom"
      : "Surukle ve dondur · pinch ile zoom";

  return (
    <article className="mobile-room-preview">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f1b375]">
            {locale === "en" ? "Default room" : "Hazır oda"}
          </div>
          <h2 className="mt-1 text-base font-semibold tracking-[-0.02em] text-white">
            {purposeLabel}
          </h2>
        </div>
        <div className="rounded-full border border-white/10 bg-white/7 px-2.5 py-1 text-[10px] font-semibold text-slate-300">
          {locale === "en" ? "3D viewport" : "3D viewport"}
        </div>
      </div>

      <div className="mobile-room-stage mt-3">
        <div className="mobile-room-stage-hud">
          <div className="mobile-room-stage-chip">
            {locale === "en" ? "Scene preview" : "Sahne önizleme"}
          </div>
          <div className="mobile-room-stage-chip mobile-room-stage-chip--muted">
            {footprintLabel}
          </div>
        </div>

        <Canvas
          className="mobile-room-stage-canvas"
          dpr={[1, 1.1]}
          frameloop="demand"
          gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
          shadows={false}
        >
          <PreviewCamera room={roomData.room} />
          <color attach="background" args={["#0a1017"]} />
          <fog attach="fog" args={["#0a1017", 8, 19]} />
          <ambientLight intensity={1.2} />
          <directionalLight color="#f7e4bc" intensity={1.7} position={[5.5, 7.2, 4.2]} />
          <directionalLight color="#87b7e1" intensity={0.6} position={[-4.5, 4.8, -3.8]} />
          <pointLight color="#ffcf97" intensity={0.35} position={[0, 3.2, 0]} />
          <group position={roomOffset}>
            <RoomFloor room={roomData.room} />
            <PreviewRoomWalls room={roomData.room} />
            {roomData.objects.map((object) => (
              <StaticRoomObject key={object.id} object={object} />
            ))}
          </group>
        </Canvas>

        <div className="mobile-room-stage-footer">
          <span>{gestureHint}</span>
          <span>{stageStats}</span>
          <span>{stageMeta}</span>
        </div>
      </div>
    </article>
  );
}
