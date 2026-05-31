import type { Opening, RoomDefinition, RoomShape, WallSegment } from "@/types/room";

const MIN_ROOM_SPAN = 2.4;
const MIN_L_LEG = 1.2;
const MIN_OPENING_MARGIN = 0.2;

export const clampRoomWidth = (value: number) =>
  Math.max(MIN_ROOM_SPAN, Number(value.toFixed(2)));

export const clampRoomDepth = (value: number) =>
  Math.max(MIN_ROOM_SPAN, Number(value.toFixed(2)));

export const clampRoomHeight = (value: number) =>
  Math.max(2.2, Number(value.toFixed(2)));

export const clampCutoutWidth = (roomWidth: number, value: number) =>
  Math.min(
    Math.max(0.8, Number(value.toFixed(2))),
    Math.max(0.8, roomWidth - MIN_L_LEG),
  );

export const clampCutoutDepth = (roomDepth: number, value: number) =>
  Math.min(
    Math.max(0.8, Number(value.toFixed(2))),
    Math.max(0.8, roomDepth - MIN_L_LEG),
  );

export const sanitizeShapeConfig = (
  shape: RoomShape,
  width: number,
  depth: number,
  cutoutWidth?: number,
  cutoutDepth?: number,
) => {
  const safeWidth = clampRoomWidth(width);
  const safeDepth = clampRoomDepth(depth);

  return {
    width: safeWidth,
    depth: safeDepth,
    cutoutWidth:
      shape === "l_shape"
        ? clampCutoutWidth(safeWidth, cutoutWidth ?? Math.max(1.2, safeWidth * 0.32))
        : 0,
    cutoutDepth:
      shape === "l_shape"
        ? clampCutoutDepth(safeDepth, cutoutDepth ?? Math.max(1.2, safeDepth * 0.32))
        : 0,
  };
};

export const buildRoomWalls = (
  shape: RoomShape,
  width: number,
  depth: number,
  cutoutWidth = 0,
  cutoutDepth = 0,
): WallSegment[] => {
  if (shape === "l_shape") {
    const safe = sanitizeShapeConfig(shape, width, depth, cutoutWidth, cutoutDepth);
    const innerX = safe.width - safe.cutoutWidth;
    const innerZ = safe.depth - safe.cutoutDepth;

    return [
      { id: "wall_1", from: [0, 0], to: [safe.width, 0] },
      { id: "wall_2", from: [safe.width, 0], to: [safe.width, innerZ] },
      { id: "wall_3", from: [safe.width, innerZ], to: [innerX, innerZ] },
      { id: "wall_4", from: [innerX, innerZ], to: [innerX, safe.depth] },
      { id: "wall_5", from: [innerX, safe.depth], to: [0, safe.depth] },
      { id: "wall_6", from: [0, safe.depth], to: [0, 0] },
    ];
  }

  return [
    { id: "wall_1", from: [0, 0], to: [width, 0] },
    { id: "wall_2", from: [width, 0], to: [width, depth] },
    { id: "wall_3", from: [width, depth], to: [0, depth] },
    { id: "wall_4", from: [0, depth], to: [0, 0] },
  ];
};

export const getWallMetrics = (wall: WallSegment) => {
  const dx = wall.to[0] - wall.from[0];
  const dz = wall.to[1] - wall.from[1];
  const length = Math.hypot(dx, dz) || 1;

  return {
    dx,
    dz,
    length,
    horizontal: Math.abs(dx) >= Math.abs(dz),
    directionX: dx / length,
    directionZ: dz / length,
    inwardNormalX: -dz / length,
    inwardNormalZ: dx / length,
    rotationY: Math.atan2(-dz / length, dx / length),
  };
};

const pointsEqual = (left: [number, number], right: [number, number]) =>
  Math.abs(left[0] - right[0]) < 0.001 && Math.abs(left[1] - right[1]) < 0.001;

export const getRoomOutlinePoints = (room: RoomDefinition): Array<[number, number]> => {
  const start = room.walls[0]?.from;
  const outlineWalls: WallSegment[] = [];

  for (const wall of room.walls) {
    const previousWall = outlineWalls.at(-1);

    if (previousWall && !pointsEqual(previousWall.to, wall.from)) {
      break;
    }

    outlineWalls.push(wall);

    if (start && outlineWalls.length > 1 && pointsEqual(wall.to, start)) {
      break;
    }
  }

  const points = (outlineWalls.length ? outlineWalls : room.walls).map(
    (wall) => wall.from,
  );

  if (start) {
    points.push(start);
  }

  return points;
};

