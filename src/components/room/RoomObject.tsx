"use client";

import { useState } from "react";
import type { Group } from "three";
import { generatorMap } from "@/lib/room/generatorMap";
import { clampObjectPositionToRoom, normalizeRotation } from "@/lib/room/constraints";
import { useRoomStore } from "@/store/roomStore";
import type { RoomData, RoomObject as RoomObjectType } from "@/types/room";
import { ObjectControls } from "./ObjectControls";

interface RoomObjectProps {
  object: RoomObjectType;
  roomData: RoomData;
  isSelected: boolean;
}

export function RoomObject({ object, roomData, isSelected }: RoomObjectProps) {
  const [groupObject, setGroupObject] = useState<Group | null>(null);
  const Generator = generatorMap[object.generator];
  const transformMode = useRoomStore((state) => state.transformMode);
  const beginTransform = useRoomStore((state) => state.beginTransform);
  const endTransform = useRoomStore((state) => state.endTransform);
  const setSelectedObjectId = useRoomStore((state) => state.setSelectedObjectId);
  const updateObjectTransform = useRoomStore((state) => state.updateObjectTransform);

  const syncFromScene = () => {
    if (!groupObject) {
      return;
    }

    const rawRotation = normalizeRotation(
      (groupObject.rotation.y * 180) / Math.PI,
    );
    const clamped = clampObjectPositionToRoom(
      roomData,
      object,
      { x: groupObject.position.x, z: groupObject.position.z },
      rawRotation,
    );

    groupObject.position.set(clamped.x, 0, clamped.z);
    groupObject.rotation.set(0, (rawRotation * Math.PI) / 180, 0);
    updateObjectTransform(object.id, {
      position: clamped,
      rotation: rawRotation,
    });
  };

  return (
    <>
      <ObjectControls
        object={groupObject}
        enabled={isSelected && object.movable && !object.locked}
        mode={transformMode}
        onBegin={() => beginTransform(object.id)}
        onEnd={endTransform}
        onObjectChange={syncFromScene}
      />
      <group
        ref={setGroupObject}
        position={[object.position.x, 0, object.position.z]}
        rotation={[0, (object.rotation * Math.PI) / 180, 0]}
        onClick={(event) => {
          event.stopPropagation();
          setSelectedObjectId(object.id);
        }}
      >
        <Generator object={object} selected={isSelected} />
        {isSelected ? (
          <mesh
            position={[0, object.dimensions.height / 2, 0]}
            renderOrder={20}
          >
            <boxGeometry
              args={[
                object.dimensions.width + 0.14,
                object.dimensions.height + 0.06,
                object.dimensions.depth + 0.14,
              ]}
            />
            <meshBasicMaterial color="#d36c3d" wireframe transparent opacity={0.72} />
          </mesh>
        ) : null}
      </group>
    </>
  );
}
