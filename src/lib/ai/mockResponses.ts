import {
  clampObjectPositionToRoom,
  getMountHeight,
  normalizeRotation,
} from "@/lib/room/constraints";
import { validateRoomLayout } from "@/lib/room/layoutValidator";
import type { RoomDraft } from "@/lib/ai/roomDraft";
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

const layoutFromRoom = (
  roomData: RoomData,
  layoutName: string,
  summary: string,
): LayoutResponse => ({
  layoutName,
  summary,
  objects: roomData.objects.map((object) => ({
    id: object.id,
    x: object.position.x,
    z: object.position.z,
    rotation: object.rotation,
    mountHeight: getMountHeight(object),
  })),
  constraintsRespected: ["door_clear", "window_clear", "locked_objects"],
  warnings: validateRoomLayout(roomData).map((warning) => warning.message),
});

const buildSpaciousLayout = (input: RoomData, locale: "tr" | "en" = "tr") => {
  const roomData = cloneRoomData(input);
  const isEnglish = locale === "en";

  updateObject(roomData, "tv_unit_1", { x: 2.1, z: 0.36, rotation: 0 });
  updateObject(roomData, "sofa_1", { x: 2.1, z: 4.46, rotation: 180 });
  updateObject(roomData, "carpet_1", { x: 2.1, z: 2.72, rotation: 0 });
  updateObject(roomData, "table_1", { x: 6.08, z: 1.96, rotation: 270 });
  updateObject(roomData, "chair_1", { x: 5.32, z: 1.96, rotation: 270 });
  updateObject(roomData, "bed_1", { x: 5.88, z: 3.82, rotation: 90 });
  updateObject(roomData, "generic_1", { x: 0.82, z: 0.56, rotation: 0 });

  return layoutFromRoom(
    roomData,
    isEnglish ? "Spacious circulation plan" : "Ferah Dolaşım Planı",
    isEnglish
      ? "I opened the central circulation path, kept the sofa facing the TV, and left the work area near the window."
      : "Merkezi dolaşım aksını açtım, koltuğu TV karşısında tuttum ve çalışma alanını pencereye yakın bıraktım.",
  );
};

const buildTVLayout = (input: RoomData, locale: "tr" | "en" = "tr") => {
  const roomData = cloneRoomData(input);
  const isEnglish = locale === "en";

  updateObject(roomData, "tv_unit_1", { x: 2.25, z: 0.36, rotation: 0 });
  updateObject(roomData, "sofa_1", { x: 2.25, z: 4.18, rotation: 180 });
  updateObject(roomData, "carpet_1", { x: 2.25, z: 2.62, rotation: 0 });
  updateObject(roomData, "table_1", { x: 5.88, z: 1.74, rotation: 270 });
  updateObject(roomData, "chair_1", { x: 5.12, z: 1.74, rotation: 270 });
  updateObject(roomData, "generic_1", { x: 0.84, z: 1.42, rotation: 90 });

  return layoutFromRoom(
    roomData,
    isEnglish ? "TV-focused layout" : "TV Odaklı Düzen",
    isEnglish
      ? "I aligned the sofa with the TV sightline and kept the entrance clearer."
      : "Koltuk ile TV arasındaki görüş hattını netleştirdim ve kapı girişini daha açık bıraktım.",
  );
};

const buildWindowDeskLayout = (input: RoomData, locale: "tr" | "en" = "tr") => {
  const roomData = cloneRoomData(input);
  const isEnglish = locale === "en";

  updateObject(roomData, "table_1", { x: 6.1, z: 2.9, rotation: 270 });
  updateObject(roomData, "chair_1", { x: 5.36, z: 2.9, rotation: 270 });
  updateObject(roomData, "sofa_1", { x: 2.2, z: 4.34, rotation: 180 });
  updateObject(roomData, "carpet_1", { x: 2.15, z: 2.9, rotation: 0 });
  updateObject(roomData, "generic_1", { x: 0.86, z: 1.85, rotation: 90 });

  return layoutFromRoom(
    roomData,
    isEnglish ? "Window-side work layout" : "Pencere Yakını Çalışma Düzeni",
    isEnglish
      ? "I moved the desk toward daylight, kept large pieces on the walls, and left a more comfortable central area."
      : "Çalışma masasını gün ışığına yaklaştırdım, büyük parçaları duvarlarda tuttum ve ortada daha rahat bir alan bıraktım.",
  );
};

export const buildMockLayoutResponse = (
  message: string,
  roomData: RoomData,
  locale: "tr" | "en" = "tr",
): LayoutChatResult => {
  const normalized = message.toLocaleLowerCase(locale === "en" ? "en-US" : "tr-TR");
  const isEnglish = locale === "en";

  const layout =
    normalized.includes("ferah") ||
    normalized.includes("minimal") ||
    normalized.includes("spacious")
      ? buildSpaciousLayout(roomData, locale)
      : normalized.includes("tv") ||
          normalized.includes("karsi") ||
          normalized.includes("tv-focused")
        ? buildTVLayout(roomData, locale)
        : normalized.includes("masa") ||
            normalized.includes("pencere") ||
            normalized.includes("calisma") ||
            normalized.includes("desk") ||
            normalized.includes("window") ||
            normalized.includes("work")
          ? buildWindowDeskLayout(roomData, locale)
          : buildSpaciousLayout(roomData, locale);

  return {
    reply: isEnglish
      ? `${layout.summary} If you want, I can generate a more minimal, TV-focused, or desk-focused alternative in the next pass.`
      : `${layout.summary} İstersen bir sonraki turda daha minimal, TV odaklı ya da çalışma odaklı başka bir alternatif daha oluşturabilirim.`,
    layout,
  };
};

