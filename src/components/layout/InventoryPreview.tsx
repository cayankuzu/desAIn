"use client";

import { ContactShadows, PerspectiveCamera, View } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import type {
  ComponentProps,
  ComponentType,
  HTMLAttributes,
  KeyboardEvent,
  PointerEvent,
  ReactNode,
  WheelEvent,
} from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { InventoryTemplate } from "@/lib/room/inventoryCatalog";
import { getMountHeight, isWallAttachedObject } from "@/lib/room/constraints";
import { generatorMap } from "@/lib/room/generatorMap";
import type { RoomObject } from "@/types/room";

const shellClass =
  "relative h-24 w-full touch-none overflow-hidden rounded-xl border border-white/10 bg-[radial-gradient(circle_at_34%_18%,rgba(140,185,255,0.22),transparent_34%),linear-gradient(180deg,#162131_0%,#0d141d_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]";
const viewTrackClass = "absolute inset-0 touch-none cursor-grab active:cursor-grabbing";

type InteractiveViewProps = ComponentProps<typeof View> &
  HTMLAttributes<HTMLDivElement> & {
    as: "div";
    children: ReactNode;
  };

const InteractiveView = View as unknown as ComponentType<InteractiveViewProps>;

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

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function PreviewCameraRig({ targetY }: { targetY: number }) {
  const { camera, invalidate } = useThree();

  useEffect(() => {
    camera.lookAt(0, targetY, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, targetY]);

  return null;
}

function InventoryPreviewScene({
  item,
  rotationY,
  verticalOffset,
  zoom,
}: {
  item: InventoryTemplate;
  rotationY: number;
  verticalOffset: number;
  zoom: number;
}) {
  const previewObject = useMemo(() => buildPreviewObject(item), [item]);
  const Generator = generatorMap[previewObject.generator];

  if (!Generator) {
    return null;
  }

  const mountHeight = getMountHeight(previewObject);
  const baseShape = String(previewObject.params.baseShape ?? "");
  const wallMounted =
    isWallAttachedObject(previewObject) ||
    item.previewType === "window" ||
    item.previewType === "door" ||
    item.previewType === "wall";
  const ceilingMounted = baseShape === "ceiling_light";
  const maxSpan = Math.max(
    previewObject.dimensions.width,
    previewObject.dimensions.depth,
    previewObject.dimensions.height,
  );
  const floorSize = Math.max(2.2, maxSpan * 1.85);
  const cameraDistance =
    (wallMounted ? Math.max(2.2, maxSpan * 1.9) : Math.max(1.75, maxSpan * 1.45)) *
    zoom;
  const cameraHeight =
    wallMounted || ceilingMounted
      ? Math.max(1.38, mountHeight + previewObject.dimensions.height * 0.52)
      : Math.max(0.95, previewObject.dimensions.height * 0.95);
  const wallHeight = Math.max(
    1.85,
    mountHeight + previewObject.dimensions.height + 0.38,
  );
  const wallWidth = Math.max(1.9, previewObject.dimensions.width * 1.7);
  const objectLift = wallMounted || ceilingMounted ? mountHeight : 0;
  const cameraTargetY =
    wallMounted || ceilingMounted
      ? Math.max(0.72, objectLift + previewObject.dimensions.height * 0.48)
      : Math.max(0.24, previewObject.dimensions.height * 0.38);

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[cameraDistance, cameraHeight, cameraDistance]}
        fov={wallMounted || ceilingMounted ? 30 : 28}
      />
      <PreviewCameraRig targetY={cameraTargetY + verticalOffset * 0.25} />
      <color attach="background" args={["#0d141d"]} />
      <ambientLight intensity={1.16} />
      <hemisphereLight args={["#e8f2ff", "#493524", 0.82]} />
      <directionalLight position={[3.8, 5.4, 3.4]} intensity={1.26} />
      <directionalLight
        position={[-3.2, 3.2, -2]}
        intensity={0.5}
        color="#d7e9ff"
      />

      <group rotation={[0, rotationY - 0.58, 0]} position={[0, -0.04 + verticalOffset, 0]}>
        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[floorSize, floorSize]} />
          <meshStandardMaterial color="#162231" roughness={0.94} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0]} receiveShadow>
          <ringGeometry args={[floorSize * 0.19, floorSize * 0.46, 40]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.07} />
        </mesh>

        {wallMounted || ceilingMounted ? (
          <mesh
            position={[
              0,
              wallHeight / 2,
              -Math.max(previewObject.dimensions.depth * 0.58, 0.18),
            ]}
            receiveShadow
          >
            <planeGeometry args={[wallWidth, wallHeight]} />
            <meshStandardMaterial color="#182330" roughness={0.88} />
          </mesh>
        ) : null}

        <group position={[0, objectLift, 0]}>
          <Generator object={previewObject} selected={false} />
        </group>

        <ContactShadows
          position={[0, 0.012, 0]}
          scale={floorSize * 0.64}
          blur={2.6}
          opacity={0.32}
          far={7}
        />
      </group>
    </>
  );
}

