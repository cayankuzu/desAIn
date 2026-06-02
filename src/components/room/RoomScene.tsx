"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ContactShadows, GizmoHelper, GizmoViewport } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Plane, Vector2, Vector3, type Group } from "three";
import {
  clampObjectPositionToRoom,
  getWallAttachedObjectTransform,
  isWallAttachedObject,
  normalizeRotation,
} from "@/lib/room/constraints";
import {
  getOpeningHeight,
  getOpeningSceneTransform,
} from "@/lib/room/openingPlacement";
import {
  findWallByRotation,
  getWallMetrics,
  getWallSegment,
  isOpeningLocked,
  isWallLocked,
  normalizeOpeningForRoom,
  projectPointToWall,
} from "@/lib/room/roomGeometry";
import { useRoomStore } from "@/store/roomStore";
import { useUIStore } from "@/store/uiStore";
import { CameraControls } from "./CameraControls";
import { ObjectControls } from "./ObjectControls";
import { RoomFloor } from "./RoomFloor";
import { RoomObject } from "./RoomObject";
import { RoomWalls } from "./RoomWalls";
import type { RoomObject as RoomObjectType } from "@/types/room";

interface RoomSceneProps {
  previewObject?: RoomObjectType | null;
  presentationMode?: boolean;
  cameraResetToken?: number;
  onViewportRoomPositionResolverChange?: (
    resolver: ViewportRoomPositionResolver | null,
  ) => void;
}

export type ViewportRoomPositionResolver = (
  clientX: number,
  clientY: number,
  bounds: DOMRect,
) => RoomObjectType["position"] | null;

const getSignedRotationDelta = (from: number, to: number) => {
  const delta = (to - from + 540) % 360 - 180;

  return delta === -180 ? 180 : delta;
};

const getSceneRotationDegrees = (rotationY: number) =>
  normalizeRotation((rotationY * 180) / Math.PI);

