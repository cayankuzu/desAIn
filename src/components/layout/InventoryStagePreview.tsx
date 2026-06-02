"use client";

import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import type { Locale } from "@/lib/i18n/translations";
import { generatorMap } from "@/lib/room/generatorMap";
import { getMountHeight, isWallAttachedObject } from "@/lib/room/constraints";
import type { InventoryTemplate } from "@/lib/room/inventoryCatalog";
import type { RoomObject } from "@/types/room";

const buildPreviewObject = (item: InventoryTemplate): RoomObject => ({
  id: `inventory_preview_${item.id}`,
  label: item.label,
  labelKey: item.labelKey,
  category: item.category,
  generator: item.generator,
  position: { x: 0, z: 0 },
  rotation: item.rotation ?? 0,
  dimensions: { ...item.dimensions },
  color: item.color,
  movable: false,
  locked: true,
  params: { ...item.params },
});

export function InventoryStagePreview({
  item,
  locale,
}: {
  item: InventoryTemplate | null;
  locale: Locale;
}) {
  const previewObject = useMemo(
    () => (item ? buildPreviewObject(item) : null),
    [item],
  );

  if (!previewObject || !item) {
    return null;
  }

  const Generator = generatorMap[previewObject.generator];
  const mountHeight = getMountHeight(previewObject);
  const baseShape = String(previewObject.params.baseShape ?? "");
  const wallAttached =
    isWallAttachedObject(previewObject) ||
    item.previewType === "window" ||
    item.previewType === "door";
  const ceilingMounted = baseShape === "ceiling_light";
  const maxSpan = Math.max(
    previewObject.dimensions.width,
    previewObject.dimensions.depth,
    previewObject.dimensions.height,
  );
  const floorSize = Math.max(2.65, maxSpan * 2.1);
  const wallWidth = Math.max(2.2, previewObject.dimensions.width * 2.15);
  const wallHeight = Math.max(2.2, mountHeight + previewObject.dimensions.height + 0.55);
  const targetY = wallAttached || ceilingMounted
    ? mountHeight + previewObject.dimensions.height * 0.46
    : Math.max(0.38, previewObject.dimensions.height * 0.34);
  const cameraDistance = wallAttached
    ? Math.max(2.15, maxSpan * 1.95)
    : Math.max(1.8, maxSpan * 1.58);
  const cameraHeight = wallAttached || ceilingMounted
    ? Math.max(1.52, targetY + previewObject.dimensions.height * 0.18)
    : Math.max(1.05, previewObject.dimensions.height * 1.02);
  const title = locale === "en" ? "Live Preview" : "Canl\u0131 \u00d6n \u0130zleme";
  const dragHint = locale === "en" ? "Drag to orbit" : "S\u00fcr\u00fckleyerek incele";

  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-[radial-gradient(circle_at_18%_10%,rgba(78,168,255,0.2),transparent_26%),radial-gradient(circle_at_82%_12%,rgba(255,179,108,0.16),transparent_24%),linear-gradient(180deg,#101821,#0c131b)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8cb9ff]">
            {title}
          </div>
          <div className="mt-1 text-sm font-semibold text-white">{item.label}</div>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
          {dragHint}
        </div>
      </div>

      <div className="h-64">
        <Canvas
          camera={{
            position: [cameraDistance, cameraHeight, cameraDistance],
            fov: wallAttached || ceilingMounted ? 30 : 28,
          }}
        >
          <color attach="background" args={["#0c131b"]} />
          <ambientLight intensity={1.15} />
          <hemisphereLight args={["#e8f2ff", "#493524", 0.9]} />
          <directionalLight castShadow position={[4.8, 6.4, 4.2]} intensity={1.35} />
          <directionalLight position={[-4.2, 4.2, -2.6]} intensity={0.55} color="#d7e9ff" />

          <group>
            <mesh rotation-x={-Math.PI / 2} receiveShadow>
              <planeGeometry args={[floorSize, floorSize]} />
              <meshStandardMaterial color="#1a2430" roughness={0.92} />
            </mesh>
            <mesh
              rotation-x={-Math.PI / 2}
              position={[0, 0.01, 0]}
              receiveShadow
            >
              <ringGeometry args={[floorSize * 0.22, floorSize * 0.48, 40]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.08} />
            </mesh>

            {wallAttached || ceilingMounted ? (
              <mesh
                position={[0, wallHeight / 2, -Math.max(previewObject.dimensions.depth * 0.52, 0.2)]}
                receiveShadow
              >
                <planeGeometry args={[wallWidth, wallHeight]} />
                <meshStandardMaterial color="#182330" roughness={0.88} />
              </mesh>
            ) : null}

            {ceilingMounted ? (
              <mesh rotation-x={Math.PI / 2} position={[0, wallHeight - 0.05, 0]} receiveShadow>
                <planeGeometry args={[wallWidth, wallWidth]} />
                <meshStandardMaterial color="#202c39" roughness={0.82} />
              </mesh>
            ) : null}

            <group position={[0, mountHeight, 0]}>
              <Generator object={previewObject} selected={false} />
            </group>

            <ContactShadows
              position={[0, 0.01, 0]}
              scale={floorSize * 0.66}
              blur={2.8}
              opacity={0.34}
              far={8}
            />
          </group>

          <OrbitControls
            makeDefault
            enablePan={false}
            enableDamping
            dampingFactor={0.08}
            autoRotate
            autoRotateSpeed={0.55}
            minDistance={Math.max(1.55, cameraDistance * 0.68)}
            maxDistance={Math.max(3.7, cameraDistance * 1.32)}
            minPolarAngle={0.5}
            maxPolarAngle={1.36}
            target={[0, targetY, 0]}
          />
        </Canvas>
      </div>
    </div>
  );
}
