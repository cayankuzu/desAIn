import { TransformControls } from "@react-three/drei";
import type { Object3D } from "three";
import type { TransformMode } from "@/types/room";

interface ObjectControlsProps {
  object: Object3D | null;
  enabled: boolean;
  mode: TransformMode;
  onBegin: () => void;
  onEnd: () => void;
  onObjectChange: () => void;
}

export function ObjectControls({
  object,
  enabled,
  mode,
  onBegin,
  onEnd,
  onObjectChange,
}: ObjectControlsProps) {
  if (!enabled || !object) {
    return null;
  }

  return (
    <TransformControls
      object={object}
      mode={mode}
      translationSnap={0.1}
      rotationSnap={Math.PI / 12}
      showX={mode === "translate"}
      showY={mode === "rotate"}
      showZ={mode === "translate"}
      onMouseDown={onBegin}
      onMouseUp={onEnd}
      onObjectChange={onObjectChange}
    />
  );
}
