import { getInventoryTemplateById } from "@/lib/room/inventoryCatalog";
import { getRotatedHalfExtents } from "@/lib/room/collision";
import {
  clampObjectPositionToRoom,
  getWallAttachedObjectTransform,
  isWallAttachedObject,
  normalizeRotation,
} from "@/lib/room/constraints";
import {
  buildRoomWalls,
  clampRoomDepth,
  clampRoomHeight,
  clampRoomWidth,
  getWallLength,
  normalizeOpeningForRoom,
  sanitizeShapeConfig,
} from "@/lib/room/roomGeometry";
import { validateRoomLayout } from "@/lib/room/layoutValidator";
import type {
  Opening,
  RoomData,
  RoomDefinition,
  RoomObject,
  RoomPurpose,
  RoomShape,
} from "@/types/room";

type PresetLocale = "en" | "tr";

type PresetItem = {
  templateId: string;
  x: number;
  z: number;
  rotation?: number;
  wall?: "north" | "south" | "east" | "west";
  along?: number;
  dimensions?: Partial<RoomObject["dimensions"]>;
  color?: string;
  params?: RoomObject["params"];
  locked?: boolean;
};

export const roomPurposeOptions: Array<{
  id: RoomPurpose;
  label: Record<PresetLocale, string>;
  description: Record<PresetLocale, string>;
}> = [
  {
    id: "empty",
    label: { en: "Empty Room", tr: "Boş Oda" },
    description: {
      en: "Clean shell with openings only.",
      tr: "Yalnızca kapı, pencere ve net boş hacim.",
    },
  },
  {
    id: "living",
    label: { en: "Living Room", tr: "Salon" },
    description: {
      en: "Conversation zone, media wall, rug, lighting, and decor.",
      tr: "Oturma grubu, medya duvarı, halı, aydınlatma ve dekor.",
    },
  },
  {
    id: "kitchen",
    label: { en: "Kitchen", tr: "Mutfak" },
    description: {
      en: "Work triangle, island, appliances, and breakfast corner.",
      tr: "Çalışma üçgeni, ada, beyaz eşyalar ve küçük yemek köşesi.",
    },
  },
  {
    id: "bedroom",
    label: { en: "Bedroom", tr: "Yatak Odası" },
    description: {
      en: "Bed wall, wardrobes, nightstands, dresser, and mirror.",
      tr: "Yatak duvarı, gardırop, komodin, şifonyer ve ayna.",
    },
  },
  {
    id: "kids",
    label: { en: "Kids Room", tr: "Çocuk Odası" },
    description: {
      en: "Sleep, homework, storage, and play zones.",
      tr: "Uyku, ders, depolama ve oyun alanları.",
    },
  },
  {
    id: "study",
    label: { en: "Study", tr: "Çalışma Odası" },
    description: {
      en: "Focused desk wall, library, reading chair, and light.",
      tr: "Odaklı masa duvarı, kitaplık, okuma koltuğu ve ışık.",
    },
  },
  {
    id: "bathroom",
    label: { en: "Bathroom", tr: "Banyo" },
    description: {
      en: "Wet zone, vanity, toilet, towel rail, and mirror.",
      tr: "Islak alan, lavabo dolabı, klozet, havluluk ve ayna.",
    },
  },
  {
    id: "dining",
    label: { en: "Dining Room", tr: "Yemek Odası" },
    description: {
      en: "Central table, circulation, sideboard, and lighting.",
      tr: "Merkezi masa, dolaşım, konsol ve aydınlatma.",
    },
  },
  {
    id: "laundry",
    label: { en: "Laundry", tr: "Çamaşır Odası" },
    description: {
      en: "Washer/dryer wall, utility sink, cabinets, and folding counter.",
      tr: "Makine duvarı, yardımcı lavabo, dolaplar ve katlama tezgahı.",
    },
  },
  {
    id: "entry",
    label: { en: "Entry Hall", tr: "Antre / Hol" },
    description: {
      en: "Landing strip with shoe rack, console, mirror, and coat stand.",
      tr: "Ayakkabılık, dresuar, ayna ve askılık düzeni.",
    },
  },
  {
    id: "balcony",
    label: { en: "Balcony / Terrace", tr: "Balkon / Teras" },
    description: {
      en: "Compact sitting, plants, side storage, and relaxed circulation.",
      tr: "Kompakt oturma, bitkiler, depolama ve rahat dolaşım.",
    },
  },
  {
    id: "dressing",
    label: { en: "Dressing Room", tr: "Giyinme Odası" },
    description: {
      en: "Wardrobe run, dresser, mirror, and dressing bench.",
      tr: "Gardırop hattı, şifonyer, ayna ve giyinme bankı.",
    },
  },
];

