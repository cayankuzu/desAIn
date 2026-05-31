import type {
  Opening,
  RoomData,
  RoomDefinition,
  RoomShape,
} from "@/types/room";
import {
  buildRoomWalls,
  clampRoomHeight,
  clampRoomWidth,
  clampRoomDepth,
  getWallLength,
  normalizeOpeningForRoom,
  remapWallIdForShape,
  sanitizeShapeConfig,
} from "@/lib/room/roomGeometry";

const defaultOpenings: Opening[] = [
  {
    id: "door_1",
    type: "door",
    wallId: "wall_4",
    position: 1.2,
    width: 0.9,
    clearDepth: 0.9,
  },
  {
    id: "window_1",
    type: "window",
    wallId: "wall_2",
    position: 3,
    width: 1.3,
    clearDepth: 0.6,
  },
  {
    id: "radiator_1",
    type: "radiator",
    wallId: "wall_2",
    position: 1.2,
    width: 0.9,
    clearDepth: 0.45,
  },
];

export const resizeRoomDefinition = (
  room: RoomDefinition,
  payload: {
    shape?: RoomShape;
    width?: number;
    depth?: number;
    height?: number;
    cutoutWidth?: number;
    cutoutDepth?: number;
  },
): RoomDefinition => {
  const nextShape = payload.shape ?? room.shape;
  let nextWidth = payload.width ?? room.width;
  let nextDepth = payload.depth ?? room.depth;
  const nextHeight = payload.height ?? room.height;

  if (nextShape === "square") {
    if (payload.width !== undefined) {
      nextDepth = payload.width;
    } else if (payload.depth !== undefined) {
      nextWidth = payload.depth;
    } else {
      nextDepth = nextWidth;
    }
  }

  const width = clampRoomWidth(nextWidth);
  const depth = clampRoomDepth(nextDepth);
  const height = clampRoomHeight(nextHeight);
  const safeShape = nextShape === "square" ? "square" : nextShape;
  const shapeConfig = sanitizeShapeConfig(
    safeShape,
    width,
    depth,
    payload.cutoutWidth ?? room.cutoutWidth,
    payload.cutoutDepth ?? room.cutoutDepth,
  );
  const nextRoom: RoomDefinition = {
    ...room,
    shape: safeShape,
    width: shapeConfig.width,
    depth: shapeConfig.depth,
    height,
    cutoutWidth: shapeConfig.cutoutWidth,
    cutoutDepth: shapeConfig.cutoutDepth,
    walls: buildRoomWalls(
      safeShape,
      shapeConfig.width,
      shapeConfig.depth,
      shapeConfig.cutoutWidth,
      shapeConfig.cutoutDepth,
    ),
    openings: [],
  };

  const openings = room.openings.map((opening) => {
    const previousWallLength = getWallLength(room, opening.wallId);
    const nextWallId = remapWallIdForShape(nextRoom.shape, opening.wallId);
    const nextWallLength = getWallLength(nextRoom, nextWallId);
    const ratio = previousWallLength > 0 ? opening.position / previousWallLength : 0.5;

    return normalizeOpeningForRoom(nextRoom, {
      ...opening,
      wallId: nextWallId,
      position: ratio * nextWallLength,
    });
  });

  return {
    ...nextRoom,
    openings,
  };
};

const room: RoomDefinition = {
  id: "room_demo",
  label: "Studio Loft",
  labelKey: "room.studioLoft",
  shape: "rectangle",
  width: 7.2,
  depth: 5.2,
  height: 2.8,
  cutoutWidth: 2.2,
  cutoutDepth: 1.6,
  walls: buildRoomWalls("rectangle", 7.2, 5.2, 2.2, 1.6),
  openings: defaultOpenings,
};

