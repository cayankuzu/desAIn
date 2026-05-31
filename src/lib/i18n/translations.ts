import type {
  LayoutWarning,
  ObjectCategory,
  OpeningType,
  RoomData,
  RoomObject,
} from "@/types/room";

export type Locale = "en" | "tr";

export type StatusKey =
  | "roomLoaded"
  | "roomUpdated"
  | "objectAdded"
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
  | "undo"
  | "redo"
  | "resetScene"
  | "sceneValidated"
  | "validationWarnings"
  | "warnings"
  | "dismissWarning"
  | "width"
  | "depth"
  | "height"
  | "widthShort"
  | "depthShort"
  | "heightShort"
  | "shape"
  | "rectangle"
  | "square"
  | "lShape"
  | "cutoutWidth"
  | "cutoutDepth"
  | "inspectorPanel"
  | "details"
  | "outliner"
  | "inventory"
  | "validate"
  | "shortcuts"
  | "roomSettings"
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
  | "wall"
  | "rotateMinus15"
  | "rotatePlus15"
  | "unlock"
  | "lock"
  | "lockedEditHint"
  | "noValidationIssues"
  | "objectCount"
  | "otherObject"
  | "genericObject"
  | "searchInventory"
  | "inventoryHint"
  | "dropToViewport"
  | "selectedLabel"
  | "recommended"
  | "saveRoom"
  | "randomizeRoom"
  | "deleteObject"
  | "copyAction"
  | "pasteAction"
  | "cutAction"
  | "removeAction";