const roomPurposeLabels = new Map(
  roomPurposeOptions.map((option) => [option.id, option.label]),
);

const baseDimensions: Record<
  RoomPurpose,
  { width: number; depth: number; height?: number }
> = {
  empty: { width: 5.8, depth: 4.4 },
  living: { width: 8, depth: 6 },
  kitchen: { width: 7.6, depth: 5.6 },
  bedroom: { width: 6.6, depth: 5.4 },
  kids: { width: 6.2, depth: 5 },
  study: { width: 5.8, depth: 4.6 },
  bathroom: { width: 5, depth: 4.2 },
  dining: { width: 6.8, depth: 5.4 },
  laundry: { width: 5.2, depth: 4.2 },
  entry: { width: 5.6, depth: 4.2 },
  balcony: { width: 5.4, depth: 3.8 },
  dressing: { width: 5.8, depth: 4.4 },
};

const getShapeDimensions = (shape: RoomShape, purpose: RoomPurpose) => {
  const base = baseDimensions[purpose];

  if (shape === "square") {
    const size = Math.max(base.width, base.depth, 4.8);

    return {
      width: size,
      depth: size,
      height: base.height ?? 2.8,
      cutoutWidth: 0,
      cutoutDepth: 0,
    };
  }

  if (shape === "l_shape") {
    return {
      width: base.width + 0.7,
      depth: base.depth + 0.6,
      height: base.height ?? 2.8,
      cutoutWidth: Math.max(1.4, Math.min(base.width * 0.33, 2.4)),
      cutoutDepth: Math.max(1.2, Math.min(base.depth * 0.34, 1.9)),
    };
  }

  if (shape === "custom") {
    return {
      width: base.width + 0.4,
      depth: base.depth + 0.3,
      height: base.height ?? 2.8,
      cutoutWidth: 0,
      cutoutDepth: 0,
    };
  }

  return {
    width: base.width,
    depth: base.depth,
    height: base.height ?? 2.8,
    cutoutWidth: 0,
    cutoutDepth: 0,
  };
};

const createRoomOpenings = (room: RoomDefinition, purpose: RoomPurpose): Opening[] => {
  const wall2Length = room.shape === "l_shape" ? room.depth - room.cutoutDepth : room.depth;
  const doorWallLength = getWallLength(room, "wall_4") || room.depth;
  const mainWindowWall = room.shape === "l_shape" ? "wall_5" : "wall_2";
  const mainWindowPosition =
    room.shape === "l_shape" ? Math.max(1.1, room.width * 0.42) : Math.max(1.2, wall2Length * 0.68);
  const openings: Opening[] = [
    {
      id: "door_1",
      type: "door",
      wallId: "wall_4",
      position: Math.max(1.05, doorWallLength - 1.08),
      width: purpose === "entry" ? 1.05 : 0.9,
      clearDepth: purpose === "entry" ? 1.05 : 0.9,
      locked: true,
    },
  ];

  if (purpose !== "empty" && purpose !== "dressing") {
    openings.push({
      id: "window_1",
      type: purpose === "balcony" ? "balcony_door" : "window",
      wallId: mainWindowWall,
      position: mainWindowPosition,
      width: purpose === "balcony" ? 1.45 : purpose === "bathroom" ? 0.9 : 1.3,
      clearDepth: purpose === "balcony" ? 0.9 : 0.6,
      locked: true,
    });
  }

  return openings.map((opening) => normalizeOpeningForRoom(room, opening));
};