export const getWallSegment = (room: RoomDefinition, wallId: string) =>
  room.walls.find((wall) => wall.id === wallId) ?? null;

export const getWallLength = (room: RoomDefinition, wallId: string) => {
  const wall = getWallSegment(room, wallId);

  if (!wall) {
    return 0;
  }

  return Math.hypot(wall.to[0] - wall.from[0], wall.to[1] - wall.from[1]);
};

export const projectPointToWall = (
  room: RoomDefinition,
  point: { x: number; z: number },
  preferredWallId?: string,
) => {
  const candidates = room.walls.map((wall) => {
    const metrics = getWallMetrics(wall);
    const desiredAlong =
      (point.x - wall.from[0]) * metrics.directionX +
      (point.z - wall.from[1]) * metrics.directionZ;
    const along = Math.min(metrics.length, Math.max(0, desiredAlong));
    const x = wall.from[0] + metrics.directionX * along;
    const z = wall.from[1] + metrics.directionZ * along;

    return {
      wall,
      metrics,
      along,
      point: { x, z },
      distance: Math.hypot(point.x - x, point.z - z),
      preferred: preferredWallId === wall.id,
    };
  });

  return (
    candidates.sort((left, right) => {
      if (left.preferred && left.distance < 0.42) {
        return -1;
      }

      if (right.preferred && right.distance < 0.42) {
        return 1;
      }

      return left.distance - right.distance;
    })[0] ?? null
  );
};

export const findWallByRotation = (room: RoomDefinition, rotationY: number) => {
  const normalize = (value: number) => {
    const wrapped = value % (Math.PI * 2);
    return wrapped < 0 ? wrapped + Math.PI * 2 : wrapped;
  };
  const target = normalize(rotationY);

  return (
    room.walls
      .map((wall) => {
        const wallRotation = normalize(getWallMetrics(wall).rotationY);
        const delta = Math.abs(target - wallRotation);

        return {
          wall,
          score: Math.min(delta, Math.PI * 2 - delta),
        };
      })
      .sort((left, right) => left.score - right.score)[0]?.wall ?? null
  );
};

export const clampOpeningPosition = (
  wallLength: number,
  openingWidth: number,
  desiredPosition: number,
) => {
  const minPosition = openingWidth / 2 + MIN_OPENING_MARGIN;
  const maxPosition = Math.max(minPosition, wallLength - openingWidth / 2 - MIN_OPENING_MARGIN);

  return Math.min(maxPosition, Math.max(minPosition, desiredPosition));
};

export const remapWallIdForShape = (shape: RoomShape, wallId: string) => {
  if (shape === "custom") {
    return wallId;
  }

  if (shape === "l_shape") {
    if (wallId === "wall_3") {
      return "wall_5";
    }

    if (wallId === "wall_4") {
      return "wall_6";
    }

    return wallId;
  }

  if (wallId === "wall_5") {
    return "wall_3";
  }

  if (wallId === "wall_6") {
    return "wall_4";
  }

  return wallId;
};

export const normalizeOpeningForRoom = (
  room: RoomDefinition,
  opening: Opening,
): Opening => {
  const wallId = remapWallIdForShape(room.shape, opening.wallId);
  const wallLength = getWallLength(room, wallId);
  const width = Math.max(0.3, Number(opening.width.toFixed(2)));

  return {
    ...opening,
    wallId,
    width,
    position: clampOpeningPosition(
      wallLength || width + MIN_OPENING_MARGIN * 2,
      width,
      opening.position,
    ),
  };
};

export const getRoomCutoutZone = (room: RoomDefinition) => {
  if (room.shape !== "l_shape" || !room.cutoutWidth || !room.cutoutDepth) {
    return null;
  }

  return {
    minX: room.width - room.cutoutWidth,
    maxX: room.width,
    minZ: room.depth - room.cutoutDepth,
    maxZ: room.depth,
  };
};
