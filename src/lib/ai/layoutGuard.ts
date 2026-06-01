import { applyObjectUpdate } from "@/lib/room/applyObjectUpdate";
import { getMountHeight, isWallAttachedObject, normalizeRotation } from "@/lib/room/constraints";
import { getLocalizedObjectLabel } from "@/lib/i18n/translations";
import { validateRoomLayout } from "@/lib/room/layoutValidator";
import { getWallMetrics, getWallSegment, projectPointToWall } from "@/lib/room/roomGeometry";
import type { LayoutChatResult } from "@/types/ai";
import type { LayoutObjectUpdate, LayoutResponse, RoomData, RoomObject } from "@/types/room";

const EPSILON = 0.001;

type Language = "tr" | "en";

function cloneRoomData(roomData: RoomData): RoomData {
  return JSON.parse(JSON.stringify(roomData)) as RoomData;
}

function cloneRoomObject(object: RoomObject): RoomObject {
  return JSON.parse(JSON.stringify(object)) as RoomObject;
}

function unique(values: string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function normalizeText(message: string) {
  return `${message.toLowerCase()} ${message.toLocaleLowerCase("tr-TR")}`;
}

function normalizedAscii(message: string) {
  return asciiFold(normalizeText(message));
}

const includesAny = (text: string, keywords: string[]) =>
  keywords.some((keyword) => text.includes(keyword));

const OBJECT_REFERENCE_STOP_WORDS = new Set([
  "the",
  "this",
  "that",
  "item",
  "object",
  "room",
  "wall",
  "with",
  "from",
  "into",
  "onto",
  "and",
  "for",
  "bir",
  "bu",
  "su",
  "şu",
  "ile",
  "ve",
  "oda",
  "duvar",
  "esya",
  "eşya",
  "nesne",
  "obje",
]);

function asciiFold(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i")
    .replace(/\u0130/g, "i")
    .replace(/\u011f/g, "g")
    .replace(/\u011e/g, "g")
    .replace(/\u015f/g, "s")
    .replace(/\u015e/g, "s")
    .replace(/\u00e7/g, "c")
    .replace(/\u00c7/g, "c")
    .replace(/\u00f6/g, "o")
    .replace(/\u00d6/g, "o")
    .replace(/\u00fc/g, "u")
    .replace(/\u00dc/g, "u");
}

function detectLanguage(message: string, locale: Language): Language {
  const text = normalizeText(message);
  const ascii = asciiFold(text);

  if (ascii !== text || includesAny(ascii, ["oda", "duvar", "esya", "sandalye", "sandaly", "koltu", "berjer", "masa", "yatak", "dolap", "sehpa", "unite", "mobilya", "dondur", "konum", "yerlestir", "olcu", "boyut", "yukseklik", "genislet", "daralt", "buyut", "kucult", "yasla", "yaklastir", "uzaklastir", "tasi", "yer"])) {
    return "tr";
  }

  if (includesAny(ascii, ["room", "wall", "object", "furniture", "move", "rotate", "resize", "width", "depth", "height", "place", "align", "shift", "position", "layout", "scene", "add", "create", "insert", "sofa", "chair", "armchair", "table", "bed", "wardrobe", "tv", "desk"])) {
    return "en";
  }

  return locale;
}

function extractReferenceTerms(value: string) {
  const lowered = asciiFold(value.toLocaleLowerCase("tr-TR"));
  return unique(
    [
      lowered,
      ...lowered
        .split(/[^a-z0-9]+/i)
        .filter((term) => term.length >= 3 && !OBJECT_REFERENCE_STOP_WORDS.has(term)),
    ].filter((term) => term.length >= 3),
  );
}

function getObjectReferenceTerms(object: RoomObject) {
  const terms = new Set<string>();

  for (const term of extractReferenceTerms(object.id)) {
    terms.add(term);
  }

  for (const term of extractReferenceTerms(object.label)) {
    terms.add(term);
  }

  for (const term of extractReferenceTerms(object.labelKey)) {
    terms.add(term);
  }

  for (const term of extractReferenceTerms(object.category)) {
    terms.add(term);
  }

  const baseShape = String(object.params.baseShape ?? "");
  for (const term of extractReferenceTerms(baseShape)) {
    terms.add(term);
  }

  if (object.category === "generic_box" && isWallAttachedObject(object)) {
    for (const term of [
      "tablo",
      "cerceve",
      "resim",
      "wall art",
      "painting",
      "picture",
      "frame",
      "framed",
    ]) {
      terms.add(term);
    }
  }

  return [...terms];
}

function hasFurnitureAddIntent(message: string) {
  const text = normalizeText(message);
  const addVerb = /\b(add|create|insert|place|put|new|ekle|yerleştir|yerlestir|koy)\b/i;
  const furnitureNoun =
    /\b(furniture|sofa|couch|chair|table|bed|wardrobe|tv|tv unit|desk|cabinet|item|object|mobilya|eşya|esya|sandalye[a-zçğıöşü]*|sandaly[a-zçğıöşü]*|koltu[a-zçğıöşü]*|masa[a-zçğıöşü]*|yatak[a-zçğıöşü]*|dolap[a-zçğıöşü]*|sehpa[a-zçğıöşü]*|ünite[a-zçğıöşü]*|tv ünitesi)\b/i;

  return addVerb.test(text) && (furnitureNoun.test(text) || /\b(armchair|berjer[a-zçğıöşü]*)\b/i.test(text));
}

function hasTransformVerbIntent(message: string) {
  const text = normalizeText(message);
  const verb =
    /\b(move|place|put|set|adjust|change|rotate|turn|resize|scale|shift|align|reposition|arrange|widen|narrow|increase|decrease|enlarge|reduce|grow|shrink|make|modify|döndür|çevir|taşı|yerleştir|koy|değiştir|güncelle|kaydır|yasla|yaklaştır|uzaklaştır|büyüt|küçült|genişlet|daralt)\b/i;

  return verb.test(text);
}

function hasObjectEditIntent(message: string) {
  const text = normalizeText(message);
  const noun =
    /\b(sofa|couch|chair|table|bed|wardrobe|tv|tv unit|desk|shelf|cabinet|furniture|object|item|koltuk[a-zçğıöşü]*|koltu[a-zçğıöşü]*|sandalye[a-zçğıöşü]*|sandaly[a-zçğıöşü]*|masa[a-zçğıöşü]*|yatak[a-zçğıöşü]*|dolap[a-zçğıöşü]*|sehpa[a-zçğıöşü]*|ünite[a-zçğıöşü]*|tv ünitesi|eşya[a-zçğıöşü]*|esya[a-zçğıöşü]*|mobilya[a-zçğıöşü]*)\b/i;

  return hasTransformVerbIntent(message) && (noun.test(text) || /\b(armchair|berjer[a-zçğıöşü]*)\b/i.test(text));
}

function hasRoomEditIntent(message: string) {
  const text = normalizeText(message);
  const verb = /\b(change|adjust|resize|scale|set|make|move|open|close|widen|narrow|increase|decrease|enlarge|reduce|modify|update|reshape|configure|create|döndür|çevir|taşı|yerleştir|yerlestir|değiştir|güncelle|genişlet|daralt|büyüt|küçült)\b/i;
  const noun =
    /\b(room|layout|scene|shape|width|depth|height|cutout|dimensions?|size|oda|plan|duvar|alan|ölçü|boyut|genişlik|derinlik|yükseklik|şekil)\b/i;

  return verb.test(text) && noun.test(text);
}

function getMentionedObjectIds(roomData: RoomData, message: string) {
  const text = normalizeText(message);
  const textAscii = asciiFold(text);
  const matches = new Set<string>();

  const addObjectsByCategory = (predicate: (object: RoomObject) => boolean) => {
    for (const object of roomData.objects) {
      if (predicate(object)) {
        matches.add(object.id);
      }
    }
  };

  if (/\b(sofa|couch|armchair|berjer[a-z??????]*|koltuk[a-z??????]*|koltu[a-z??????]*|kanape[a-z??????]*|kanepe[a-z??????]*)\b/i.test(text)) addObjectsByCategory((object) => object.category === "sofa");
  if (/\b(table|masa[a-zçğıöşü]*|desk|sehpa[a-zçğıöşü]*)\b/i.test(text)) addObjectsByCategory((object) => object.category === "table");
  if (/\b(chair|sandalye[a-zçğıöşü]*|sandaly[a-zçğıöşü]*)\b/i.test(text)) addObjectsByCategory((object) => object.category === "chair");
  if (/\b(bed|yatak[a-zçğıöşü]*)\b/i.test(text)) addObjectsByCategory((object) => object.category === "bed");
  if (/\b(wardrobe|dolap[a-zçğıöşü]*|closet)\b/i.test(text)) addObjectsByCategory((object) => object.category === "wardrobe");
  if (/\b(tv|television|televizyon|tv unit|tv ünitesi|tv ünit[a-zçğıöşü]*)\b/i.test(text)) {
    addObjectsByCategory((object) => object.category === "tv_unit");
  }
  if (/\b(carpet|rug|halı[a-zçğıöşü]*)\b/i.test(text)) addObjectsByCategory((object) => object.category === "carpet");

  for (const object of roomData.objects) {
    const matched = getObjectReferenceTerms(object).some((term) => {
      if (term.length < 3) {
        return false;
      }

      if (term.includes(" ")) {
        return textAscii.includes(term);
      }

      return new RegExp(`\\b${escapeRegex(term)}\\b`, "i").test(textAscii);
    });

    if (matched) {
      matches.add(object.id);
    }
  }

  return matches;
}

function hasAnyActionIntent(message: string) {
  return hasFurnitureAddIntent(message) || hasObjectEditIntent(message) || hasRoomEditIntent(message);
}

function isDirectManipulationRequest(message: string) {
  const text = normalizedAscii(message);
  return (
    includesAny(text, [
      "move",
      "shift",
      "place",
      "put",
      "set",
      "adjust",
      "align",
      "center",
      "centre",
      "middle",
      "rotate",
      "turn",
      "resize",
      "scale",
      "right",
      "left",
      "up",
      "down",
      "sag",
      "sol",
      "ileri",
      "geri",
      "yasla",
      "kaydir",
      "dondur",
      "cevir",
      "ortala",
      "yukari",
      "asagi",
      "boyut",
      "olcu",
      "genislik",
      "derinlik",
      "uzunluk",
      "yukseklik",
      "width",
      "depth",
      "height",
      "mount height",
      "duvar",
      "wall",
      "buyut",
      "kucult",
      "genislet",
      "daralt",
    ]) ||
    /\b[xyz]\s*(?:=|:)?\s*-?\d+(?:[.,]\d+)?/i.test(text)
  );
}

function hasDimensionChange(
  object: RoomObject,
  update: LayoutObjectUpdate,
) {
  if (!update.dimensions) {
    return false;
  }

  return (
    (typeof update.dimensions.width === "number" &&
      Math.abs(update.dimensions.width - object.dimensions.width) > EPSILON) ||
    (typeof update.dimensions.depth === "number" &&
      Math.abs(update.dimensions.depth - object.dimensions.depth) > EPSILON) ||
    (typeof update.dimensions.height === "number" &&
      Math.abs(update.dimensions.height - object.dimensions.height) > EPSILON)
  );
}

function hasMountHeightChange(object: RoomObject, update: LayoutObjectUpdate) {
  if (typeof update.mountHeight !== "number") {
    return false;
  }

  return Math.abs(update.mountHeight - getMountHeight(object)) > EPSILON;
}

function buildRefusalReply(language: Language, reason: "add" | "blocked") {
  if (language === "en") {
    return reason === "add"
      ? "I can refine existing items here, but I can't add new furniture from chat. Open the Kitchen workspace, drag the item into the room, then come back here and I can position, resize, or rotate it for you."
      : "I couldn't apply that safely because the requested change conflicts with the scene rules or the selected object is locked.";
  }

  return reason === "add"
    ? "Burada mevcut öğeleri düzenleyebilirim ama sohbetten yeni eşya ekleyemem. İşin Mutfağı'na geç, öğeyi sahneye sürükle, sonra burada konum, boyut ve döndürme için bana yaz."
    : "Bunu güvenli şekilde uygulayamadım. İstenen değişiklik sahne kurallarıyla çakışıyor ya da seçili öğe kilitli.";
}

function buildTargetRequiredReply(language: Language) {
  if (language === "en") {
    return "Please select an item first or name the exact item you want me to edit.";
  }

  return "Lütfen önce bir öğe seç ya da düzenlememi istediğin öğeyi açıkça belirt.";
}

function buildPartialNote(language: Language, addIntent: boolean, blockedCount: number, roomMissing: boolean, objectMissing: boolean) {
  if (language === "en") {
    const parts: string[] = [];

    if (blockedCount > 0) {
      parts.push("Some requested object changes were blocked by locks or motion rules.");
    }

    if (roomMissing) {
      parts.push("The room-level change could not be applied in this pass.");
    }

    if (objectMissing) {
      parts.push("The object-level change could not be applied in this pass.");
    }

    if (addIntent) {
      parts.push("New furniture still has to be added in the Kitchen workspace.");
    }

    return parts.join(" ");
  }

  const parts: string[] = [];

  if (blockedCount > 0) {
    parts.push("İstenen bazı nesne değişiklikleri kilitler veya hareket kuralları nedeniyle uygulanamadı.");
  }

  if (roomMissing) {
    parts.push("Oda düzeyi değişiklik bu turda uygulanamadı.");
  }

  if (objectMissing) {
    parts.push("Nesne düzeyi değişiklik bu turda uygulanamadı.");
  }

  if (addIntent) {
    parts.push("Yeni eşya ekleme hâlâ İşin Mutfağı'nda yapılmalı.");
  }

  return parts.join(" ");
}

function buildAppliedTargets(
  language: Language,
  roomData: RoomData,
  safeObjects: LayoutResponse["objects"],
) {
  return safeObjects
    .map((update) => {
      const object = roomData.objects.find((entry) => entry.id === update.id);
      return object ? getLocalizedObjectLabel(language, object) : null;
    })
    .filter((label): label is string => Boolean(label))
    .slice(0, 3);
}

function buildOutcomeReply(params: {
  language: Language;
  roomData: RoomData;
  safeObjects: LayoutResponse["objects"];
  roomChanged: boolean;
  objectChanged: boolean;
  blockedCount: number;
  addIntent: boolean;
  roomMissing: boolean;
  objectMissing: boolean;
  selectedObjectMissing: boolean;
  hasClippedChanges: boolean;
}) {
  const {
    language,
    roomData,
    safeObjects,
    roomChanged,
    objectChanged,
    blockedCount,
    addIntent,
    roomMissing,
    objectMissing,
    selectedObjectMissing,
    hasClippedChanges,
  } = params;

  if (addIntent) {
    return buildRefusalReply(language, "add");
  }

  const appliedTargets = buildAppliedTargets(language, roomData, safeObjects);
  const appliedText =
    appliedTargets.length > 0
      ? language === "en"
        ? `Applied safe changes to ${appliedTargets.join(", ")}.`
        : `Güvenli değişiklikleri ${appliedTargets.join(", ")} üzerinde uyguladım.`
      : language === "en"
        ? "Applied the safe parts of your request."
        : "İsteğinin güvenli kısmını uyguladım.";

  const details: string[] = [];

  if (roomChanged && roomMissing) {
    details.push(
      language === "en"
        ? "The room-level change could not be completed."
        : "Oda düzeyi değişiklik tamamlanamadı.",
    );
  }

  if ((objectChanged && objectMissing) || selectedObjectMissing) {
    details.push(
      language === "en"
        ? "The requested object change could not be applied exactly as asked."
        : "İstenen nesne değişikliği tam olarak uygulanamadı.",
    );
  }

  if (blockedCount > 0) {
    details.push(
      language === "en"
        ? "Some parts were blocked by locks or motion rules."
        : "Bazı kısımlar kilitler veya hareket kuralları nedeniyle engellendi.",
    );
  }

  if (hasClippedChanges) {
    details.push(
      language === "en"
        ? "Some values were clipped to fit the scene safely."
        : "Bazı değerler sahneye güvenli biçimde sığması için kırpıldı.",
    );
  }

  if (!roomChanged && !objectChanged) {
    return language === "en"
      ? "I couldn't apply that safely."
      : "Bunu güvenli şekilde uygulayamadım.";
  }

  if (!details.length) {
    return roomChanged && !objectChanged
      ? language === "en"
        ? "Room settings updated."
        : "Oda ayarları güncellendi."
      : language === "en"
        ? "Requested changes applied."
        : "İstenen değişiklikler uygulandı.";
  }

  return `${appliedText} ${details.join(" ")}`.trim();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseMeasuredNumber(rawValue: string, rawUnit?: string) {
  const value = Number(rawValue.replace(",", "."));

  if (!Number.isFinite(value)) {
    return null;
  }

  return rawUnit?.toLowerCase() === "cm" ? value / 100 : value;
}

function extractMeasuredNumber(text: string, keywords: string[]) {
  const source = keywords.map(escapeRegex).join("|");
  const patterns = [
    new RegExp(`(?:^|\\b)(?:${source})(?:\\b|$)\\s*(?:=|:|to|as|is|set to|make|yap|olsun)?\\s*(-?\\d+(?:[.,]\\d+)?)\\s*(cm|m|meter|metre)?`, "i"),
    new RegExp(`(-?\\d+(?:[.,]\\d+)?)\\s*(cm|m|meter|metre)?\\s*(?:^|\\b)(?:${source})(?:\\b|$)`, "i"),
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const parsed = match?.[1] ? parseMeasuredNumber(match[1], match[2]) : null;

    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

function getRelatedWarnings(roomData: RoomData, objectId: string) {
  return validateRoomLayout(roomData).filter(
    (warning) => warning.objectId === objectId || warning.relatedObjectId === objectId,
  );
}

function getWarningSignature(warning: { code: string; objectId?: string; relatedObjectId?: string }) {
  return `${warning.code}:${warning.objectId ?? ""}:${warning.relatedObjectId ?? ""}`;
}

function isBlockingLayoutWarning(warning: { code: string; level: "warning" | "error" }) {
  return (
    warning.level === "error" ||
    warning.code === "collision" ||
    warning.code.endsWith("_clearance")
  );
}

function buildObjectUpdateFromObject(before: RoomObject, after: RoomObject): LayoutObjectUpdate {
  const update: LayoutObjectUpdate = {
    id: after.id,
    x: after.position.x,
    z: after.position.z,
    rotation: after.rotation,
  };

  if (Math.abs(getMountHeight(after) - getMountHeight(before)) > EPSILON) {
    update.mountHeight = getMountHeight(after);
  }

  if (
    Math.abs(after.dimensions.width - before.dimensions.width) > EPSILON ||
    Math.abs(after.dimensions.depth - before.dimensions.depth) > EPSILON ||
    Math.abs(after.dimensions.height - before.dimensions.height) > EPSILON
  ) {
    update.dimensions = {
      width: after.dimensions.width,
      depth: after.dimensions.depth,
      height: after.dimensions.height,
    };
  }

  return update;
}

function revertObject(target: RoomObject, snapshot: RoomObject) {
  Object.assign(target, cloneRoomObject(snapshot));
}

function buildWallPlacement(
  roomData: RoomData,
  object: RoomObject,
  wallId: string,
  alongRatio: number,
  nextDimensions?: Partial<RoomObject["dimensions"]>,
) {
  const wall = getWallSegment(roomData.room, wallId);

  if (!wall) {
    return null;
  }

  const width = nextDimensions?.width ?? object.dimensions.width;
  const depth = nextDimensions?.depth ?? object.dimensions.depth;
  const metrics = getWallMetrics(wall);
  const halfAlong = Math.min(width / 2, metrics.length / 2);
  const minAlong = Math.min(metrics.length / 2, halfAlong + 0.08);
  const maxAlong = Math.max(minAlong, metrics.length - halfAlong - 0.08);
  const along = Math.min(maxAlong, Math.max(minAlong, metrics.length * alongRatio));
  const wallX = wall.from[0] + metrics.directionX * along;
  const wallZ = wall.from[1] + metrics.directionZ * along;
  const rotation = normalizeRotation(
    (Math.atan2(metrics.inwardNormalX, metrics.inwardNormalZ) * 180) / Math.PI,
  );

  if (isWallAttachedObject(object)) {
    return {
      position: { x: wallX, z: wallZ },
      rotation,
    };
  }

  const offset = depth / 2 + 0.08;
  return {
    position: {
      x: wallX + metrics.inwardNormalX * offset,
      z: wallZ + metrics.inwardNormalZ * offset,
    },
    rotation,
  };
}

function tryApplyObjectUpdate(
  roomData: RoomData,
  objectId: string,
  payload: {
    position?: { x: number; z: number };
    rotation?: number;
    dimensions?: Partial<RoomObject["dimensions"]>;
    mountHeight?: number;
  },
  requested: {
    position?: { x: number; z: number };
    rotation?: number;
    dimensions?: Partial<RoomObject["dimensions"]>;
    mountHeight?: number;
  },
) {
  const target = roomData.objects.find((object) => object.id === objectId);

  if (!target) {
    return null;
  }

  const before = cloneRoomObject(target);
  const beforeWarnings = new Set(getRelatedWarnings(roomData, objectId).map(getWarningSignature));
  const applied = applyObjectUpdate(roomData, target, payload);

  if (!applied) {
    return null;
  }

  const after = roomData.objects.find((object) => object.id === objectId) ?? target;
  const changed =
    Math.abs(after.position.x - before.position.x) > EPSILON ||
    Math.abs(after.position.z - before.position.z) > EPSILON ||
    Math.abs(normalizeRotation(after.rotation) - normalizeRotation(before.rotation)) > EPSILON ||
    Math.abs(getMountHeight(after) - getMountHeight(before)) > EPSILON ||
    Math.abs(after.dimensions.width - before.dimensions.width) > EPSILON ||
    Math.abs(after.dimensions.depth - before.dimensions.depth) > EPSILON ||
    Math.abs(after.dimensions.height - before.dimensions.height) > EPSILON;

  if (!changed) {
    revertObject(target, before);
    return null;
  }

  const afterWarnings = getRelatedWarnings(roomData, objectId);
  const newBlockingWarnings = afterWarnings.filter(
    (warning) => isBlockingLayoutWarning(warning) && !beforeWarnings.has(getWarningSignature(warning)),
  );

  if (newBlockingWarnings.length) {
    revertObject(target, before);
    return null;
  }

  const update = buildObjectUpdateFromObject(before, after);
  const hasClippedChanges =
    (requested.position?.x !== undefined && Math.abs(requested.position.x - after.position.x) > EPSILON) ||
    (requested.position?.z !== undefined && Math.abs(requested.position.z - after.position.z) > EPSILON) ||
    (requested.rotation !== undefined && Math.abs(normalizeRotation(requested.rotation) - normalizeRotation(after.rotation)) > EPSILON) ||
    (requested.mountHeight !== undefined && Math.abs(requested.mountHeight - getMountHeight(after)) > EPSILON) ||
    (requested.dimensions?.width !== undefined && Math.abs(requested.dimensions.width - after.dimensions.width) > EPSILON) ||
    (requested.dimensions?.depth !== undefined && Math.abs(requested.dimensions.depth - after.dimensions.depth) > EPSILON) ||
    (requested.dimensions?.height !== undefined && Math.abs(requested.dimensions.height - after.dimensions.height) > EPSILON);

  return { update, hasClippedChanges };
}

function buildSceneInfoFallback(params: {
  language: Language;
  roomData: RoomData;
  message: string;
  selection?:
    | {
        objectId?: string | null;
        objectIds?: string[];
        groupId?: string | null;
      }
    | null;
}) {
  const text = normalizedAscii(params.message);

  if (hasAnyActionIntent(params.message) || hasFurnitureAddIntent(params.message)) {
    return null;
  }

  if (includesAny(text, ["what can you do", "help", "yardim", "neler yapabilirsin", "ne yapabilirsin"])) {
    return {
      reply:
        params.language === "en"
          ? "I can move, align, rotate, resize, and describe existing items and room settings. I can also report positions, dimensions, locks, walls, and room measurements. I can't add new furniture from chat; add it in the Kitchen workspace first."
          : "Mevcut öğeleri taşıyabilir, hizalayabilir, döndürebilir, yeniden boyutlandırabilir ve açıklayabilirim. Ayrıca konum, ölçü, kilit, duvar ve oda bilgilerini aktarabilirim. Sohbetten yeni eşya ekleyemem; önce İşin Mutfağı'nda eklenmesi gerekir.",
      layout: {
        layoutName: params.language === "en" ? "Scene info" : "Sahne bilgisi",
        summary: params.language === "en" ? "Reported the current scene capabilities." : "Mevcut sahne yetenekleri aktarıldı.",
        objects: [],
        constraintsRespected: [],
        warnings: [],
      },
    } satisfies LayoutChatResult;
  }

  const selectedObjectId = params.selection?.objectId ?? params.selection?.objectIds?.at(-1) ?? null;
  const selectedObject = selectedObjectId
    ? params.roomData.objects.find((object) => object.id === selectedObjectId) ?? null
    : null;

  if (
    selectedObject &&
    includesAny(text, ["selected", "secili", "object", "item", "esya", "boyut", "olcu", "size", "dimension", "position", "konum", "rotation", "donus", "lock", "kilit"])
  ) {
    return {
      reply:
        params.language === "en"
          ? `Selected item: ${selectedObject.label}. Position x=${selectedObject.position.x.toFixed(2)}, y=${selectedObject.position.z.toFixed(2)}, z=${getMountHeight(selectedObject).toFixed(2)}. Size ${selectedObject.dimensions.width.toFixed(2)} x ${selectedObject.dimensions.depth.toFixed(2)} x ${selectedObject.dimensions.height.toFixed(2)} m. Rotation ${Math.round(selectedObject.rotation)}°. Locked: ${selectedObject.locked ? "yes" : "no"}.`
          : `Seçili öğe: ${selectedObject.label}. Konum x=${selectedObject.position.x.toFixed(2)}, y=${selectedObject.position.z.toFixed(2)}, z=${getMountHeight(selectedObject).toFixed(2)}. Boyut ${selectedObject.dimensions.width.toFixed(2)} x ${selectedObject.dimensions.depth.toFixed(2)} x ${selectedObject.dimensions.height.toFixed(2)} m. Dönüş ${Math.round(selectedObject.rotation)}°. Kilitli: ${selectedObject.locked ? "evet" : "hayır"}.`,
      layout: {
        layoutName: params.language === "en" ? "Selection info" : "Seçim bilgisi",
        summary: params.language === "en" ? "Reported the selected item details." : "Seçili öğe ayrıntıları aktarıldı.",
        objects: [],
        constraintsRespected: [],
        warnings: [],
      },
    } satisfies LayoutChatResult;
  }

  if (includesAny(text, ["room", "oda", "shape", "sekil", "dimension", "olcu", "boyut", "wall", "duvar", "object count", "esya", "how many", "kac"])) {
    return {
      reply:
        params.language === "en"
          ? `Room: ${params.roomData.room.shape}, ${params.roomData.room.width.toFixed(2)}m x ${params.roomData.room.depth.toFixed(2)}m x ${params.roomData.room.height.toFixed(2)}m. Walls: ${params.roomData.room.walls.length}. Openings: ${params.roomData.room.openings.length}. Objects: ${params.roomData.objects.length}.`
          : `Oda: ${params.roomData.room.shape}, ${params.roomData.room.width.toFixed(2)}m x ${params.roomData.room.depth.toFixed(2)}m x ${params.roomData.room.height.toFixed(2)}m. Duvar: ${params.roomData.room.walls.length}. Açıklık: ${params.roomData.room.openings.length}. Öğe: ${params.roomData.objects.length}.`,
      layout: {
        layoutName: params.language === "en" ? "Room info" : "Oda bilgisi",
        summary: params.language === "en" ? "Reported the current room metrics." : "Mevcut oda ölçüleri aktarıldı.",
        objects: [],
        constraintsRespected: [],
        warnings: [],
      },
    } satisfies LayoutChatResult;
  }

  return null;
}

function buildDirectManipulationFallback(params: {
  language: Language;
  roomData: RoomData;
  message: string;
  targetIds: string[];
}) {
  const text = normalizedAscii(params.message);
  const roomData = cloneRoomData(params.roomData);
  const targetIds = params.targetIds.filter((id) => id.trim().length > 0);

  if (!targetIds.length) {
    return null;
  }

  const wantsRight = includesAny(text, ["right", "sag"]);
  const wantsLeft = includesAny(text, ["left", "sol"]);
  const wantsForward = includesAny(text, ["forward", "front", "ileri", "on", "one"]);
  const wantsBackward = includesAny(text, ["back", "backward", "geri", "arka"]);
  const wantsWall = includesAny(text, ["wall", "duvar", "yasla"]);
  const wantsRotate = includesAny(text, ["rotate", "turn", "dondur", "cevir"]);
  const wantsResize = includesAny(text, ["resize", "scale", "buyut", "kucult", "genislet", "daralt"]);
  const wantsUp = includesAny(text, ["up", "yukari", "raise", "higher", "lift"]);
  const wantsDown = includesAny(text, ["down", "asagi", "lower"]);
  const wantsCenter = includesAny(text, ["center", "centre", "middle", "mid", "ortala", "orta"]);
  const wantsEmptyArea = includesAny(text, ["empty area", "empty spot", "bos alan", "bos bir alan", "uygun yer"]);
  const requestedWallNumber = text.match(/\b(?:wall|duvar)\s*(\d+)\b/i)?.[1] ?? null;
  const requestedWallId = requestedWallNumber ? `wall_${requestedWallNumber}` : null;
  const absoluteX = extractMeasuredNumber(text, ["x"]);
  const absoluteY = extractMeasuredNumber(text, ["y"]);
  const absoluteVertical = extractMeasuredNumber(text, ["z", "mount height", "aski yuksekligi"]);
  const widthValue = extractMeasuredNumber(text, ["width", "genislik", "en"]);
  const depthValue = extractMeasuredNumber(text, ["depth", "derinlik", "boy", "uzunluk"]);
  const heightValue = extractMeasuredNumber(text, ["height", "object height", "obje yukseklik", "yukseklik"]);
  const rotationMatch =
    text.match(/(?:rotate|rotation|angle|degree|degrees|derece|dondur|cevir)\s*(?:to|=|:)?\s*(-?\d+(?:[.,]\d+)?)/i) ??
    text.match(/(-?\d+(?:[.,]\d+)?)\s*(?:deg|degree|degrees|derece|°)/i);
  const moveStep = Math.max(0.3, Math.min(0.65, Math.min(roomData.room.width, roomData.room.depth) * 0.08));
  const resizeFactor = includesAny(text, ["buyut", "genislet", "increase", "bigger", "wider", "larger"])
    ? 1.12
    : 0.9;
  const rotationDelta = includesAny(text, ["180"]) ? 180 : 90;
  const safeObjects: LayoutResponse["objects"] = [];
  let blockedCount = 0;
  let hasClippedChanges = false;

  for (const objectId of targetIds) {
    const target = roomData.objects.find((object) => object.id === objectId);

    if (!target) {
      continue;
    }

    const before = cloneRoomObject(target);
    const requestedDimensions: Partial<RoomObject["dimensions"]> = {};
    const widthRequested = widthValue !== null || includesAny(text, ["width", "genislik", "wide", "en"]);
    const depthRequested = depthValue !== null || includesAny(text, ["depth", "derinlik", "boy", "uzunluk"]);
    const heightRequested = heightValue !== null || includesAny(text, ["height", "yukseklik", "tall"]);

    if (widthValue !== null) {
      requestedDimensions.width = widthValue;
    } else if (wantsResize && (widthRequested || (!depthRequested && !heightRequested))) {
      requestedDimensions.width = before.dimensions.width * resizeFactor;
    }

    if (depthValue !== null) {
      requestedDimensions.depth = depthValue;
    } else if (wantsResize && (depthRequested || (!widthRequested && !heightRequested))) {
      requestedDimensions.depth = before.dimensions.depth * resizeFactor;
    }

    if (heightValue !== null) {
      requestedDimensions.height = heightValue;
    } else if (wantsResize && heightRequested) {
      requestedDimensions.height = before.dimensions.height * resizeFactor;
    }

    const rotateLeft = includesAny(text, ["rotate left", "turn left", "left turn", "sola dondur", "sola cevir"]);
    const explicitRotation = rotationMatch?.[1] ? Number(rotationMatch[1].replace(",", ".")) : null;
    const nextRotation =
      explicitRotation !== null && Number.isFinite(explicitRotation)
        ? explicitRotation
        : wantsRotate
          ? normalizeRotation(before.rotation + (rotateLeft ? -rotationDelta : rotationDelta))
          : undefined;
    const nextMountHeight =
      isWallAttachedObject(before) && absoluteVertical !== null
        ? absoluteVertical
        : isWallAttachedObject(before) && (wantsUp || wantsDown)
          ? Math.max(0, getMountHeight(before) + (wantsUp && !wantsDown ? moveStep / 2 : -moveStep / 2))
          : undefined;
    const nextPosition = {
      x: absoluteX ?? before.position.x,
      z: absoluteY ?? before.position.z,
    };

    if (absoluteX === null) {
      if (wantsLeft) nextPosition.x -= moveStep;
      if (wantsRight) nextPosition.x += moveStep;
    }

    if (absoluteY === null) {
      if (wantsForward) nextPosition.z -= moveStep;
      if (wantsBackward) nextPosition.z += moveStep;
    }

    if (
      wantsCenter &&
      absoluteX === null &&
      absoluteY === null &&
      !wantsLeft &&
      !wantsRight &&
      !wantsForward &&
      !wantsBackward &&
      !isWallAttachedObject(before)
    ) {
      nextPosition.x = roomData.room.width / 2;
      nextPosition.z = roomData.room.depth / 2;
    }

    const nextWallId =
      requestedWallId ??
      (wantsWall || wantsEmptyArea || (wantsCenter && isWallAttachedObject(before))
        ? projectPointToWall(roomData.room, before.position)?.wall.id ?? null
        : null);
    const wallRatios = wantsEmptyArea
      ? [0.2, 0.35, 0.5, 0.65, 0.8]
      : wantsCenter
        ? [0.5, 0.35, 0.65, 0.2, 0.8]
        : [0.18, 0.35, 0.5, 0.65, 0.82];
    const candidatePayloads: Array<{
      position?: { x: number; z: number };
      rotation?: number;
      dimensions?: Partial<RoomObject["dimensions"]>;
      mountHeight?: number;
    }> = [];

    if (nextWallId) {
      for (const ratio of wallRatios) {
        const wallPlacement = buildWallPlacement(roomData, before, nextWallId, ratio, requestedDimensions);

        if (!wallPlacement) {
          continue;
        }

        candidatePayloads.push({
          position: wallPlacement.position,
          rotation: wallPlacement.rotation,
          dimensions: Object.keys(requestedDimensions).length ? requestedDimensions : undefined,
          mountHeight: nextMountHeight,
        });
      }
    } else {
      candidatePayloads.push({
        position:
          absoluteX !== null ||
          absoluteY !== null ||
          wantsLeft ||
          wantsRight ||
          wantsForward ||
          wantsBackward ||
          wantsCenter
            ? nextPosition
            : undefined,
        rotation: nextRotation,
        dimensions: Object.keys(requestedDimensions).length ? requestedDimensions : undefined,
        mountHeight: nextMountHeight,
      });
    }

    let applied = false;

    for (const payload of candidatePayloads) {
      const result = tryApplyObjectUpdate(roomData, objectId, payload, payload);

      if (!result) {
        continue;
      }

      safeObjects.push(result.update);
      hasClippedChanges ||= result.hasClippedChanges;
      applied = true;
      break;
    }

    if (!applied) {
      blockedCount += 1;
    }
  }

  if (!safeObjects.length) {
    return null;
  }

  const warnings = unique([
    params.language === "en"
      ? "Used a local fallback to apply the direct manipulation request."
      : "Doğrudan işlem isteği için yerel bir yedek uygulama kullanıldı.",
    blockedCount > 0
      ? params.language === "en"
        ? "Some selected items could not be changed because they are locked or constrained."
        : "Seçili öğelerin bazıları kilitli ya da kısıtlı olduğu için değiştirilemedi."
      : "",
    hasClippedChanges
      ? params.language === "en"
        ? "Some values were clipped to keep the scene valid."
        : "Bazı değerler sahneyi geçerli tutmak için kırpıldı."
      : "",
  ]);

  return {
    reply: buildOutcomeReply({
      language: params.language,
      roomData: params.roomData,
      safeObjects,
      roomChanged: false,
      objectChanged: true,
      blockedCount,
      addIntent: false,
      roomMissing: false,
      objectMissing: false,
      selectedObjectMissing: false,
      hasClippedChanges,
    }),
    layout: {
      layoutName: params.language === "en" ? "Direct manipulation fallback" : "Doğrudan işlem yedeği",
      summary:
        params.language === "en"
          ? "Applied a local fallback for the selected object(s)."
          : "Seçili öğe(ler) için yerel bir yedek uygulandı.",
      objects: safeObjects,
      constraintsRespected: ["locked_objects"],
      warnings,
    },
  } satisfies LayoutChatResult;
}

export function sanitizeLayoutChatResult(params: {
  message: string;
  roomData: RoomData;
  locale: Language;
  selection?:
    | {
        objectId?: string | null;
        objectIds?: string[];
        groupId?: string | null;
        structure?:
          | {
              type: "wall" | "opening";
              id: string;
            }
          | null;
      }
    | null;
  result: LayoutChatResult;
}): LayoutChatResult {
  const language = detectLanguage(params.message, params.locale);
  const sourceLayout = params.result.layout;
  const trialRoomData = cloneRoomData(params.roomData);
  const safeObjects: LayoutResponse["objects"] = [];
  const warnings = [...sourceLayout.warnings];
  const constraintsRespected = new Set(sourceLayout.constraintsRespected);
  const addIntent = hasFurnitureAddIntent(params.message);
  const objectIntent = hasObjectEditIntent(params.message);
  const roomIntent = hasRoomEditIntent(params.message);
  const hasDeicticReference = /\b(this|selected|it|bunu|onu|şunu|şu|seçili|secili|bu)\b/i.test(
    normalizeText(params.message),
  );
  const selectedObjectIds = new Set<string>();

  if (params.selection?.objectId) {
    selectedObjectIds.add(params.selection.objectId);
  }

  for (const objectId of params.selection?.objectIds ?? []) {
    selectedObjectIds.add(objectId);
  }

  if (params.selection?.groupId) {
    const group = params.roomData.groups?.find((entry) => entry.id === params.selection?.groupId);

    for (const objectId of group?.objectIds ?? []) {
      selectedObjectIds.add(objectId);
    }
  }

  const mentionedObjectIds = getMentionedObjectIds(params.roomData, params.message);
  const explicitTargetIds = new Set<string>([
    ...selectedObjectIds,
    ...mentionedObjectIds,
  ]);
  const deicticActionIntent = hasDeicticReference && selectedObjectIds.size > 0;
  const selectedTransformIntent =
    selectedObjectIds.size > 0 && hasTransformVerbIntent(params.message);
  const actionIntent = hasAnyActionIntent(params.message) || deicticActionIntent || selectedTransformIntent;
  const hasSafeRoomChange = Boolean(sourceLayout.room);
  const canApplyObjectUpdates = explicitTargetIds.size > 0;
  let blockedCount = 0;
  let hasClippedChanges = false;

  const directManipulationRequest = isDirectManipulationRequest(params.message);

  if (directManipulationRequest && explicitTargetIds.size > 0 && !hasSafeRoomChange) {
    const fallback = buildDirectManipulationFallback({
      language,
      roomData: params.roomData,
      message: params.message,
      targetIds: [...explicitTargetIds],
    });

    if (fallback) {
      return fallback;
    }
  }

  const infoFallback = buildSceneInfoFallback({
    language,
    roomData: params.roomData,
    message: params.message,
    selection: params.selection ?? null,
  });

  if (infoFallback) {
    return infoFallback;
  }

  if (addIntent) {
    const note = buildPartialNote(language, true, 0, false, false);
    return {
      reply: buildRefusalReply(language, "add"),
      layout: {
        ...sourceLayout,
        room: undefined,
        objects: [],
        warnings: unique([...warnings, note]),
        constraintsRespected: unique([...constraintsRespected, "locked_objects"]),
      },
    };
  }

  if (actionIntent && !canApplyObjectUpdates && !hasSafeRoomChange && !roomIntent) {
    return {
      reply: buildTargetRequiredReply(language),
      layout: {
        ...sourceLayout,
        room: undefined,
        objects: [],
        warnings: unique([
          ...warnings,
          language === "en"
            ? "No editable target could be resolved from the request."
            : "İstekten düzenlenebilir bir hedef çözümlenemedi.",
        ]),
        constraintsRespected: unique([...constraintsRespected]),
      },
    };
  }

  for (const update of sourceLayout.objects) {
    if (!canApplyObjectUpdates || !explicitTargetIds.has(update.id)) {
      continue;
    }

    const target = trialRoomData.objects.find((object) => object.id === update.id);

    if (!target) {
      blockedCount += 1;
      warnings.push(
        language === "en"
          ? `Skipped unknown object id: ${update.id}.`
          : `Bilinmeyen nesne atlandı: ${update.id}.`,
      );
      continue;
    }

    const before = cloneRoomObject(target);
    const hasRequestedChange =
      (typeof update.x === "number" && Math.abs(update.x - target.position.x) > EPSILON) ||
      (typeof update.z === "number" && Math.abs(update.z - target.position.z) > EPSILON) ||
      (typeof update.rotation === "number" &&
        normalizeRotation(update.rotation) !== normalizeRotation(target.rotation)) ||
      hasMountHeightChange(target, update) ||
      hasDimensionChange(target, update);

    if (!hasRequestedChange) {
      continue;
    }

    const requestedPayload = {
      position:
        typeof update.x === "number" || typeof update.z === "number"
          ? { x: update.x, z: update.z }
          : undefined,
      rotation: update.rotation,
      dimensions: update.dimensions,
      mountHeight: update.mountHeight,
    };

    const result = tryApplyObjectUpdate(
      trialRoomData,
      update.id,
      requestedPayload,
      requestedPayload,
    );

    if (!result) {
      blockedCount += 1;
      warnings.push(
        language === "en"
          ? `Could not safely modify ${before.label}. It may be locked, constrained, or colliding with the scene.`
          : `${before.label} güvenli şekilde değiştirilemedi. Kilitli olabilir, hareket kısıtına takılabilir ya da sahneyle çakışıyor olabilir.`,
      );
      continue;
    }

    safeObjects.push(result.update);

    if (result.hasClippedChanges) {
      hasClippedChanges = true;
      warnings.push(
        language === "en"
          ? `Some requested values were clipped to keep ${before.label} valid in the scene.`
          : `${before.label} için istenen bazı değerler sahnede geçerli kalması için kırpıldı.`,
      );
    }
  }

  const hasSafeObjectChange = safeObjects.length > 0;
  const hasSafeChange = hasSafeRoomChange || hasSafeObjectChange;
  const roomMissing = roomIntent && !hasSafeRoomChange;

  const selectedObjectMissing =
    hasDeicticReference &&
    selectedObjectIds.size > 0 &&
    ![...selectedObjectIds].every((objectId) =>
      safeObjects.some((update) => update.id === objectId),
    );
  const mentionedObjectMissing =
    mentionedObjectIds.size > 0 &&
    objectIntent &&
    ![...mentionedObjectIds].every((objectId) =>
      safeObjects.some((update) => update.id === objectId),
    );
  const objectMissing =
    (objectIntent && !hasSafeObjectChange) || mentionedObjectMissing;

  let reply = sourceLayout.warnings.length > 0 ? params.result.reply.trim() : params.result.reply;

  if (actionIntent && !hasSafeChange) {
    reply = buildRefusalReply(language, addIntent ? "add" : "blocked");
  } else if (
    hasSafeChange &&
    (blockedCount > 0 || roomMissing || objectMissing || selectedObjectMissing || hasClippedChanges)
  ) {
    const note = buildPartialNote(
      language,
      addIntent,
      blockedCount,
      roomMissing,
      objectMissing || selectedObjectMissing,
    );
    if (note) {
      warnings.push(note);
    }

    reply = buildOutcomeReply({
      language,
      roomData: params.roomData,
      safeObjects,
      roomChanged: hasSafeRoomChange,
      objectChanged: hasSafeObjectChange,
      blockedCount,
      addIntent,
      roomMissing,
      objectMissing,
      selectedObjectMissing,
      hasClippedChanges,
    });
  }

  if (blockedCount > 0 || addIntent || roomMissing || objectMissing) {
    constraintsRespected.add("locked_objects");
  }

  return {
    reply,
    layout: {
      ...sourceLayout,
      objects: safeObjects,
      warnings: unique([...warnings]),
      constraintsRespected: unique([...constraintsRespected]),
    },
  };
}
