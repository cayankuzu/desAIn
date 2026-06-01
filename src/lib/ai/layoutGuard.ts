import { applyObjectUpdate } from "@/lib/room/applyObjectUpdate";
import { getMountHeight, normalizeRotation } from "@/lib/room/constraints";
import { getLocalizedObjectLabel } from "@/lib/i18n/translations";
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

const includesAny = (text: string, keywords: string[]) =>
  keywords.some((keyword) => text.includes(keyword));

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

  return matches;
}

function hasAnyActionIntent(message: string) {
  return hasFurnitureAddIntent(message) || hasObjectEditIntent(message) || hasRoomEditIntent(message);
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
      ? "I can't add new furniture from this view. Please switch to the Kitchen workspace to place or create items, then come back here to keep refining the scene."
      : "I couldn't apply that safely because the requested change conflicts with the scene rules or the selected object is locked.";
  }

  return reason === "add"
    ? "Bu görünümden yeni eşya ekleyemem. Eşya eklemek veya oluşturmak için İşin Mutfağı'na geç, sonra sahneyi burada ince ayarla."
    : "Bunu güvenli şekilde uygulayamadım. İstenen değişiklik sahne kurallarıyla çakışıyor ya da seçili öğe kilitli.";
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

    const applied = applyObjectUpdate(trialRoomData, target, {
      position: typeof update.x === "number" || typeof update.z === "number" ? { x: update.x, z: update.z } : undefined,
      rotation: update.rotation,
      dimensions: update.dimensions,
      mountHeight: update.mountHeight,
    });

    if (!applied) {
      blockedCount += 1;
      warnings.push(
        language === "en"
          ? `Could not modify ${before.label} because it is locked or non-movable.`
          : `${before.label} kilitli ya da taşınamaz olduğu için değiştirilemedi.`,
      );
      continue;
    }

    const after = trialRoomData.objects.find((object) => object.id === update.id) ?? target;
    const changed =
      Math.abs(after.position.x - before.position.x) > EPSILON ||
      Math.abs(after.position.z - before.position.z) > EPSILON ||
      Math.abs(normalizeRotation(after.rotation) - normalizeRotation(before.rotation)) > EPSILON ||
      Math.abs(getMountHeight(after) - getMountHeight(before)) > EPSILON ||
      Math.abs(after.dimensions.width - before.dimensions.width) > EPSILON ||
      Math.abs(after.dimensions.depth - before.dimensions.depth) > EPSILON ||
      Math.abs(after.dimensions.height - before.dimensions.height) > EPSILON;

    if (!changed) {
      blockedCount += 1;
      warnings.push(
        language === "en"
          ? `No safe change could be applied to ${before.label}.`
          : `${before.label} için güvenli bir değişiklik uygulanamadı.`,
      );
      continue;
    }

    const nextObjectUpdate: LayoutObjectUpdate = {
      id: after.id,
      x: after.position.x,
      z: after.position.z,
      rotation: after.rotation,
    };

    if (typeof update.mountHeight === "number") {
      nextObjectUpdate.mountHeight = getMountHeight(after);
    }

    if (update.dimensions) {
      nextObjectUpdate.dimensions = {
        width: after.dimensions.width,
        depth: after.dimensions.depth,
        height: after.dimensions.height,
      };
    }

    safeObjects.push(nextObjectUpdate);

    if (
      (typeof update.x === "number" && Math.abs(update.x - after.position.x) > EPSILON) ||
      (typeof update.z === "number" && Math.abs(update.z - after.position.z) > EPSILON) ||
      (typeof update.rotation === "number" &&
        Math.abs(normalizeRotation(update.rotation) - normalizeRotation(after.rotation)) > EPSILON) ||
      (typeof update.mountHeight === "number" &&
        Math.abs(update.mountHeight - getMountHeight(after)) > EPSILON)
    ) {
      hasClippedChanges = true;
      warnings.push(
        language === "en"
          ? `Some requested values were clipped to match scene rules for ${after.label}.`
          : `${after.label} için istenen bazı değerler sahne kurallarına uyacak şekilde kısaltıldı.`,
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
