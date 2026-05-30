import type { LayoutWarning, ObjectCategory, RoomData, RoomObject } from "@/types/room";

export type Locale = "en" | "tr";

export type StatusKey =
  | "roomLoaded"
  | "objectSelected"
  | "selectionCleared"
  | "cameraOrbit"
  | "cameraTop"
  | "modeSelect"
  | "modeTranslate"
  | "modeRotate"
  | "objectEditing"
  | "objectUpdated"
  | "objectPropertiesUpdated"
  | "objectRotated"
  | "objectLocked"
  | "objectUnlocked"
  | "undoApplied"
  | "redoApplied"
  | "sceneReset";

export interface EditorStatus {
  key: StatusKey;
  objectId?: string;
}

export type MessageKey =
  | "appTitle"
  | "appDescription"
  | "editorTitle"
  | "language"
  | "english"
  | "turkish"
  | "noObjectSelected"
  | "selectedSuffix"
  | "selectMode"
  | "moveMode"
  | "rotateMode"
  | "viewMode"
  | "undo"
  | "redo"
  | "resetScene"
  | "sceneValidated"
  | "validationWarnings"
  | "viewport"
  | "perspectiveView"
  | "topView"
  | "selection"
  | "roomMetrics"
  | "width"
  | "depth"
  | "height"
  | "widthShort"
  | "depthShort"
  | "heightShort"
  | "warnings"
  | "viewportStatus"
  | "selectionModeActive"
  | "moveGizmoActive"
  | "rotateGizmoActive"
  | "inspectorPanel"
  | "details"
  | "outliner"
  | "validate"
  | "json"
  | "keys"
  | "sceneMetrics"
  | "objectDetails"
  | "selectObjectHint"
  | "worldOutliner"
  | "locked"
  | "open"
  | "editable"
  | "positionX"
  | "positionZ"
  | "rotation"
  | "color"
  | "category"
  | "applyValues"
  | "rotateMinus15"
  | "rotatePlus15"
  | "unlock"
  | "lock"
  | "lockedEditHint"
  | "noValidationIssues"
  | "sceneJson"
  | "shortcuts"
  | "objectCount"
  | "otherObject"
  | "genericObject";

