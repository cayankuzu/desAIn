"use client";

import { useCallback } from "react";
import type { Group } from "three";
import { generatorMap } from "@/lib/room/generatorMap";
import { useRoomStore } from "@/store/roomStore";
import { useUIStore } from "@/store/uiStore";
import type { RoomObject as RoomObjectType } from "@/types/room";

interface RoomObjectProps {
  object: RoomObjectType;
  isSelected: boolean;
  onObjectReady: (objectId: string, node: Group | null) => void;
}

export function RoomObject({
  object,
  isSelected,
  onObjectReady,
}: RoomObjectProps) {
  const Generator = generatorMap[object.generator];
  const setSelectedObjectId = useRoomStore((state) => state.setSelectedObjectId);
  const setActiveSidebarTab = useUIStore((state) => state.setActiveSidebarTab);
  const setSelectedStructure = useUIStore((state) => state.setSelectedStructure);
  const handleRef = useCallback(
    (node: Group | null) => {
      onObjectReady(object.id, node);
    },
    [object.id, onObjectReady],
  );
  const mountHeight =
    typeof object.params.mountHeight === "number"
      ? object.params.mountHeight
      : 0;

  return (
    <group
      ref={handleRef}
      position={[object.position.x, mountHeight, object.position.z]}
      rotation={[0, (object.rotation * Math.PI) / 180, 0]}
      onClick={(event) => {
        event.stopPropagation();
        setSelectedStructure(null);
        setSelectedObjectId(object.id);
        setActiveSidebarTab("details");
      }}
    >
      <Generator object={object} selected={isSelected} />
      {isSelected ? (
        <mesh position={[0, object.dimensions.height / 2, 0]} renderOrder={20}>
          <boxGeometry
            args={[
              object.dimensions.width + 0.14,
              object.dimensions.height + 0.06,
              object.dimensions.depth + 0.14,
            ]}
          />
          <meshBasicMaterial
            color="#ff8c42"
            wireframe
            transparent
            opacity={0.82}
          />
        </mesh>
      ) : null}
    </group>
  );
}