const presetOffsets = [
  [0, 0],
  [0.35, 0],
  [-0.35, 0],
  [0, 0.35],
  [0, -0.35],
  [0.7, 0],
  [-0.7, 0],
  [0, 0.7],
  [0, -0.7],
  [0.7, 0.35],
  [-0.7, 0.35],
  [0.7, -0.35],
  [-0.7, -0.35],
  [1.05, 0],
  [-1.05, 0],
  [0, 1.05],
  [0, -1.05],
] as const;

const getWarningScore = (roomData: RoomData) =>
  validateRoomLayout(roomData).reduce(
    (score, warning) => score + (warning.level === "error" ? 10 : 1),
    0,
  );

const clonePresetObject = (object: RoomObject): RoomObject => ({
  ...object,
  position: { ...object.position },
  dimensions: { ...object.dimensions },
  params: { ...object.params },
});

const stabilizePresetLayout = (roomData: RoomData): RoomData => {
  let current: RoomData = {
    ...roomData,
    room: {
      ...roomData.room,
      walls: roomData.room.walls.map((wall) => ({
        ...wall,
        from: [...wall.from] as [number, number],
        to: [...wall.to] as [number, number],
      })),
      openings: roomData.room.openings.map((opening) => ({ ...opening })),
    },
    constraints: { ...roomData.constraints },
    notes: [...(roomData.notes ?? [])],
    groups: [...(roomData.groups ?? [])],
    objects: roomData.objects.map(clonePresetObject),
  };

  for (let iteration = 0; iteration < 8; iteration += 1) {
    const warnings = validateRoomLayout(current);

    if (!warnings.length) {
      return current;
    }

    const problemIds = Array.from(
      new Set(
        warnings.flatMap((warning) =>
          [warning.objectId, warning.relatedObjectId].filter(Boolean),
        ),
      ),
    ) as string[];
    let improved = false;

    for (const objectId of problemIds) {
      const objectIndex = current.objects.findIndex((object) => object.id === objectId);

      if (objectIndex < 0 || isWallAttachedObject(current.objects[objectIndex])) {
        continue;
      }

      const object = current.objects[objectIndex];
      let bestObjects = current.objects;
      let bestScore = getWarningScore(current);

      for (const [offsetX, offsetZ] of presetOffsets) {
        const candidateObject = clonePresetObject(object);
        candidateObject.position = clampObjectPositionToRoom(
          current,
          candidateObject,
          {
            x: object.position.x + offsetX,
            z: object.position.z + offsetZ,
          },
          object.rotation,
        );

        const candidateObjects = current.objects.map((entry, index) =>
          index === objectIndex ? candidateObject : entry,
        );
        const candidateRoomData = {
          ...current,
          objects: candidateObjects,
        };
        const score = getWarningScore(candidateRoomData);

        if (score < bestScore) {
          bestScore = score;
          bestObjects = candidateObjects;
        }
      }

      if (bestObjects !== current.objects) {
        current = {
          ...current,
          objects: bestObjects,
        };
        improved = true;
      }
    }

    if (!improved) {
      break;
    }
  }

  return current;
};