const translations: Record<Locale, Record<MessageKey, string>> = {
  en: {
    appTitle: "desAIn | Turn your room into 3D",
    appDescription:
      "desAIn MVP: a low-poly room editor with editable dimensions and bilingual UI.",
    editorTitle: "desAIn Editor",
    language: "Language",
    english: "EN",
    turkish: "TR",
    noObjectSelected: "No object selected",
    selectedSuffix: "selected",
    selectMode: "Select",
    moveMode: "Move",
    rotateMode: "Rotate",
    viewMode: "View",
    undo: "Undo",
    redo: "Redo",
    resetScene: "Reset Scene",
    sceneValidated: "Scene validated",
    validationWarnings: "validation warnings",
    viewport: "Viewport",
    perspectiveView: "Perspective editor view",
    topView: "Top layout view",
    selection: "Selection",
    roomMetrics: "Room Metrics",
    width: "Width",
    depth: "Depth",
    height: "Height",
    widthShort: "W",
    depthShort: "D",
    heightShort: "H",
    warnings: "Warnings",
    viewportStatus: "Viewport Status",
    selectionModeActive: "Selection mode active",
    moveGizmoActive: "Move gizmo active",
    rotateGizmoActive: "Rotate gizmo active",
    inspectorPanel: "Inspector Panel",
    details: "Details",
    outliner: "Outliner",
    validate: "Validate",
    json: "JSON",
    keys: "Keys",
    sceneMetrics: "Scene Metrics",
    objectDetails: "Object Details",
    selectObjectHint:
      "Select an object in the viewport or outliner to edit width, depth, height, position, rotation, and color.",
    worldOutliner: "World Outliner",
    locked: "Locked",
    open: "Open",
    editable: "Editable",
    positionX: "Position X",
    positionZ: "Position Z",
    rotation: "Rotation",
    color: "Color",
    category: "Category",
    applyValues: "Apply Values",
    rotateMinus15: "Rotate -15",
    rotatePlus15: "Rotate +15",
    unlock: "Unlock",
    lock: "Lock",
    lockedEditHint: "Locked objects cannot be edited until you unlock them.",
    noValidationIssues:
      "No active validation issues. Door, window, and locked-object constraints are clear.",
    sceneJson: "Scene JSON",
    shortcuts: "Shortcuts",
    objectCount: "Objects",
    otherObject: "another object",
    genericObject: "Object",
  },
  tr: {
    appTitle: "desAIn | Odan\u0131 3D'ye \u00e7evir",
    appDescription:
      "desAIn MVP: \u00f6l\u00e7\u00fcleri d\u00fczenlenebilir, iki dilli low-poly oda edit\u00f6r\u00fc.",
    editorTitle: "desAIn Edit\u00f6r",
    language: "Dil",
    english: "EN",
    turkish: "TR",
    noObjectSelected: "\u00d6\u011fe se\u00e7ili de\u011fil",
    selectedSuffix: "se\u00e7ildi",
    selectMode: "Se\u00e7",
    moveMode: "Ta\u015f\u0131",
    rotateMode: "D\u00f6nd\u00fcr",
    viewMode: "G\u00f6r\u00fcn\u00fcm",
    undo: "Geri Al",
    redo: "\u0130leri Al",
    resetScene: "Sahneyi S\u0131f\u0131rla",
    sceneValidated: "Sahne do\u011fruland\u0131",
    validationWarnings: "do\u011frulama uyar\u0131s\u0131",
    viewport: "G\u00f6r\u00fcn\u00fcm",
    perspectiveView: "Perspektif edit\u00f6r g\u00f6r\u00fcn\u00fcm\u00fc",
    topView: "\u00dcstten yerle\u015fim g\u00f6r\u00fcn\u00fcm\u00fc",
    selection: "Se\u00e7im",
    roomMetrics: "Oda \u00d6l\u00e7\u00fcleri",
    width: "En",
    depth: "Boy",
    height: "Y\u00fckseklik",
    widthShort: "EN",
    depthShort: "BOY",
    heightShort: "YUK",
    warnings: "Uyar\u0131lar",
    viewportStatus: "Viewport Durumu",
    selectionModeActive: "Se\u00e7im modu aktif",
    moveGizmoActive: "Ta\u015f\u0131ma gizmosu aktif",
    rotateGizmoActive: "D\u00f6nd\u00fcrme gizmosu aktif",
    inspectorPanel: "\u0130nceleme Paneli",
    details: "Detaylar",
    outliner: "Outliner",
    validate: "Do\u011frula",
    json: "JSON",
    keys: "K\u0131sayol",
    sceneMetrics: "Sahne \u00d6l\u00e7\u00fcleri",
    objectDetails: "\u00d6\u011fe Detaylar\u0131",
    selectObjectHint:
      "En, boy, y\u00fckseklik, konum, d\u00f6n\u00fc\u015f ve renk d\u00fczenlemek i\u00e7in viewport'tan veya outliner'dan bir \u00f6\u011fe se\u00e7.",
    worldOutliner: "D\u00fcnya Outliner",
    locked: "Kilitli",
    open: "A\u00e7\u0131k",
    editable: "D\u00fczenlenebilir",
    positionX: "Konum X",
    positionZ: "Konum Z",
    rotation: "D\u00f6n\u00fc\u015f",
    color: "Renk",
    category: "Kategori",
    applyValues: "De\u011ferleri Uygula",
    rotateMinus15: "-15 D\u00f6nd\u00fcr",
    rotatePlus15: "+15 D\u00f6nd\u00fcr",
    unlock: "Kilidi A\u00e7",
    lock: "Kilitle",
    lockedEditHint: "Kilitli \u00f6\u011feler, kilidi a\u00e7\u0131lana kadar d\u00fczenlenemez.",
    noValidationIssues:
      "Aktif do\u011frulama sorunu yok. Kap\u0131, pencere ve kilitli \u00f6\u011fe k\u0131s\u0131tlar\u0131 temiz.",
    sceneJson: "Sahne JSON",
    shortcuts: "K\u0131sayollar",
    objectCount: "\u00d6\u011fe Say\u0131s\u0131",
    otherObject: "ba\u015fka bir \u00f6\u011fe",
    genericObject: "\u00d6\u011fe",
  },
};