export const defaultRoom: RoomData = {
  room,
  constraints: {
    keepWindowClear: true,
    keepDoorClear: true,
    keepRadiatorClear: true,
    minWalkwayWidth: 0.7,
  },
  notes: [
    "Low-poly editor demo room.",
    "Scene uses procedural furniture generators and editable JSON state.",
  ],
  objects: [
    {
      id: "tv_unit_1",
      label: "TV Unit",
      labelKey: "object.tvUnit",
      category: "tv_unit",
      generator: "TVUnitGenerator",
      position: { x: 2.1, z: 0.36 },
      rotation: 0,
      dimensions: { width: 1.7, depth: 0.44, height: 1.25 },
      color: "#b37455",
      movable: true,
      locked: false,
      params: {
        shelves: 2,
        screenRatio: "wide",
      },
    },
    {
      id: "sofa_1",
      label: "Sofa",
      labelKey: "object.sofa",
      category: "sofa",
      generator: "SofaGenerator",
      position: { x: 2.2, z: 4.45 },
      rotation: 180,
      dimensions: { width: 2.3, depth: 0.95, height: 0.86 },
      color: "#6b776e",
      movable: true,
      locked: false,
      params: {
        shape: "straight",
        cushionCount: 3,
        hasArmrests: true,
      },
    },
    {
      id: "carpet_1",
      label: "Carpet",
      labelKey: "object.carpet",
      category: "carpet",
      generator: "CarpetGenerator",
      position: { x: 2.2, z: 2.78 },
      rotation: 0,
      dimensions: { width: 2.4, depth: 1.8, height: 0.03 },
      color: "#d8c3a0",
      movable: true,
      locked: false,
      params: {
        border: true,
      },
    },
    {
      id: "bed_1",
      label: "Bed",
      labelKey: "object.bed",
      category: "bed",
      generator: "BedGenerator",
      position: { x: 5.22, z: 3.72 },
      rotation: 90,
      dimensions: { width: 1.6, depth: 2.05, height: 1.05 },
      color: "#d4a76f",
      movable: true,
      locked: false,
      params: {
        pillows: 2,
        headboard: true,
      },
    },
    {
      id: "wardrobe_1",
      label: "Wardrobe",
      labelKey: "object.wardrobe",
      category: "wardrobe",
      generator: "WardrobeGenerator",
      position: { x: 5.82, z: 0.42 },
      rotation: 0,
      dimensions: { width: 1.35, depth: 0.72, height: 2.3 },
      color: "#c9b396",
      movable: true,
      locked: false,
      params: {
        doorCount: 3,
        mirrored: false,
      },
    },
    {
      id: "table_1",
      label: "Desk",
      labelKey: "object.desk",
      category: "table",
      generator: "TableGenerator",
      position: { x: 6.1, z: 2.02 },
      rotation: 270,
      dimensions: { width: 1.15, depth: 0.6, height: 0.76 },
      color: "#9d6d4a",
      movable: true,
      locked: false,
      params: {
        legStyle: "straight",
        thickness: "medium",
      },
    },
    {
      id: "chair_1",
      label: "Chair",
      labelKey: "object.chair",
      category: "chair",
      generator: "ChairGenerator",
      position: { x: 5.35, z: 2.02 },
      rotation: 270,
      dimensions: { width: 0.52, depth: 0.52, height: 0.92 },
      color: "#51727a",
      movable: true,
      locked: false,
      params: {
        hasBackrest: true,
      },
    },
    {
      id: "generic_1",
      label: "Storage Box",
      labelKey: "object.storageBox",
      category: "generic_box",
      generator: "GenericObjectGenerator",
      position: { x: 0.88, z: 0.56 },
      rotation: 0,
      dimensions: { width: 0.58, depth: 0.42, height: 0.46 },
      color: "#8a7a6f",
      movable: true,
      locked: false,
      params: {
        baseShape: "box",
      },
    },
    {
      id: "framed_art_1",
      label: "Framed Art",
      labelKey: "object.framedArt",
      category: "generic_box",
      generator: "GenericObjectGenerator",
      position: { x: 4.8, z: 5.1 },
      rotation: 180,
      dimensions: { width: 0.9, depth: 0.08, height: 0.62 },
      color: "#7b614d",
      movable: true,
      locked: false,
      params: {
        baseShape: "wall_panel",
        mountHeight: 1.35,
      },
    },
    {
      id: "ac_1",
      label: "AC Unit",
      labelKey: "object.acUnit",
      category: "generic_box",
      generator: "GenericObjectGenerator",
      position: { x: 3.6, z: 0.2 },
      rotation: 0,
      dimensions: { width: 1.1, depth: 0.28, height: 0.34 },
      color: "#d6dde2",
      movable: true,
      locked: false,
      params: {
        baseShape: "wall_box",
        mountHeight: 2.12,
      },
    },
  ],
};