const createRoomDefinition = (
  shape: RoomShape,
  purpose: RoomPurpose,
): RoomDefinition => {
  const dimensions = getShapeDimensions(shape, purpose);
  const safeShape = shape === "square" ? "square" : shape;
  const width = clampRoomWidth(dimensions.width);
  const depth = clampRoomDepth(dimensions.depth);
  const height = clampRoomHeight(dimensions.height);
  const shapeConfig = sanitizeShapeConfig(
    safeShape,
    width,
    depth,
    dimensions.cutoutWidth,
    dimensions.cutoutDepth,
  );
  const label = roomPurposeLabels.get(purpose)?.en ?? "Room";
  const room: RoomDefinition = {
    id: `room_${purpose}_${shape}`,
    label,
    labelKey: `room.purpose.${purpose}`,
    shape: safeShape,
    purpose,
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

  return {
    ...room,
    openings: createRoomOpenings(room, purpose),
  };
};

const ratio = (x: number, z: number) => ({ x, z });

const wall = (
  wallId: NonNullable<PresetItem["wall"]>,
  along: number,
): Pick<PresetItem, "wall" | "along"> => ({ wall: wallId, along });

const getWallRotation = (wallId: NonNullable<PresetItem["wall"]>) => {
  switch (wallId) {
    case "south":
      return 180;
    case "east":
      return 270;
    case "west":
      return 90;
    case "north":
    default:
      return 0;
  }
};

const getExteriorWallSegment = (
  room: RoomDefinition,
  wallId: NonNullable<PresetItem["wall"]>,
) => {
  const epsilon = 0.01;
  const candidates = room.walls.filter((wallSegment) => {
    const [fromX, fromZ] = wallSegment.from;
    const [toX, toZ] = wallSegment.to;
    const horizontal = Math.abs(fromZ - toZ) <= epsilon;
    const vertical = Math.abs(fromX - toX) <= epsilon;

    if (wallId === "north") {
      return horizontal && Math.abs(fromZ) <= epsilon && Math.abs(toZ) <= epsilon;
    }

    if (wallId === "south") {
      return (
        horizontal &&
        Math.abs(fromZ - room.depth) <= epsilon &&
        Math.abs(toZ - room.depth) <= epsilon
      );
    }

    if (wallId === "east") {
      return (
        vertical &&
        Math.abs(fromX - room.width) <= epsilon &&
        Math.abs(toX - room.width) <= epsilon
      );
    }

    return vertical && Math.abs(fromX) <= epsilon && Math.abs(toX) <= epsilon;
  });

  return (
    candidates.sort(
      (left, right) =>
        Math.hypot(right.to[0] - right.from[0], right.to[1] - right.from[1]) -
        Math.hypot(left.to[0] - left.from[0], left.to[1] - left.from[1]),
    )[0] ?? null
  );
};

const getWallAnchoredPosition = (
  roomData: RoomData,
  object: RoomObject,
  wallId: NonNullable<PresetItem["wall"]>,
  along = 0.5,
): RoomObject["position"] => {
  const rotation = normalizeRotation(object.rotation);
  const { halfWidth, halfDepth } = getRotatedHalfExtents(
    object.dimensions.width,
    object.dimensions.depth,
    rotation,
  );
  const edgePadding = 0.06;
  const sideWall = getExteriorWallSegment(roomData.room, wallId);

  if (sideWall) {
    const minX = Math.min(sideWall.from[0], sideWall.to[0]);
    const maxX = Math.max(sideWall.from[0], sideWall.to[0]);
    const minZ = Math.min(sideWall.from[1], sideWall.to[1]);
    const maxZ = Math.max(sideWall.from[1], sideWall.to[1]);
    const safeAlong = Math.min(0.98, Math.max(0.02, along));

    if (wallId === "north" || wallId === "south") {
      return {
        x: minX + (maxX - minX) * safeAlong,
        z: wallId === "north" ? minZ + halfDepth + edgePadding : maxZ - halfDepth - edgePadding,
      };
    }

    return {
      x: wallId === "west" ? minX + halfWidth + edgePadding : maxX - halfWidth - edgePadding,
      z: minZ + (maxZ - minZ) * safeAlong,
    };
  }

  if (wallId === "north" || wallId === "south") {
    return {
      x: roomData.room.width * along,
      z:
        wallId === "north"
          ? halfDepth + edgePadding
          : roomData.room.depth - halfDepth - edgePadding,
    };
  }

  return {
    x:
      wallId === "west"
        ? halfWidth + edgePadding
        : roomData.room.width - halfWidth - edgePadding,
    z: roomData.room.depth * along,
  };
};

const getPresetItems = (purpose: RoomPurpose): PresetItem[] => {
  switch (purpose) {
    case "empty":
      return [];
    case "kitchen":
      return [
        { templateId: "template_base_cabinet", ...ratio(0.2, 0.1), ...wall("north", 0.2) },
        { templateId: "template_kitchen_sink", ...ratio(0.36, 0.1), ...wall("north", 0.36) },
        { templateId: "template_oven", ...ratio(0.54, 0.1), ...wall("north", 0.54) },
        { templateId: "template_upper_cabinet", ...ratio(0.36, 0.04), ...wall("north", 0.36) },
        { templateId: "template_fridge", ...ratio(0.88, 0.2), ...wall("east", 0.22) },
        { templateId: "template_kitchen_island", ...ratio(0.49, 0.56), rotation: 0 },
        { templateId: "template_bar_stool", ...ratio(0.41, 0.78), rotation: 180 },
        { templateId: "template_bar_stool", ...ratio(0.59, 0.78), rotation: 180 },
        { templateId: "template_ceiling_light", ...ratio(0.5, 0.5), rotation: 0 },
      ];
    case "bedroom":
      return [
        { templateId: "template_bed_double", ...ratio(0.5, 0.42), ...wall("south", 0.5) },
        { templateId: "template_nightstand", ...ratio(0.32, 0.44), rotation: 0 },
        { templateId: "template_nightstand", ...ratio(0.64, 0.44), rotation: 0 },
        { templateId: "template_wardrobe_tall", ...ratio(0.88, 0.18), ...wall("east", 0.2) },
        { templateId: "template_dresser", ...ratio(0.18, 0.18), ...wall("north", 0.2) },
        { templateId: "template_floor_mirror", ...ratio(0.1, 0.44), ...wall("west", 0.44) },
        { templateId: "template_carpet_large", ...ratio(0.48, 0.4), rotation: 0 },
        { templateId: "template_ceiling_light", ...ratio(0.5, 0.5), rotation: 0 },
      ];
    case "kids":
      return [
        { templateId: "template_bed_single", ...ratio(0.23, 0.78), ...wall("south", 0.24) },
        { templateId: "template_desk", ...ratio(0.82, 0.3), ...wall("east", 0.32) },
        { templateId: "template_chair_office", ...ratio(0.68, 0.3), rotation: 90 },
        { templateId: "template_bookshelf", ...ratio(0.18, 0.18), ...wall("north", 0.18) },
        { templateId: "template_storage_bench", ...ratio(0.52, 0.82), ...wall("south", 0.58) },
        { templateId: "template_carpet_large", ...ratio(0.48, 0.52), rotation: 0 },
        { templateId: "template_wall_shelf", ...ratio(0.82, 0.06), ...wall("north", 0.82) },
        { templateId: "template_framed_art", ...ratio(0.23, 0.98), rotation: 180 },
        { templateId: "template_ceiling_light", ...ratio(0.5, 0.5), rotation: 0 },
      ];
    case "study":
      return [
        { templateId: "template_desk", ...ratio(0.72, 0.08), ...wall("north", 0.72) },
        { templateId: "template_chair_office", ...ratio(0.72, 0.25), rotation: 180 },
        { templateId: "template_monitor", ...ratio(0.72, 0.18), rotation: 0 },
        { templateId: "template_bookshelf", ...ratio(0.18, 0.18), ...wall("north", 0.18) },
        { templateId: "template_armchair", ...ratio(0.18, 0.74), rotation: 90 },
        { templateId: "template_floor_lamp", ...ratio(0.3, 0.74), rotation: 0 },
        { templateId: "template_carpet_large", ...ratio(0.5, 0.54), rotation: 0 },
        { templateId: "template_wall_shelf", ...ratio(0.86, 0.06), ...wall("north", 0.86) },
        { templateId: "template_ceiling_light", ...ratio(0.5, 0.5), rotation: 0 },
      ];
    case "bathroom":
      return [
        { templateId: "template_shower_cabin", ...ratio(0.8, 0.66), ...wall("east", 0.72) },
        { templateId: "template_vanity", ...ratio(0.18, 0.18), ...wall("north", 0.2) },
        { templateId: "template_toilet", ...ratio(0.64, 0.78), ...wall("south", 0.64) },
        { templateId: "template_mirror_panel", ...ratio(0.18, 0.04), ...wall("north", 0.2) },
        { templateId: "template_towel_rack", ...ratio(0.86, 0.22), ...wall("east", 0.26) },
        { templateId: "template_ceiling_light", ...ratio(0.5, 0.5), rotation: 0 },
      ];
    case "dining":
      return [
        { templateId: "template_dining_table", ...ratio(0.44, 0.42), rotation: 0 },
        { templateId: "template_chair_dining", ...ratio(0.44, 0.22), rotation: 0 },
        { templateId: "template_chair_dining", ...ratio(0.44, 0.62), rotation: 180 },
        { templateId: "template_chair_dining", ...ratio(0.24, 0.42), rotation: 90 },
        { templateId: "template_chair_dining", ...ratio(0.64, 0.42), rotation: 270 },
        { templateId: "template_sideboard", ...ratio(0.18, 0.14), ...wall("north", 0.18) },
        { templateId: "template_ceiling_light", ...ratio(0.44, 0.42), rotation: 0 },
        { templateId: "template_framed_art", ...ratio(0.44, 0.98), rotation: 180 },
      ];
    case "laundry":
      return [
        { templateId: "template_washer", ...ratio(0.18, 0.18), ...wall("north", 0.18) },
        { templateId: "template_dryer", ...ratio(0.34, 0.18), ...wall("north", 0.34) },
        { templateId: "template_base_cabinet", ...ratio(0.58, 0.18), ...wall("north", 0.58) },
        { templateId: "template_kitchen_sink", ...ratio(0.76, 0.18), ...wall("north", 0.76) },
        { templateId: "template_upper_cabinet", ...ratio(0.42, 0.04), ...wall("north", 0.42) },
        { templateId: "template_storage_bench", ...ratio(0.3, 0.78), ...wall("south", 0.34) },
        { templateId: "template_wall_shelf", ...ratio(0.82, 0.76), ...wall("south", 0.82) },
        { templateId: "template_ceiling_light", ...ratio(0.5, 0.5), rotation: 0 },
      ];
    case "entry":
      return [
        { templateId: "template_shoe_rack", ...ratio(0.22, 0.18), ...wall("north", 0.22) },
        { templateId: "template_console_table", ...ratio(0.56, 0.18), ...wall("north", 0.56) },
        { templateId: "template_mirror_panel", ...ratio(0.56, 0.04), ...wall("north", 0.56) },
        { templateId: "template_coat_stand", ...ratio(0.86, 0.24), rotation: 0 },
        { templateId: "template_storage_bench", ...ratio(0.56, 0.8), ...wall("south", 0.56) },
        { templateId: "template_carpet_runner", ...ratio(0.46, 0.6), rotation: 90 },
        { templateId: "template_wall_sconce", ...ratio(0.22, 0.05), ...wall("north", 0.22) },
      ];
    case "balcony":
      return [
        { templateId: "template_round_table", ...ratio(0.5, 0.52), rotation: 0 },
        { templateId: "template_chair_dining", ...ratio(0.34, 0.52), rotation: 90 },
        { templateId: "template_chair_dining", ...ratio(0.66, 0.52), rotation: 270 },
        { templateId: "template_tall_plant", ...ratio(0.16, 0.22), rotation: 0 },
        { templateId: "template_tall_plant", ...ratio(0.84, 0.22), rotation: 0 },
        { templateId: "template_storage_bench", ...ratio(0.5, 0.82), rotation: 0 },
      ];
    case "dressing":
      return [
        { templateId: "template_wardrobe_tall", ...ratio(0.22, 0.18), ...wall("north", 0.22) },
        { templateId: "template_wardrobe_tall", ...ratio(0.52, 0.18), ...wall("north", 0.52) },
        { templateId: "template_dresser", ...ratio(0.82, 0.26), ...wall("east", 0.26) },
        { templateId: "template_floor_mirror", ...ratio(0.82, 0.76), ...wall("east", 0.76) },
        { templateId: "template_storage_bench", ...ratio(0.48, 0.78), rotation: 0 },
        { templateId: "template_carpet_runner", ...ratio(0.46, 0.5), rotation: 90 },
        { templateId: "template_ceiling_light", ...ratio(0.5, 0.5), rotation: 0 },
      ];
    case "living":
    default:
      return [
        { templateId: "template_media_console", ...ratio(0.5, 0.12), ...wall("north", 0.5) },
        { templateId: "template_sofa_straight", ...ratio(0.5, 0.82), ...wall("south", 0.5) },
        { templateId: "template_armchair", ...ratio(0.82, 0.58), rotation: 240 },
        { templateId: "template_coffee_table", ...ratio(0.5, 0.52), rotation: 0 },
        { templateId: "template_carpet_large", ...ratio(0.5, 0.54), rotation: 0 },
        { templateId: "template_floor_lamp", ...ratio(0.12, 0.82), rotation: 0 },
        { templateId: "template_tall_plant", ...ratio(0.9, 0.2), rotation: 0 },
        { templateId: "template_framed_art", ...ratio(0.5, 0.04), rotation: 0 },
        { templateId: "template_ceiling_light", ...ratio(0.5, 0.5), rotation: 0 },
      ];
  }
};

const createObjectFromPresetItem = (
  roomData: RoomData,
  item: PresetItem,
  index: number,
): RoomObject | null => {
  const template = getInventoryTemplateById(item.templateId);

  if (!template) {
    return null;
  }

  const mountHeight =
    typeof template.params.mountHeight === "number" ? template.params.mountHeight : 0;
  const structural = Boolean(template.params.structural);
  const dimensions = {
    ...template.dimensions,
    ...item.dimensions,
  };
  const height = Math.min(
    dimensions.height,
    Math.max(0.05, roomData.room.height - mountHeight),
  );
  const object: RoomObject = {
    id: `${template.category}_${index + 1}`,
    label: template.label,
    labelKey: template.labelKey,
    category: template.category,
    generator: template.generator,
    position: {
      x: Number((roomData.room.width * item.x).toFixed(3)),
      z: Number((roomData.room.depth * item.z).toFixed(3)),
    },
    rotation: item.rotation ?? template.rotation ?? 0,
    dimensions: {
      ...dimensions,
      height,
    },
    color: item.color ?? template.color,
    movable: !structural,
    locked: item.locked ?? structural,
    params: {
      ...template.params,
      ...item.params,
    },
  };

  if (item.wall) {
    const rotation = normalizeRotation(item.rotation ?? getWallRotation(item.wall));
    const anchoredObject = {
      ...object,
      rotation,
    };
    const desiredPosition = getWallAnchoredPosition(
      roomData,
      anchoredObject,
      item.wall,
      item.along,
    );

    return {
      ...anchoredObject,
      position: clampObjectPositionToRoom(
        roomData,
        anchoredObject,
        desiredPosition,
        rotation,
      ),
    };
  }

  if (isWallAttachedObject(object)) {
    const placement = getWallAttachedObjectTransform(
      roomData,
      object,
      object.position,
    );

    return {
      ...object,
      position: placement.position,
      rotation: placement.rotation,
    };
  }

  return {
    ...object,
    position: clampObjectPositionToRoom(
      roomData,
      object,
      object.position,
      object.rotation,
    ),
  };
};

export const createRoomPreset = (
  shape: RoomShape,
  purpose: RoomPurpose,
): RoomData => {
  const room = createRoomDefinition(shape, purpose);
  const roomData: RoomData = {
    room,
    groups: [],
    constraints: {
      keepWindowClear: true,
      keepDoorClear: true,
      keepRadiatorClear: true,
      minWalkwayWidth: 0.7,
    },
    notes: [
      `Professional ${purpose} preset for ${shape} rooms.`,
      "Generated from curated interior layout rules.",
    ],
    objects: [],
  };

  roomData.objects = getPresetItems(purpose)
    .map((item, index) => createObjectFromPresetItem(roomData, item, index))
    .filter((object): object is RoomObject => Boolean(object));

  return stabilizePresetLayout(roomData);
};
