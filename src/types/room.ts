export type RoomShape = "rectangle" | "square" | "l_shape" | "custom";

export type RoomPurpose =
  | "empty"
  | "living"
  | "kitchen"
  | "bedroom"
  | "kids"
  | "study"
  | "bathroom"
  | "dining"
  | "laundry"
  | "entry"
  | "balcony"
  | "dressing";

export type OpeningType = "door" | "window" | "balcony_door" | "radiator";

export type ObjectCategory =
  | "sofa"
  | "bed"
  | "table"
  | "chair"
  | "wardrobe"
  | "tv_unit"
  | "carpet"
  | "generic_box";

export type GeneratorName =
  | "SofaGenerator"
  | "BedGenerator"
  | "TableGenerator"
  | "ChairGenerator"
  | "WardrobeGenerator"
  | "TVUnitGenerator"
  | "CarpetGenerator"
  | "GenericObjectGenerator";

export type CameraMode = "orbit" | "top";

export type TransformMode = "select" | "translate" | "rotate";

export interface WallSegment {
  id: string;
  from: [number, number];
  to: [number, number];
  locked?: boolean;
}

export interface Opening {
  id: string;
  type: OpeningType;
  wallId: string;
  position: number;
  width: number;
  height?: number;
  sillHeight?: number;
  rotation?: number;
  clearDepth?: number;
  locked?: boolean;
}

export interface RoomDefinition {
  id: string;
  label: string;
  labelKey: string;
  shape: RoomShape;
  purpose: RoomPurpose;
  width: number;
  depth: number;
  height: number;
  cutoutWidth: number;
  cutoutDepth: number;
  walls: WallSegment[];
  openings: Opening[];
}

export interface RoomObjectDimensions {
  width: number;
  depth: number;
  height: number;
}

export type ObjectParams = Record<string, string | number | boolean>;

export interface RoomObject {
  id: string;
  label: string;
  labelKey: string;
  category: ObjectCategory;
  generator: GeneratorName;
  position: {
    x: number;
    z: number;
  };
  rotation: number;
  dimensions: RoomObjectDimensions;
  color: string;
  movable: boolean;
  locked: boolean;
  params: ObjectParams;
}

export interface RoomObjectGroup {
  id: string;
  label: string;
  objectIds: string[];
}

export interface RoomConstraints {
  keepWindowClear: boolean;
  keepDoorClear: boolean;
  keepRadiatorClear: boolean;
  minWalkwayWidth: number;
}

export interface RoomData {
  room: RoomDefinition;
  objects: RoomObject[];
  groups?: RoomObjectGroup[];
  constraints: RoomConstraints;
  notes?: string[];
}

export interface LayoutObjectUpdate {
  id: string;
  x: number;
  z: number;
  rotation: number;
}

export interface LayoutResponse {
  layoutName: string;
  summary: string;
  objects: LayoutObjectUpdate[];
  constraintsRespected: string[];
  warnings: string[];
}

export interface LayoutWarning {
  code: string;
  level: "warning" | "error";
  message: string;
  objectId?: string;
  relatedObjectId?: string;
}