export const buildLocalCommandModeLayoutResponse = (
  message: string,
  roomData: RoomData,
  locale: "tr" | "en" = "tr",
): LayoutChatResult => {
  const normalized = message.toLocaleLowerCase(locale === "en" ? "en-US" : "tr-TR");
  const isEnglish = locale === "en";
  const normalizedAscii = normalized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "c")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "u");
  const wantsBroadPreset =
    normalizedAscii.includes("ferah") ||
    normalizedAscii.includes("minimal") ||
    normalizedAscii.includes("spacious") ||
    normalizedAscii.includes("tv-focused") ||
    normalizedAscii.includes("tv focused") ||
    normalizedAscii.includes("desk-focused") ||
    normalizedAscii.includes("desk focused") ||
    normalizedAscii.includes("window-side") ||
    normalizedAscii.includes("window side");
  const wantsDirectEdit =
    /\b(move|shift|place|put|set|adjust|align|rotate|turn|resize|scale|x|y|z|width|depth|height|mount|taşı|tasi|yerleştir|yerlestir|koy|hizala|ortala|döndür|dondur|çevir|cevir|boyut|ölçü|olcu|genişlik|genislik|derinlik|yükseklik|yukseklik|duvar)\b/i.test(
      normalized,
    );

  if (wantsBroadPreset && !wantsDirectEdit) {
    const layout =
      normalizedAscii.includes("tv")
        ? buildTVLayout(roomData, locale)
        : normalizedAscii.includes("masa") ||
            normalizedAscii.includes("pencere") ||
            normalizedAscii.includes("calisma") ||
            normalizedAscii.includes("desk") ||
            normalizedAscii.includes("window") ||
            normalizedAscii.includes("work")
          ? buildWindowDeskLayout(roomData, locale)
          : buildSpaciousLayout(roomData, locale);

    return {
      reply: isEnglish
        ? `${layout.summary} If you want another broad preset, ask for a more minimal, TV-focused, or desk-focused layout.`
        : `${layout.summary} İstersen daha minimal, TV odaklı ya da çalışma odaklı başka bir geniş düzen alternatifi de hazırlayabilirim.`,
      layout,
    };
  }

  return {
    reply: isEnglish
      ? "Live chat is not configured right now. I can still move, align, rotate, resize, and describe the existing room and items here."
      : "Canlı sohbet şu anda bağlı değil. Yine de buradaki mevcut oda ve öğeleri taşıyabilir, hizalayabilir, döndürebilir, boyutlandırabilir ve açıklayabilirim.",
    layout: {
      layoutName: isEnglish ? "Local command mode" : "Yerel komut modu",
      summary:
        isEnglish
          ? "Local command handling is active because no live chat model is configured."
          : "Canlı sohbet modeli bağlı olmadığı için yerel komut işleme etkin.",
      objects: [],
      constraintsRespected: [],
      warnings: [
        isEnglish
          ? "Local command mode is active because no live chat model is configured."
          : "Canlı sohbet modeli bağlı olmadığı için yerel komut modu aktif.",
      ],
    },
  };
};

export const buildMockAnalysis = (locale: "tr" | "en" = "tr") => {
  const isEnglish = locale === "en";
  return {
    room: {
      shape: "rectangle",
      width: 7.2,
      depth: 5.2,
      height: 2.8,
      openings: [],
    },
    items: [
      { templateId: "template_media_console", x: 2.1, z: 0.42, rotation: 0 },
      { templateId: "template_sofa_straight", x: 2.2, z: 4.3, rotation: 180 },
      { templateId: "template_carpet_large", x: 2.15, z: 2.7, rotation: 0 },
      { templateId: "discovered_wall_art_1", x: 5.1, z: 0.08, rotation: 180, locked: true },
    ],
    notes: [
      isEnglish
        ? "Room size and the core furniture layout were estimated for a quick preview."
        : "Oda ölçüsü ve ana mobilya yerleşimi hızlı bir önizleme için tahmini çıkarıldı.",
      isEnglish
        ? "A live vision provider will produce a more camera-accurate reconstruction."
        : "Canlı görsel sağlayıcı bağlandığında rekonstrüksiyon kamera verisine daha yakın olur.",
    ],
    warnings: [
      isEnglish
        ? "This preview is approximate, so openings and small objects may still be incomplete."
        : "Bu önizleme yaklaşık sonuç üretir; açıklıklar ve küçük objeler henüz eksik kalabilir.",
    ],
    captureAdvice: [
      isEnglish
        ? "Stand near the center of the room."
        : "Odanın merkezine yakın dur.",
      isEnglish
        ? "Take exactly 9 photos with a full 360-degree room sweep."
        : "Tam 9 fotoğrafla odayı 360 derece tarayacak şekilde çek.",
      isEnglish
        ? "Keep wall edges, floor lines, and large furniture visible in the same capture set."
        : "Duvar kenarlarını, zemin çizgilerini ve büyük mobilyaları aynı çekim setinde görünür tut.",
    ],
    confidence: "medium",
    discoveredInventory: [
      {
        id: "discovered_wall_art_1",
        label: isEnglish ? "Framed Wall Art" : "Çerçeveli Duvar Tablosu",
        labelKey: isEnglish ? "object.discovery.framedWallArt" : "object.discovery.framedWallArt",
        category: "generic_box",
        generator: "GenericObjectGenerator",
        color: "#7b614d",
        dimensions: { width: 0.92, depth: 0.08, height: 0.62 },
        rotation: 180,
        previewType: "wall",
        params: {
          baseShape: "wall_panel",
          mountHeight: 1.35,
          motionX: false,
          motionZ: false,
          motionRotation: false,
        },
        tags: ["wall", "art", "decor", "framed"],
      },
    ],
  } satisfies RoomDraft;
};