const translations: Record<Locale, Record<MessageKey, string>> = {
  en: {
    appTitle: "desAIn | 3D Room Editor",
    appDescription:
      "desAIn MVP: a low-poly room editor with live measurements, draggable inventory, and bilingual UI.",
    editorTitle: "desAIn Editor",
    language: "Language",
    english: "EN",
    turkish: "TR",
    noObjectSelected: "No object selected",
    selectedSuffix: "selected",
    selectMode: "Select",
    moveMode: "Move",
    rotateMode: "Rotate",
    undo: "Undo",
    redo: "Redo",
    resetScene: "Reset Scene",
    sceneValidated: "Scene validated",
    validationWarnings: "warnings",
    warnings: "Warnings",
    dismissWarning: "Dismiss warning",
    width: "Width",
    depth: "Depth",
    height: "Height",
    widthShort: "W",
    depthShort: "D",
    heightShort: "H",
    shape: "Shape",
    rectangle: "Rectangle",
    square: "Square",
    lShape: "L-Shape",
    cutoutWidth: "L Cut Width",
    cutoutDepth: "L Cut Depth",
    inspectorPanel: "Inspector Panel",
    details: "Details",
    outliner: "Outliner",
    inventory: "Inventory",
    validate: "Validation",
    shortcuts: "Shortcuts",
    roomSettings: "Room Settings",
    sceneMetrics: "Scene Metrics",
    objectDetails: "Object Details",
    selectObjectHint:
      "Select an object in the viewport or outliner to edit size, position, rotation, and color.",
    worldOutliner: "World Outliner",
    locked: "Locked",
    open: "Open",
    editable: "Editable",
    positionX: "Position X",
    positionZ: "Position Z",
    rotation: "Rotation",
    color: "Color",
    category: "Category",
    wall: "Wall",
    rotateMinus15: "Rotate -15",
    rotatePlus15: "Rotate +15",
    unlock: "Unlock",
    lock: "Lock",
    lockedEditHint: "Locked objects cannot be edited until you unlock them.",
    noValidationIssues:
      "No active validation issues. Door, window, and radiator clearances are currently safe.",
    objectCount: "Objects",
    otherObject: "another object",
    genericObject: "Object",
    searchInventory: "Search inventory",
    inventoryHint: "Drag any item into the viewport to create it instantly.",
    dropToViewport: "Drop into the viewport to add this object",
    selectedLabel: "Selected",
    recommended: "Recommended",
    saveRoom: "Save Room",
    randomizeRoom: "Randomize",
    deleteObject: "Delete",
    copyAction: "Copy",
    pasteAction: "Paste",
    cutAction: "Cut",
    removeAction: "Remove",
  },
  tr: {
    appTitle: "desAIn | 3D Oda Edit\u00f6r\u00fc",
    appDescription:
      "desAIn MVP: canl\u0131 \u00f6l\u00e7\u00fcler, s\u00fcr\u00fcklenebilir envanter ve iki dilli aray\u00fcze sahip low-poly oda edit\u00f6r\u00fc.",
    editorTitle: "desAIn Edit\u00f6r",
    language: "Dil",
    english: "EN",
    turkish: "TR",
    noObjectSelected: "\u00d6\u011fe se\u00e7ili de\u011fil",
    selectedSuffix: "se\u00e7ildi",
    selectMode: "Se\u00e7",
    moveMode: "Ta\u015f\u0131",
    rotateMode: "D\u00f6nd\u00fcr",
    undo: "Geri Al",
    redo: "\u0130leri Al",
    resetScene: "Sahneyi S\u0131f\u0131rla",
    sceneValidated: "Sahne do\u011fruland\u0131",
    validationWarnings: "uyar\u0131",
    warnings: "Uyar\u0131lar",
    dismissWarning: "Uyar\u0131y\u0131 kapat",
    width: "En",
    depth: "Boy",
    height: "Y\u00fckseklik",
    widthShort: "EN",
    depthShort: "BOY",
    heightShort: "YUK",
    shape: "Oda Tipi",
    rectangle: "Dikd\u00f6rtgen",
    square: "Kare",
    lShape: "L Tipi",
    cutoutWidth: "L Kesit En",
    cutoutDepth: "L Kesit Boy",
    inspectorPanel: "\u0130nceleme Paneli",
    details: "Detaylar",
    outliner: "Outliner",
    inventory: "Envanter",
    validate: "Do\u011frulama",
    shortcuts: "K\u0131sayollar",
    roomSettings: "Oda Ayarlar\u0131",
    sceneMetrics: "Sahne \u00d6l\u00e7\u00fcleri",
    objectDetails: "\u00d6\u011fe Detaylar\u0131",
    selectObjectHint:
      "Boyut, konum, d\u00f6n\u00fc\u015f ve rengi d\u00fczenlemek i\u00e7in viewport'tan veya outliner'dan bir \u00f6\u011fe se\u00e7.",
    worldOutliner: "D\u00fcnya Outliner",
    locked: "Kilitli",
    open: "A\u00e7\u0131k",
    editable: "D\u00fczenlenebilir",
    positionX: "Konum X",
    positionZ: "Konum Z",
    rotation: "D\u00f6n\u00fc\u015f",
    color: "Renk",
    category: "Kategori",
    wall: "Duvar",
    rotateMinus15: "-15 D\u00f6nd\u00fcr",
    rotatePlus15: "+15 D\u00f6nd\u00fcr",
    unlock: "Kilidi A\u00e7",
    lock: "Kilitle",
    lockedEditHint: "Kilitli \u00f6\u011feler, kilidi a\u00e7\u0131lana kadar d\u00fczenlenemez.",
    noValidationIssues:
      "Aktif do\u011frulama sorunu yok. Kap\u0131, pencere ve kalorifer bo\u015fluklar\u0131 \u015fu an g\u00fcvenli.",
    objectCount: "\u00d6\u011fe Say\u0131s\u0131",
    otherObject: "ba\u015fka bir \u00f6\u011fe",
    genericObject: "\u00d6\u011fe",
    searchInventory: "Envanterde ara",
    inventoryHint: "Herhangi bir \u00f6\u011feyi viewport'a s\u00fcr\u00fckleyip an\u0131nda ekleyebilirsin.",
    dropToViewport: "Eklemek i\u00e7in viewport'a b\u0131rak",
    selectedLabel: "Se\u00e7ili",
    recommended: "\u00d6nerilenler",
    saveRoom: "Oday\u0131 Kaydet",
    randomizeRoom: "Rastgele Diz",
    deleteObject: "Sil",
    copyAction: "Kopyala",
    pasteAction: "Yap\u0131\u015ft\u0131r",
    cutAction: "Kes",
    removeAction: "Kald\u0131r",
  },
};