const labelTranslations: Record<string, Record<Locale, string>> = {
  "room.studioLoft": {
    en: "Studio Loft",
    tr: "St\u00fcdyo Loft",
  },
  "object.tvUnit": {
    en: "TV Unit",
    tr: "TV \u00dcnitesi",
  },
  "object.sofa": {
    en: "Sofa",
    tr: "Koltuk",
  },
  "object.carpet": {
    en: "Carpet",
    tr: "Hal\u0131",
  },
  "object.bed": {
    en: "Bed",
    tr: "Yatak",
  },
  "object.wardrobe": {
    en: "Wardrobe",
    tr: "Gard\u0131rop",
  },
  "object.desk": {
    en: "Desk",
    tr: "Masa",
  },
  "object.chair": {
    en: "Chair",
    tr: "Sandalye",
  },
  "object.storageBox": {
    en: "Storage Box",
    tr: "Saklama Kutusu",
  },
};

const categoryTranslations: Record<ObjectCategory, Record<Locale, string>> = {
  sofa: { en: "Sofa", tr: "Koltuk" },
  bed: { en: "Bed", tr: "Yatak" },
  table: { en: "Table", tr: "Masa" },
  chair: { en: "Chair", tr: "Sandalye" },
  wardrobe: { en: "Wardrobe", tr: "Gard\u0131rop" },
  tv_unit: { en: "TV Unit", tr: "TV \u00dcnitesi" },
  carpet: { en: "Carpet", tr: "Hal\u0131" },
  generic_box: { en: "Generic Box", tr: "Genel Kutu" },
};

export const t = (locale: Locale, key: MessageKey) => translations[locale][key];

export const getLocalizedRoomLabel = (
  locale: Locale,
  room: RoomData["room"],
) => labelTranslations[room.labelKey]?.[locale] ?? room.label;

export const getLocalizedObjectLabel = (
  locale: Locale,
  object: RoomObject,
) => labelTranslations[object.labelKey]?.[locale] ?? object.label;

export const getLocalizedCategoryLabel = (
  locale: Locale,
  category: ObjectCategory,
) => categoryTranslations[category][locale];

const getObjectById = (roomData: RoomData, objectId?: string | null) => {
  if (!objectId) {
    return null;
  }

  return roomData.objects.find((object) => object.id === objectId) ?? null;
};