function ViewportRoomPositionProbe({
  roomDepth,
  roomWidth,
  onResolverChange,
}: {
  roomDepth: number;
  roomWidth: number;
  onResolverChange?: (resolver: ViewportRoomPositionResolver | null) => void;
}) {
  const { camera, raycaster } = useThree();

  useEffect(() => {
    if (!onResolverChange) {
      return;
    }

    const pointer = new Vector2();
    const floorPlane = new Plane(new Vector3(0, 1, 0), 0);
    const intersection = new Vector3();

    onResolverChange((clientX, clientY, bounds) => {
      pointer.x = ((clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -(((clientY - bounds.top) / bounds.height) * 2 - 1);
      raycaster.setFromCamera(pointer, camera);

      const hit = raycaster.ray.intersectPlane(floorPlane, intersection);

      if (!hit) {
        return null;
      }

      return {
        x: intersection.x + roomWidth / 2,
        z: intersection.z + roomDepth / 2,
      };
    });

    return () => onResolverChange(null);
  }, [camera, onResolverChange, raycaster, roomDepth, roomWidth]);

  return null;
}

export function RoomScene({
  previewObject = null,
  presentationMode = false,
  cameraResetToken = 0,
  onViewportRoomPositionResolverChange,
}: RoomSceneProps) {
  const roomData = useRoomStore((state) => state.roomData);
  const selectedObjectId = useRoomStore((state) => state.selectedObjectId);
  const selectedObjectIds = useRoomStore((state) => state.selectedObjectIds);
  const cameraMode = useRoomStore((state) => state.cameraMode);
  const transformMode = useRoomStore((state) => state.transformMode);
  const beginTransform = useRoomStore((state) => state.beginTransform);
  const beginStructureTransform = useRoomStore((state) => state.beginStructureTransform);
  const endTransform = useRoomStore((state) => state.endTransform);
  const updateObjectTransform = useRoomStore((state) => state.updateObjectTransform);
  const updateOpeningTransform = useRoomStore((state) => state.updateOpeningTransform);
  const updateWallSegment = useRoomStore((state) => state.updateWallSegment);
  const setSelectedObjectId = useRoomStore((state) => state.setSelectedObjectId);
  const selectedStructure = useUIStore((state) => state.selectedStructure);
  const setSelectedStructure = useUIStore((state) => state.setSelectedStructure);
  const setMultiSelectMenu = useUIStore((state) => state.setMultiSelectMenu);
  const [isTransforming, setIsTransforming] = useState(false);
  const [objectMap, setObjectMap] = useState<Record<string, Group | null>>({});
  const [wallMap, setWallMap] = useState<Record<string, Group | null>>({});
  const [openingMap, setOpeningMap] = useState<Record<string, Group | null>>({});
  const objectRotationTransformRef = useRef<{
    objectId: string;
    sceneRotation: number;
    storedRotation: number;
  } | null>(null);
  const selectionEnabled = !presentationMode;
  const effectiveCameraMode = presentationMode ? "orbit" : cameraMode;

  const selectedObject =
    roomData.objects.find((object) => object.id === selectedObjectId) ?? null;
  const selectedSceneObject = selectedObjectId ? objectMap[selectedObjectId] ?? null : null;
  const selectedOpening =
    selectedStructure?.type === "opening"
      ? roomData.room.openings.find((opening) => opening.id === selectedStructure.id) ?? null
      : null;
  const selectedWall =
    selectedStructure?.type === "wall"
      ? roomData.room.walls.find((wall) => wall.id === selectedStructure.id) ?? null
      : null;
  const selectedSceneOpening = selectedOpening ? openingMap[selectedOpening.id] ?? null : null;
  const selectedSceneWall = selectedWall ? wallMap[selectedWall.id] ?? null : null;

  const canTransform = Boolean(
    selectionEnabled &&
    selectedObject &&
      selectedSceneObject &&
      selectedObject.movable &&
      !selectedObject.locked &&
      transformMode !== "select",
  );
  const canTransformOpening = Boolean(
    selectionEnabled &&
    selectedOpening &&
      selectedSceneOpening &&
      !isOpeningLocked(selectedOpening) &&
      transformMode !== "select",
  );
  const canTransformWall = Boolean(
    selectionEnabled &&
    selectedWall &&
      selectedSceneWall &&
      !isWallLocked(selectedWall) &&
      transformMode !== "select",
  );
  const cameraLockedForRotation = Boolean(
    selectionEnabled &&
    transformMode === "rotate" &&
    (selectedObject || selectedOpening || selectedWall || selectedObjectIds.length > 0),
  );

  const roomOffset = useMemo(
    () => [-roomData.room.width / 2, 0, -roomData.room.depth / 2] as const,
    [roomData.room.depth, roomData.room.width],
  );
  const handleObjectReady = useCallback((objectId: string, node: Group | null) => {
    setObjectMap((current) =>
      current[objectId] === node
        ? current
        : {
            ...current,
            [objectId]: node,
          },
    );
  }, []);
  const handleWallReady = useCallback((wallId: string, node: Group | null) => {
    setWallMap((current) =>
      current[wallId] === node
        ? current
        : {
            ...current,
            [wallId]: node,
          },
    );
  }, []);
  const handleOpeningReady = useCallback((openingId: string, node: Group | null) => {
    setOpeningMap((current) =>
      current[openingId] === node
        ? current
        : {
            ...current,
            [openingId]: node,
          },
    );
  }, []);

  const syncSelectedFromScene = () => {
    if (!selectedSceneObject || !selectedObject) {
      return;
    }

    const rotateOnly = transformMode === "rotate";
    const mountHeight =
      typeof selectedObject.params.mountHeight === "number"
        ? selectedObject.params.mountHeight
        : 0;
    const isWallObject = isWallAttachedObject(selectedObject);
    const nextMountHeight = isWallObject
      ? Math.min(
          Math.max(0, selectedSceneObject.position.y),
          Math.max(0, roomData.room.height - selectedObject.dimensions.height),
        )
      : mountHeight;
    const sceneRotation = getSceneRotationDegrees(selectedSceneObject.rotation.y);
    const rotationTransform = objectRotationTransformRef.current;
    const nextRotation =
      rotateOnly &&
      rotationTransform &&
      rotationTransform.objectId === selectedObject.id
        ? normalizeRotation(
            rotationTransform.storedRotation +
              getSignedRotationDelta(rotationTransform.sceneRotation, sceneRotation),
          )
        : sceneRotation;

    if (
      rotateOnly &&
      rotationTransform &&
      rotationTransform.objectId === selectedObject.id
    ) {
      rotationTransform.sceneRotation = sceneRotation;
      rotationTransform.storedRotation = nextRotation;
    }
    const desiredPosition = {
      x: rotateOnly ? selectedObject.position.x : selectedSceneObject.position.x,
      z: rotateOnly ? selectedObject.position.z : selectedSceneObject.position.z,
    };

    if (isWallObject) {
      const objectForPlacement = {
        ...selectedObject,
        params: {
          ...selectedObject.params,
          mountHeight: nextMountHeight,
        },
      };
      const placement = getWallAttachedObjectTransform(
        roomData,
        objectForPlacement,
        desiredPosition,
      );

      selectedSceneObject.position.set(
        placement.position.x,
        nextMountHeight,
        placement.position.z,
      );
      selectedSceneObject.rotation.set(0, (placement.rotation * Math.PI) / 180, 0);
      updateObjectTransform(selectedObject.id, {
        position: placement.position,
        rotation: placement.rotation,
        mountHeight: nextMountHeight,
      });
      return;
    }

    const clamped = clampObjectPositionToRoom(
      roomData,
      selectedObject,
      desiredPosition,
      nextRotation,
    );

    selectedSceneObject.position.set(clamped.x, nextMountHeight, clamped.z);
    selectedSceneObject.rotation.set(0, (nextRotation * Math.PI) / 180, 0);
    updateObjectTransform(selectedObject.id, {
      position: clamped,
      rotation: nextRotation,
      mountHeight: nextMountHeight,
    });
  };

  const syncSelectedOpeningFromScene = () => {
    if (!selectedOpening || !selectedSceneOpening) {
      return;
    }

    const rotateOnly = transformMode === "rotate";
    const currentOpeningTransform = getOpeningSceneTransform(roomData.room, selectedOpening);
    const openingHeight = getOpeningHeight(selectedOpening, roomData.room.height);
    const nextSillHeight = Math.min(
      Math.max(0, selectedSceneOpening.position.y - openingHeight / 2),
      Math.max(0, roomData.room.height - openingHeight),
    );
    const rotationWall = findWallByRotation(roomData.room, selectedSceneOpening.rotation.y);
    const projection = projectPointToWall(
      roomData.room,
      {
        x: rotateOnly ? currentOpeningTransform.position.x : selectedSceneOpening.position.x,
        z: rotateOnly ? currentOpeningTransform.position.z : selectedSceneOpening.position.z,
      },
      rotationWall?.id ?? selectedOpening.wallId,
    );
    const wallId = projection?.wall.id ?? rotationWall?.id ?? selectedOpening.wallId;
    const wall = getWallSegment(roomData.room, wallId);
    const wallRotation =
      wall
        ? normalizeRotation((getWallMetrics(wall).rotationY * 180) / Math.PI)
        : selectedOpening.rotation;
    const projectedOpening = normalizeOpeningForRoom(roomData.room, {
      ...selectedOpening,
      wallId,
      position: projection?.along ?? selectedOpening.position,
      rotation: wallRotation,
      sillHeight: nextSillHeight,
    });
    const transform = getOpeningSceneTransform(roomData.room, projectedOpening);

    selectedSceneOpening.position.set(
      transform.position.x,
      transform.position.y,
      transform.position.z,
    );
    selectedSceneOpening.rotation.set(0, transform.rotationY, 0);
    updateOpeningTransform(selectedOpening.id, {
      position: {
        x: transform.position.x,
        z: transform.position.z,
      },
      rotationY: transform.rotationY,
      sillHeight: nextSillHeight,
    });
  };

  const syncSelectedWallFromScene = () => {
    if (!selectedWall || !selectedSceneWall || isWallLocked(selectedWall)) {
      return;
    }

    const wallLength = Math.max(0.8, getWallMetrics(selectedWall).length);
    const halfLength = wallLength / 2;
    const rotationY = selectedSceneWall.rotation.y;
    const directionX = Math.cos(rotationY);
    const directionZ = -Math.sin(rotationY);
    const centerX = selectedSceneWall.position.x;
    const centerZ = selectedSceneWall.position.z;
    const nextFrom = [
      Number((centerX - directionX * halfLength).toFixed(2)),
      Number((centerZ - directionZ * halfLength).toFixed(2)),
    ] as [number, number];
    const nextTo = [
      Number((centerX + directionX * halfLength).toFixed(2)),
      Number((centerZ + directionZ * halfLength).toFixed(2)),
    ] as [number, number];

    updateWallSegment(selectedWall.id, {
      from: nextFrom,
      to: nextTo,
    });
  };

  return (
    <Canvas
      shadows="percentage"
      gl={{ preserveDrawingBuffer: true }}
      camera={{ position: [6.4, 5.8, 6.4], fov: 40 }}
      onPointerMissed={() => {
        if (!selectionEnabled || transformMode !== "select") {
          return;
        }

        setSelectedStructure(null);
        setMultiSelectMenu(null);
        setSelectedObjectId(null);
      }}
    >
      <color attach="background" args={["#0b1016"]} />
      <ambientLight intensity={1.35} />
      <hemisphereLight args={["#e9f4ff", "#4c3828", 0.85]} />
      <directionalLight
        castShadow
        position={[8, 12, 6]}
        intensity={1.55}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-8, 8, -6]} intensity={0.72} color="#d8ecff" />
      <pointLight position={[0.8, 4.8, 0.8]} intensity={0.72} color="#7fb7ff" distance={18} />
      <pointLight position={[-2.4, 4.2, 2.2]} intensity={0.48} color="#ffbf8a" distance={18} />

      <ObjectControls
        object={selectedSceneObject}
        enabled={canTransform}
        mode={transformMode === "rotate" ? "rotate" : "translate"}
        onBegin={() => {
          if (!selectedObjectId || !selectedObject || !selectedSceneObject) {
            return;
          }

          objectRotationTransformRef.current =
            transformMode === "rotate"
              ? {
                  objectId: selectedObjectId,
                  sceneRotation: getSceneRotationDegrees(selectedSceneObject.rotation.y),
                  storedRotation: normalizeRotation(selectedObject.rotation),
                }
              : null;
          setIsTransforming(true);
          beginTransform(selectedObjectId);
        }}
        onEnd={() => {
          objectRotationTransformRef.current = null;
          setIsTransforming(false);
          endTransform();
        }}
        onObjectChange={syncSelectedFromScene}
        showTranslateY={selectedObject ? isWallAttachedObject(selectedObject) : false}
      />
      <ObjectControls
        object={selectedSceneOpening}
        enabled={canTransformOpening}
        mode={transformMode === "rotate" ? "rotate" : "translate"}
        onBegin={() => {
          if (!selectedOpening) {
            return;
          }

          setIsTransforming(true);
          beginStructureTransform(selectedOpening.id);
        }}
        onEnd={() => {
          setIsTransforming(false);
          endTransform();
        }}
        onObjectChange={syncSelectedOpeningFromScene}
        showTranslateY
      />
      <ObjectControls
        object={selectedSceneWall}
        enabled={canTransformWall}
        mode={transformMode === "rotate" ? "rotate" : "translate"}
        onBegin={() => {
          if (!selectedWall) {
            return;
          }

          setIsTransforming(true);
          beginStructureTransform(selectedWall.id);
        }}
        onEnd={() => {
          setIsTransforming(false);
          endTransform();
        }}
        onObjectChange={syncSelectedWallFromScene}
      />

      <group position={roomOffset}>
        <ViewportRoomPositionProbe
          roomDepth={roomData.room.depth}
          roomWidth={roomData.room.width}
          onResolverChange={onViewportRoomPositionResolverChange}
        />
        <RoomFloor room={roomData.room} />
        <RoomWalls
          room={roomData.room}
          onWallReady={handleWallReady}
          onOpeningReady={handleOpeningReady}
          interactive={selectionEnabled}
          showSelection={selectionEnabled}
        />
        {roomData.objects.map((object) => (
          <RoomObject
            key={object.id}
            object={object}
            isSelected={
              selectionEnabled &&
              (selectedObjectId === object.id || selectedObjectIds.includes(object.id))
            }
            onObjectReady={handleObjectReady}
            interactive={selectionEnabled}
            showSelection={selectionEnabled}
          />
        ))}
        {previewObject ? (
          <RoomObject
            key={previewObject.id}
            object={previewObject}
            isSelected={false}
            interactive={false}
            isGhost
            showSelection={false}
          />
        ) : null}
        <ContactShadows
          position={[roomData.room.width / 2, 0.01, roomData.room.depth / 2]}
          scale={Math.max(roomData.room.width, roomData.room.depth) * 1.2}
          blur={2.4}
          opacity={0.38}
          far={10}
        />
      </group>

      <CameraControls
        enabled={!isTransforming && !cameraLockedForRotation}
        mode={effectiveCameraMode}
        room={roomData.room}
        resetToken={cameraResetToken}
      />
      {presentationMode ? null : (
        <GizmoHelper alignment="bottom-left" margin={[72, 72]}>
          <GizmoViewport
            axisColors={["#ef4444", "#22c55e", "#3b82f6"]}
            labelColor="#f8fafc"
          />
        </GizmoHelper>
      )}
    </Canvas>
  );
}