const labelTranslations: Record<string, Record<Locale, string>> = {
  "room.studioLoft": { en: "Studio Loft", tr: "St\u00fcdyo Loft" },
  "object.tvUnit": { en: "TV Unit", tr: "TV \u00dcnitesi" },
  "object.sofa": { en: "Sofa", tr: "Koltuk" },
  "object.loungeSofa": { en: "Lounge Sofa", tr: "Lounge Koltuk" },
  "object.carpet": { en: "Carpet", tr: "Hal\u0131" },
  "object.largeRug": { en: "Large Rug", tr: "B\u00fcy\u00fck Hal\u0131" },
  "object.runnerRug": { en: "Runner Rug", tr: "Yolluk" },
  "object.bed": { en: "Bed", tr: "Yatak" },
  "object.doubleBed": { en: "Double Bed", tr: "\u00c7ift Ki\u015filik Yatak" },
  "object.singleBed": { en: "Single Bed", tr: "Tek Ki\u015filik Yatak" },
  "object.wardrobe": { en: "Wardrobe", tr: "Gard\u0131rop" },
  "object.tallWardrobe": { en: "Tall Wardrobe", tr: "B\u00fcy\u00fck Gard\u0131rop" },
  "object.bookshelf": { en: "Bookshelf", tr: "Kitapl\u0131k" },
  "object.desk": { en: "Desk", tr: "\u00c7al\u0131\u015fma Masas\u0131" },
  "object.diningTable": { en: "Dining Table", tr: "Yemek Masas\u0131" },
  "object.sideTable": { en: "Side Table", tr: "Yan Sehpa" },
  "object.chair": { en: "Chair", tr: "Sandalye" },
  "object.officeChair": { en: "Office Chair", tr: "Ofis Sandalyesi" },
  "object.diningChair": { en: "Dining Chair", tr: "Yemek Sandalyesi" },
  "object.mediaConsole": { en: "Media Console", tr: "Medya Konsolu" },
  "object.tvStand": { en: "TV Stand", tr: "TV Sehpas\u0131" },
  "object.storageBox": { en: "Storage Box", tr: "Saklama Kutusu" },
  "object.storageBench": { en: "Storage Bench", tr: "Saklama Bank\u0131" },
  "object.cube": { en: "Cube", tr: "K\u00fcp" },
  "object.roundColumn": { en: "Round Column", tr: "Yuvarlak Kolon" },
  "object.squareColumn": { en: "Square Column", tr: "Kare Kolon" },
  "object.counter": { en: "Counter", tr: "Tezgah" },
  "object.fridge": { en: "Fridge", tr: "Buzdolab\u0131" },
  "object.floorLamp": { en: "Floor Lamp", tr: "Ayakl\u0131 Lambader" },
  "object.spiralStair": { en: "Spiral Stair", tr: "Dairesel Merdiven" },
  "object.straightStair": { en: "Straight Stair", tr: "D\u00fcz Merdiven" },
  "object.acUnit": { en: "AC Unit", tr: "Klima" },
  "object.framedArt": { en: "Framed Art", tr: "\u00c7er\u00e7eveli Tablo" },
  "object.windowFrame": { en: "Window Frame", tr: "Pencere \u00c7er\u00e7evesi" },
  "object.guitarStand": { en: "Guitar Stand", tr: "Gitar Stand\u0131" },
  "object.doorPanel": { en: "Door Panel", tr: "Kap\u0131 Paneli" },
};

const categoryTranslations: Record<ObjectCategory, Record<Locale, string>> = {
  sofa: { en: "Sofa", tr: "Koltuk" },
  bed: { en: "Bed", tr: "Yatak" },
  table: { en: "Table", tr: "Masa" },
  chair: { en: "Chair", tr: "Sandalye" },
  wardrobe: { en: "Wardrobe", tr: "Gard\u0131rop" },
  tv_unit: { en: "TV Unit", tr: "TV \u00dcnitesi" },
  carpet: { en: "Carpet", tr: "Hal\u0131" },
  generic_box: { en: "Storage", tr: "Depolama" },
};

export const t = (locale: Locale, key: MessageKey) => translations[locale][key];

export const getLocalizedRoomLabel = (
  locale: Locale,
  room: RoomData["room"],
) => labelTranslations[room.labelKey]?.[locale] ?? room.label;

export const getLocalizedObjectLabel = (
  locale: Locale,
  object: Pick<RoomObject, "label" | "labelKey">,
) => labelTranslations[object.labelKey]?.[locale] ?? object.label;

export const getLocalizedCategoryLabel = (
  locale: Locale,
  category: ObjectCategory,
) => categoryTranslations[category][locale];

export const getLocalizedOpeningType = (
  locale: Locale,
  openingType: OpeningType,
) => {
  const translationsByType: Record<OpeningType, Record<Locale, string>> = {
    door: { en: "Door", tr: "Kapı" },
    window: { en: "Window", tr: "Pencere" },
    balcony_door: { en: "Balcony Door", tr: "Balkon Kapısı" },
    radiator: { en: "Radiator", tr: "Kalorifer" },
  };

  return translationsByType[openingType][locale];
};

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
    case "roomUpdated":
      return locale === "en"
        ? "Room measurements updated"
        : "Oda \u00f6l\u00e7\u00fcleri g\u00fcncellendi";
    case "objectAdded":
      return objectLabel
        ? locale === "en"
          ? `${objectLabel} added`
          : `${objectLabel} eklendi`
        : locale === "en"
          ? "Object added"
          : "\u00d6\u011fe eklendi";
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
