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
  onObjectReady?: (objectId: string, node: Group | null) => void;
  interactive?: boolean;
  isGhost?: boolean;
  showSelection?: boolean;
}

export function RoomObject({
  object,
  isSelected,
  onObjectReady = () => {},
  interactive = true,
  isGhost = false,
  showSelection = true,
}: RoomObjectProps) {
  const Generator = generatorMap[object.generator];
  const setSelectedObjectId = useRoomStore((state) => state.setSelectedObjectId);
  const toggleObjectSelection = useRoomStore((state) => state.toggleObjectSelection);
  const selectedObjectIds = useRoomStore((state) => state.selectedObjectIds);
  const roomGroups = useRoomStore((state) => state.roomData.groups ?? []);
  const selectGroup = useRoomStore((state) => state.selectGroup);
  const setActiveSidebarTab = useUIStore((state) => state.setActiveSidebarTab);
  const setSelectedStructure = useUIStore((state) => state.setSelectedStructure);
  const setMultiSelectMenu = useUIStore((state) => state.setMultiSelectMenu);
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
  const objectGroup = roomGroups.find((group) => group.objectIds.includes(object.id)) ?? null;
  const showPrimarySelection = showSelection && isSelected && !isGhost;
  const showSecondarySelection =
    showSelection && !isSelected && selectedObjectIds.includes(object.id);

  return (
    <group
      ref={handleRef}
      position={[object.position.x, mountHeight, object.position.z]}
      rotation={[0, (object.rotation * Math.PI) / 180, 0]}
      onClick={
        interactive
          ? (event) => {
              event.stopPropagation();
              setSelectedStructure(null);
              const nativeEvent = event.nativeEvent;

              if (nativeEvent.ctrlKey || nativeEvent.metaKey) {
                toggleObjectSelection(object.id);
                setActiveSidebarTab("outliner");
                setMultiSelectMenu({
                  x: nativeEvent.clientX,
                  y: nativeEvent.clientY,
                });
                return;
              }

              setMultiSelectMenu(null);
              if (objectGroup) {
                selectGroup(objectGroup.id);
                setActiveSidebarTab("details");
                return;
              }

              setSelectedObjectId(object.id);
              setActiveSidebarTab("details");
            }
          : undefined
      }
    >
      <Generator object={object} selected={showPrimarySelection} />
      {isGhost ? (
        <>
          <mesh position={[0, 0.018, 0]} renderOrder={30}>
            <boxGeometry
              args={[
                object.dimensions.width + 0.08,
                0.035,
                object.dimensions.depth + 0.08,
              ]}
            />
            <meshBasicMaterial color="#4ea8ff" transparent opacity={0.28} />
          </mesh>
          <mesh position={[0, object.dimensions.height / 2, 0]} renderOrder={31}>
            <boxGeometry
              args={[
                object.dimensions.width + 0.1,
                object.dimensions.height + 0.06,
                object.dimensions.depth + 0.1,
              ]}
            />
            <meshBasicMaterial color="#4ea8ff" wireframe transparent opacity={0.78} />
          </mesh>
        </>
      ) : null}
      {showPrimarySelection ? (
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
      {showSecondarySelection ? (
        <mesh position={[0, object.dimensions.height / 2, 0]} renderOrder={19}>
          <boxGeometry
            args={[
              object.dimensions.width + 0.1,
              object.dimensions.height + 0.04,
              object.dimensions.depth + 0.1,
            ]}
          />
          <meshBasicMaterial color="#4ea8ff" wireframe transparent opacity={0.62} />
        </mesh>
      ) : null}
    </group>
  );
}