export function InventoryPreviewCanvas() {
  return (
    <Canvas
      dpr={[1, 1.35]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      style={{
        height: "100vh",
        inset: 0,
        pointerEvents: "none",
        position: "fixed",
        width: "100vw",
        zIndex: 40,
      }}
      onCreated={({ gl }) => {
        gl.setClearAlpha(0);
      }}
    >
      <View.Port />
    </Canvas>
  );
}

export function InventoryPreview({
  item,
  index,
}: {
  item: InventoryTemplate;
  index: number;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [rotationY, setRotationY] = useState(0);
  const [verticalOffset, setVerticalOffset] = useState(0);
  const [zoom, setZoom] = useState(1);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startRotation: number;
    startVerticalOffset: number;
  } | null>(null);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startRotation: rotationY,
      startVerticalOffset: verticalOffset,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setRotationY(dragState.startRotation + (event.clientX - dragState.startX) * 0.012);
    setVerticalOffset(
      clamp(dragState.startVerticalOffset + (dragState.startY - event.clientY) * 0.004, -0.52, 0.74),
    );
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    dragStateRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setZoom((currentZoom) => clamp(currentZoom + event.deltaY * 0.0014, 0.72, 1.62));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      setRotationY((currentRotation) =>
        currentRotation + (event.key === "ArrowLeft" ? -0.18 : 0.18),
      );
    }

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      setVerticalOffset((currentOffset) =>
        clamp(currentOffset + (event.key === "ArrowUp" ? 0.08 : -0.08), -0.52, 0.74),
      );
    }

    if (event.key === "+" || event.key === "=" || event.key === "-") {
      event.preventDefault();
      setZoom((currentZoom) =>
        clamp(currentZoom + (event.key === "-" ? 0.08 : -0.08), 0.72, 1.62),
      );
    }
  };

  useEffect(() => {
    const shell = shellRef.current;

    if (!shell) {
      return;
    }

    const scrollRoot = shell.closest(".scroll-area");

    if (!scrollRoot) {
      setIsPreviewVisible(true);
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      const updateVisibility = () => {
        const shellRect = shell.getBoundingClientRect();
        const rootRect = scrollRoot.getBoundingClientRect();

        setIsPreviewVisible(
          shellRect.top >= rootRect.top &&
            shellRect.bottom <= rootRect.bottom &&
            shellRect.left >= rootRect.left &&
            shellRect.right <= rootRect.right,
        );
      };

      updateVisibility();
      scrollRoot.addEventListener("scroll", updateVisibility, { passive: true });
      window.addEventListener("resize", updateVisibility);

      return () => {
        scrollRoot.removeEventListener("scroll", updateVisibility);
        window.removeEventListener("resize", updateVisibility);
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsPreviewVisible(entry.intersectionRatio >= 0.92);
      },
      {
        root: scrollRoot,
        threshold: [0, 0.5, 0.92, 1],
      },
    );

    observer.observe(shell);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={shellRef} className={`${shellClass} group/preview`}>
      {isPreviewVisible ? (
        <InteractiveView
          as="div"
          className={viewTrackClass}
          frames={Infinity}
          index={index + 1}
          role="application"
          tabIndex={0}
          aria-label={`${item.label} live preview`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
        >
          <InventoryPreviewScene
            item={item}
            rotationY={rotationY}
            verticalOffset={verticalOffset}
            zoom={zoom}
          />
        </InteractiveView>
      ) : null}
      <div className="absolute left-4 top-4 z-10 h-2 w-2 rounded-full bg-white/25" />
      {isPreviewVisible ? (
        <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-full border border-[#4ea8ff]/40 bg-[#102234]/85 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#8cb9ff]">
          Live
        </div>
      ) : null}
      <div className="pointer-events-none absolute bottom-2 left-3 z-10 rounded-full bg-black/25 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-300 opacity-0 transition group-hover/preview:opacity-100">
        Drag to rotate
      </div>
    </div>
  );
}
