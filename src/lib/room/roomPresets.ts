import { getInventoryTemplateById } from "@/lib/room/inventoryCatalog";
import {
  clampObjectPositionToRoom,
  getWallAttachedObjectTransform,
  isWallAttachedObject,
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
  empty: { width: 5.6, depth: 4.2 },
  living: { width: 7.2, depth: 5.2 },
  kitchen: { width: 6.6, depth: 4.9 },
  bedroom: { width: 5.9, depth: 4.8 },
  kids: { width: 5.6, depth: 4.6 },
  study: { width: 5.4, depth: 4.2 },
  bathroom: { width: 4.7, depth: 3.8 },
  dining: { width: 5.8, depth: 4.8 },
  laundry: { width: 4.7, depth: 3.7 },
  entry: { width: 5.1, depth: 3.6 },
  balcony: { width: 4.9, depth: 3.5 },
  dressing: { width: 5.2, depth: 3.9 },
};

const getShapeDimensions = (shape: RoomShape, purpose: RoomPurpose) => {
  const base = baseDimensions[purpose];

  if (shape === "square") {
    const size = Math.max(base.width, base.depth, 4.2);

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
    });
  }

  if (
    purpose !== "empty" &&
    purpose !== "bathroom" &&
    purpose !== "balcony" &&
    purpose !== "laundry"
  ) {
    openings.push({
      id: "radiator_1",
      type: "radiator",
      wallId: mainWindowWall,
      position: Math.max(0.8, mainWindowPosition - 1.5),
      width: 0.9,
      clearDepth: 0.45,
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

const getPresetItems = (purpose: RoomPurpose): PresetItem[] => {
  switch (purpose) {
    case "empty":
      return [];
    case "kitchen":
      return [
        { templateId: "template_fridge", ...ratio(0.88, 0.14), rotation: 0 },
        { templateId: "template_base_cabinet", ...ratio(0.22, 0.14), rotation: 0 },
        { templateId: "template_kitchen_sink", ...ratio(0.38, 0.14), rotation: 0 },
        { templateId: "template_dishwasher", ...ratio(0.54, 0.14), rotation: 0 },
        { templateId: "template_oven", ...ratio(0.68, 0.14), rotation: 0 },
        { templateId: "template_cooktop", ...ratio(0.68, 0.26), rotation: 0 },
        { templateId: "template_range_hood", ...ratio(0.68, 0.04), rotation: 0 },
        { templateId: "template_upper_cabinet", ...ratio(0.32, 0.04), rotation: 0 },
        { templateId: "template_kitchen_island", ...ratio(0.48, 0.52), rotation: 0 },
        { templateId: "template_dining_table", ...ratio(0.24, 0.82), rotation: 0 },
        { templateId: "template_chair_dining", ...ratio(0.14, 0.82), rotation: 90 },
        { templateId: "template_chair_dining", ...ratio(0.34, 0.82), rotation: 270 },
        { templateId: "template_ceiling_light", ...ratio(0.48, 0.52), rotation: 0 },
      ];
    case "bedroom":
      return [
        { templateId: "template_bed_double", ...ratio(0.48, 0.72), rotation: 180 },
        { templateId: "template_nightstand", ...ratio(0.31, 0.82), rotation: 0 },
        { templateId: "template_nightstand", ...ratio(0.65, 0.82), rotation: 0 },
        { templateId: "template_wardrobe_tall", ...ratio(0.84, 0.16), rotation: 0 },
        { templateId: "template_dresser", ...ratio(0.24, 0.16), rotation: 0 },
        { templateId: "template_floor_mirror", ...ratio(0.08, 0.55), rotation: 270 },
        { templateId: "template_carpet_large", ...ratio(0.48, 0.53), rotation: 0 },
        { templateId: "template_wall_sconce", ...ratio(0.48, 0.98), rotation: 180 },
      ];
    case "kids":
      return [
        { templateId: "template_bed_single", ...ratio(0.26, 0.74), rotation: 180 },
        { templateId: "template_desk", ...ratio(0.82, 0.34), rotation: 270 },
        { templateId: "template_chair_office", ...ratio(0.68, 0.34), rotation: 270 },
        { templateId: "template_bookshelf", ...ratio(0.18, 0.16), rotation: 0 },
        { templateId: "template_storage_bench", ...ratio(0.51, 0.82), rotation: 0 },
        { templateId: "template_carpet_large", ...ratio(0.46, 0.52), rotation: 0 },
        { templateId: "template_wall_shelf", ...ratio(0.82, 0.08), rotation: 0 },
        { templateId: "template_framed_art", ...ratio(0.27, 0.98), rotation: 180 },
      ];
    case "study":
      return [
        { templateId: "template_desk", ...ratio(0.83, 0.42), rotation: 270 },
        { templateId: "template_chair_office", ...ratio(0.68, 0.42), rotation: 270 },
        { templateId: "template_monitor", ...ratio(0.84, 0.34), rotation: 270 },
        { templateId: "template_bookshelf", ...ratio(0.18, 0.18), rotation: 0 },
        { templateId: "template_armchair", ...ratio(0.32, 0.76), rotation: 140 },
        { templateId: "template_floor_lamp", ...ratio(0.12, 0.76), rotation: 0 },
        { templateId: "template_round_table", ...ratio(0.48, 0.72), rotation: 0 },
        { templateId: "template_wall_shelf", ...ratio(0.83, 0.1), rotation: 0 },
      ];
    case "bathroom":
      return [
        { templateId: "template_shower_cabin", ...ratio(0.82, 0.52), rotation: 270 },
        { templateId: "template_bathtub", ...ratio(0.33, 0.78), rotation: 0 },
        { templateId: "template_vanity", ...ratio(0.2, 0.16), rotation: 0 },
        { templateId: "template_toilet", ...ratio(0.6, 0.76), rotation: 180 },
        { templateId: "template_mirror_panel", ...ratio(0.2, 0.04), rotation: 0 },
        { templateId: "template_towel_rack", ...ratio(0.84, 0.18), rotation: 0 },
        { templateId: "template_ceiling_light", ...ratio(0.5, 0.5), rotation: 0 },
      ];
    case "dining":
      return [
        { templateId: "template_dining_table", ...ratio(0.5, 0.52), rotation: 0 },
        { templateId: "template_chair_dining", ...ratio(0.5, 0.35), rotation: 180 },
        { templateId: "template_chair_dining", ...ratio(0.5, 0.69), rotation: 0 },
        { templateId: "template_chair_dining", ...ratio(0.34, 0.52), rotation: 90 },
        { templateId: "template_chair_dining", ...ratio(0.66, 0.52), rotation: 270 },
        { templateId: "template_sideboard", ...ratio(0.2, 0.14), rotation: 0 },
        { templateId: "template_console_table", ...ratio(0.8, 0.14), rotation: 0 },
        { templateId: "template_ceiling_light", ...ratio(0.5, 0.52), rotation: 0 },
        { templateId: "template_framed_art", ...ratio(0.5, 0.98), rotation: 180 },
      ];
    case "laundry":
      return [
        { templateId: "template_washer", ...ratio(0.22, 0.18), rotation: 0 },
        { templateId: "template_dryer", ...ratio(0.38, 0.18), rotation: 0 },
        { templateId: "template_kitchen_sink", ...ratio(0.6, 0.18), rotation: 0 },
        { templateId: "template_base_cabinet", ...ratio(0.8, 0.18), rotation: 0 },
        { templateId: "template_upper_cabinet", ...ratio(0.5, 0.05), rotation: 0 },
        { templateId: "template_storage_bench", ...ratio(0.34, 0.78), rotation: 0 },
        { templateId: "template_wall_shelf", ...ratio(0.78, 0.78), rotation: 180 },
        { templateId: "template_ceiling_light", ...ratio(0.5, 0.5), rotation: 0 },
      ];
    case "entry":
      return [
        { templateId: "template_shoe_rack", ...ratio(0.25, 0.17), rotation: 0 },
        { templateId: "template_console_table", ...ratio(0.56, 0.17), rotation: 0 },
        { templateId: "template_mirror_panel", ...ratio(0.56, 0.04), rotation: 0 },
        { templateId: "template_coat_stand", ...ratio(0.84, 0.24), rotation: 0 },
        { templateId: "template_carpet_runner", ...ratio(0.45, 0.6), rotation: 90 },
        { templateId: "template_storage_bench", ...ratio(0.78, 0.78), rotation: 0 },
        { templateId: "template_wall_sconce", ...ratio(0.25, 0.04), rotation: 0 },
      ];
    case "balcony":
      return [
        { templateId: "template_round_table", ...ratio(0.48, 0.52), rotation: 0 },
        { templateId: "template_chair_dining", ...ratio(0.32, 0.52), rotation: 90 },
        { templateId: "template_chair_dining", ...ratio(0.64, 0.52), rotation: 270 },
        { templateId: "template_tall_plant", ...ratio(0.16, 0.22), rotation: 0 },
        { templateId: "template_tall_plant", ...ratio(0.82, 0.22), rotation: 0 },
        { templateId: "template_storage_bench", ...ratio(0.5, 0.82), rotation: 0 },
        { templateId: "template_wall_sconce", ...ratio(0.5, 0.04), rotation: 0 },
      ];
    case "dressing":
      return [
        { templateId: "template_wardrobe_tall", ...ratio(0.22, 0.16), rotation: 0 },
        { templateId: "template_wardrobe_tall", ...ratio(0.51, 0.16), rotation: 0 },
        { templateId: "template_dresser", ...ratio(0.82, 0.25), rotation: 270 },
        { templateId: "template_floor_mirror", ...ratio(0.82, 0.74), rotation: 270 },
        { templateId: "template_storage_bench", ...ratio(0.44, 0.76), rotation: 0 },
        { templateId: "template_carpet_runner", ...ratio(0.45, 0.5), rotation: 90 },
        { templateId: "template_ceiling_light", ...ratio(0.5, 0.5), rotation: 0 },
      ];
    case "living":
    default:
      return [
        { templateId: "template_media_console", ...ratio(0.31, 0.12), rotation: 0 },
        { templateId: "template_l_sofa", ...ratio(0.31, 0.82), rotation: 180 },
        { templateId: "template_armchair", ...ratio(0.66, 0.54), rotation: 240 },
        { templateId: "template_coffee_table", ...ratio(0.31, 0.52), rotation: 0 },
        { templateId: "template_carpet_large", ...ratio(0.31, 0.55), rotation: 0 },
        { templateId: "template_floor_lamp", ...ratio(0.12, 0.86), rotation: 0 },
        { templateId: "template_sideboard", ...ratio(0.78, 0.17), rotation: 0 },
        { templateId: "template_tall_plant", ...ratio(0.9, 0.22), rotation: 0 },
        { templateId: "template_framed_art", ...ratio(0.31, 0.98), rotation: 180 },
        { templateId: "template_ceiling_light", ...ratio(0.44, 0.52), rotation: 0 },
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