export const formatEditorStatus = (
  locale: Locale,
  status: EditorStatus,
  roomData: RoomData,
) => {
  const object = getObjectById(roomData, status.objectId);
  const objectLabel = object ? getLocalizedObjectLabel(locale, object) : null;

  switch (status.key) {
    case "roomLoaded":
      return locale === "en" ? "Scene loaded" : "Sahne y\u00fcklendi";
    case "objectSelected":
      return objectLabel
        ? `${objectLabel} ${t(locale, "selectedSuffix")}`
        : locale === "en"
          ? "Object selected"
          : "\u00d6\u011fe se\u00e7ildi";
    case "selectionCleared":
      return locale === "en" ? "Selection cleared" : "Se\u00e7im temizlendi";
    case "cameraOrbit":
      return locale === "en"
        ? "Perspective viewport enabled"
        : "Perspektif g\u00f6r\u00fcn\u00fcm etkin";
    case "cameraTop":
      return locale === "en" ? "Top viewport enabled" : "\u00dcst g\u00f6r\u00fcn\u00fcm etkin";
    case "modeSelect":
      return locale === "en" ? "Selection mode" : "Se\u00e7im modu";
    case "modeTranslate":
      return locale === "en" ? "Move gizmo enabled" : "Ta\u015f\u0131ma gizmosu etkin";
    case "modeRotate":
      return locale === "en" ? "Rotate gizmo enabled" : "D\u00f6nd\u00fcrme gizmosu etkin";
    case "objectEditing":
      return objectLabel
        ? locale === "en"
          ? `${objectLabel} editing`
          : `${objectLabel} d\u00fczenleniyor`
        : locale === "en"
          ? "Object editing"
          : "\u00d6\u011fe d\u00fczenleniyor";
    case "objectUpdated":
      return objectLabel
        ? locale === "en"
          ? `${objectLabel} updated`
          : `${objectLabel} g\u00fcncellendi`
        : locale === "en"
          ? "Object updated"
          : "\u00d6\u011fe g\u00fcncellendi";
    case "objectPropertiesUpdated":
      return objectLabel
        ? locale === "en"
          ? `${objectLabel} properties updated`
          : `${objectLabel} \u00f6zellikleri g\u00fcncellendi`
        : locale === "en"
          ? "Properties updated"
          : "\u00d6zellikler g\u00fcncellendi";
    case "objectRotated":
      return objectLabel
        ? locale === "en"
          ? `${objectLabel} rotated`
          : `${objectLabel} d\u00f6nd\u00fcr\u00fcld\u00fc`
        : locale === "en"
          ? "Object rotated"
          : "\u00d6\u011fe d\u00f6nd\u00fcr\u00fcld\u00fc";
    case "objectLocked":
      return objectLabel
        ? locale === "en"
          ? `${objectLabel} locked`
          : `${objectLabel} kilitlendi`
        : locale === "en"
          ? "Object locked"
          : "\u00d6\u011fe kilitlendi";
    case "objectUnlocked":
      return objectLabel
        ? locale === "en"
          ? `${objectLabel} unlocked`
          : `${objectLabel} kilidi a\u00e7\u0131ld\u0131`
        : locale === "en"
          ? "Object unlocked"
          : "\u00d6\u011fe kilidi a\u00e7\u0131ld\u0131";
    case "undoApplied":
      return locale === "en" ? "Undo applied" : "Geri al uyguland\u0131";
    case "redoApplied":
      return locale === "en" ? "Redo applied" : "\u0130leri al uyguland\u0131";
    case "sceneReset":
      return locale === "en"
        ? "Scene reset to default layout"
        : "Sahne varsay\u0131lan d\u00fczene s\u0131f\u0131rland\u0131";
    default:
      return "";
  }
};

export const formatWarning = (
  locale: Locale,
  warning: LayoutWarning,
  roomData: RoomData,
) => {
  const object = getObjectById(roomData, warning.objectId);
  const relatedObject = getObjectById(roomData, warning.relatedObjectId);
  const objectLabel = object
    ? getLocalizedObjectLabel(locale, object)
    : t(locale, "genericObject");
  const relatedLabel = relatedObject
    ? getLocalizedObjectLabel(locale, relatedObject)
    : t(locale, "otherObject");

  switch (warning.code) {
    case "out_of_bounds":
      return locale === "en"
        ? `${objectLabel} exceeds the room bounds.`
        : `${objectLabel} oda s\u0131n\u0131rlar\u0131n\u0131 a\u015f\u0131yor.`;
    case "door_clearance":
      return locale === "en"
        ? `${objectLabel} partially blocks the door area.`
        : `${objectLabel}, kap\u0131 alan\u0131n\u0131 k\u0131smen kapat\u0131yor.`;
    case "window_clearance":
      return locale === "en"
        ? `${objectLabel} partially blocks the window area.`
        : `${objectLabel}, pencere alan\u0131n\u0131 k\u0131smen kapat\u0131yor.`;
    case "radiator_clearance":
      return locale === "en"
        ? `${objectLabel} partially blocks the radiator area.`
        : `${objectLabel}, kalorifer alan\u0131n\u0131 k\u0131smen kapat\u0131yor.`;
    case "collision":
      return locale === "en"
        ? `${objectLabel} overlaps with ${relatedLabel}.`
        : `${objectLabel}, ${relatedLabel} ile \u00fcst \u00fcste geliyor.`;
    default:
      return warning.message;
  }
};
