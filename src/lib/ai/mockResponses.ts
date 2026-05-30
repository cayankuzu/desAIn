import { clampObjectPositionToRoom, normalizeRotation } from "@/lib/room/constraints";
import { validateRoomLayout } from "@/lib/room/layoutValidator";
import type { LayoutChatResult } from "@/types/ai";
import type { LayoutObjectUpdate, LayoutResponse, RoomData } from "@/types/room";

const cloneRoomData = (roomData: RoomData): RoomData =>
  JSON.parse(JSON.stringify(roomData)) as RoomData;

const findObject = (roomData: RoomData, id: string) =>
  roomData.objects.find((object) => object.id === id);

const updateObject = (
  roomData: RoomData,
  id: string,
  next: Partial<LayoutObjectUpdate>,
) => {
  const object = findObject(roomData, id);

  if (!object || object.locked || !object.movable) {
    return;
  }

  const rotation = normalizeRotation(next.rotation ?? object.rotation);
  const position = clampObjectPositionToRoom(
    roomData,
    object,
    {
      x: next.x ?? object.position.x,
      z: next.z ?? object.position.z,
    },
    rotation,
  );

  object.position = position;
  object.rotation = rotation;
};

const layoutFromRoom = (roomData: RoomData, layoutName: string, summary: string): LayoutResponse => ({
  layoutName,
  summary,
  objects: roomData.objects.map((object) => ({
    id: object.id,
    x: object.position.x,
    z: object.position.z,
    rotation: object.rotation,
  })),
  constraintsRespected: ["door_clear", "window_clear", "locked_objects"],
  warnings: validateRoomLayout(roomData).map((warning) => warning.message),
});

const buildSpaciousLayout = (input: RoomData) => {
  const roomData = cloneRoomData(input);

  updateObject(roomData, "tv_unit_1", { x: 2.1, z: 0.36, rotation: 0 });
  updateObject(roomData, "sofa_1", { x: 2.1, z: 4.46, rotation: 180 });
  updateObject(roomData, "carpet_1", { x: 2.1, z: 2.72, rotation: 0 });
  updateObject(roomData, "table_1", { x: 6.08, z: 1.96, rotation: 270 });
  updateObject(roomData, "chair_1", { x: 5.32, z: 1.96, rotation: 270 });
  updateObject(roomData, "bed_1", { x: 5.88, z: 3.82, rotation: 90 });
  updateObject(roomData, "generic_1", { x: 0.82, z: 0.56, rotation: 0 });

  return layoutFromRoom(
    roomData,
    "Ferah Dolaşım Planı",
    "Merkezi dolaşım aksını açtım, koltuğu TV karşısında tuttum ve çalışma alanını pencereye yakın bıraktım.",
  );
};

const buildTVLayout = (input: RoomData) => {
  const roomData = cloneRoomData(input);

  updateObject(roomData, "tv_unit_1", { x: 2.25, z: 0.36, rotation: 0 });
  updateObject(roomData, "sofa_1", { x: 2.25, z: 4.18, rotation: 180 });
  updateObject(roomData, "carpet_1", { x: 2.25, z: 2.62, rotation: 0 });
  updateObject(roomData, "table_1", { x: 5.88, z: 1.74, rotation: 270 });
  updateObject(roomData, "chair_1", { x: 5.12, z: 1.74, rotation: 270 });
  updateObject(roomData, "generic_1", { x: 0.84, z: 1.42, rotation: 90 });

  return layoutFromRoom(
    roomData,
    "TV Odaklı Düzen",
    "Koltuk ile TV arasındaki görüş hattını netleştirdim ve kapı girişini daha açık bıraktım.",
  );
};

const buildWindowDeskLayout = (input: RoomData) => {
  const roomData = cloneRoomData(input);

  updateObject(roomData, "table_1", { x: 6.1, z: 2.9, rotation: 270 });
  updateObject(roomData, "chair_1", { x: 5.36, z: 2.9, rotation: 270 });
  updateObject(roomData, "sofa_1", { x: 2.2, z: 4.34, rotation: 180 });
  updateObject(roomData, "carpet_1", { x: 2.15, z: 2.9, rotation: 0 });
  updateObject(roomData, "generic_1", { x: 0.86, z: 1.85, rotation: 90 });

  return layoutFromRoom(
    roomData,
    "Pencere Yakını Çalışma Düzeni",
    "Çalışma masasını gün ışığına yaklaştırdım, büyük parçaları duvarlarda tutup ortada daha rahat bir alan bıraktım.",
  );
};

export const buildMockLayoutResponse = (
  message: string,
  roomData: RoomData,
): LayoutChatResult => {
  const normalized = message.toLocaleLowerCase("tr-TR");

  const layout =
    normalized.includes("ferah") || normalized.includes("minimal")
      ? buildSpaciousLayout(roomData)
      : normalized.includes("tv") || normalized.includes("karşı")
        ? buildTVLayout(roomData)
        : normalized.includes("masa") ||
            normalized.includes("pencere") ||
            normalized.includes("çalışma") ||
            normalized.includes("calisma")
          ? buildWindowDeskLayout(roomData)
          : buildSpaciousLayout(roomData);

  return {
    reply: `${layout.summary} İstersen bir sonraki turda daha minimal, TV odaklı ya da çalışma odaklı başka bir alternatif daha oluşturabilirim.`,
    layout,
  };
};

export const buildMockAnalysis = () => {
  return {
    roomGuess: {
      width: 7.2,
      depth: 5.2,
      shape: "rectangle",
      confidence: "medium",
    },
    detectedObjects: [
      { id: "sofa_1", label: "Koltuk", generator: "SofaGenerator" },
      { id: "bed_1", label: "Yatak", generator: "BedGenerator" },
      { id: "wardrobe_1", label: "Gardırop", generator: "WardrobeGenerator" },
    ],
    nextStep: "Bu mock analiz sonucunu ileride doğrulama ekranına bağlayabiliriz.",
  };
};
