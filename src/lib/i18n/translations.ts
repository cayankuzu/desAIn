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
  | "roomPresetApplied"
  | "roomSaved"
  | "roomRandomized"
  | "randomLayoutOptionApplied"
  | "randomLayoutOptionsReady"
  | "selectionUpdated"
  | "selectionRandomized"
  | "selectionDeleted"
  | "selectionLocked"
  | "selectionUnlocked"
  | "groupCreated"
  | "groupRemoved"
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
  | "openingUpdated"
  | "wallUpdated"
  | "wallSplit"
  | "undoApplied"
  | "redoApplied"
  | "sceneReset"
  | "sceneResetSaved";

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
  | "roomPurpose"
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
  | "customShape"
  | "wallDetails"
  | "wallLength"
  | "wallStart"
  | "wallEnd"
  | "wallStartX"
  | "wallStartZ"
  | "wallEndX"
  | "wallEndZ"
  | "splitWall"
  | "linkedSetting"
  | "openingDetails"
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
  | "placement"
  | "dimensions"
  | "appearance"
  | "itemState"
  | "movableObject"
  | "fixedObject"
  | "maxHeight"
  | "wall"
  | "wallNumber"
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
  | "selectedItems"
  | "group"
  | "groups"
  | "ungroup"
  | "groupSelection"
  | "randomizeSelection"
  | "lockSelection"
  | "unlockSelection"
  | "deleteSelection"
  | "multiSelectShortcut"
  | "multiSelectHint"
  | "smartArrangeHint"
  | "ungroupHint"
  | "groupHint"
  | "recommended"
  | "saveRoom"
  | "randomizeRoom"
  | "randomLayouts"
  | "randomLayoutsHint"
  | "activeLayout"
  | "closePanel"
  | "noWarningsShort"
  | "warningsShort"
  | "errorsShort"
  | "resetDefault"
  | "resetSaved"
  | "resetSceneOptions"
  | "savedLayout"
  | "noSavedLayout"
  | "captureScreenshot"
  | "hidePanels"
  | "showPanels"
  | "panels"
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
    roomPurpose: "Room Type",
    rectangle: "Rectangle",
    square: "Square",
    lShape: "L-Shape",
    customShape: "Custom",
    cutoutWidth: "L Cut Width",
    cutoutDepth: "L Cut Depth",
    inspectorPanel: "Inspector Panel",
    details: "Details",
    outliner: "Scene Items",
    inventory: "Inventory",
    validate: "Validation",
    shortcuts: "Shortcuts",
    roomSettings: "Room Settings",
    wallDetails: "Wall Details",
    wallLength: "Wall Length",
    wallStart: "Wall Start",
    wallEnd: "Wall End",
    wallStartX: "Start X",
    wallStartZ: "Start Z",
    wallEndX: "End X",
    wallEndZ: "End Z",
    splitWall: "Split Wall",
    linkedSetting: "Linked Setting",
    openingDetails: "Opening Details",
    sceneMetrics: "Scene Metrics",
    objectDetails: "Object Details",
    selectObjectHint:
      "Select an object in the viewport or outliner to edit size, position, rotation, and color.",
    worldOutliner: "Scene Items",
    locked: "Locked",
    open: "Free",
    editable: "Editable",
    positionX: "Position X",
    positionZ: "Position Z",
    rotation: "Rotation",
    color: "Color",
    category: "Category",
    placement: "Placement",
    dimensions: "Dimensions",
    appearance: "Appearance",
    itemState: "State",
    movableObject: "Movable",
    fixedObject: "Fixed",
    maxHeight: "Max height",
    wall: "Wall",
    wallNumber: "Wall",
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
    selectedItems: "Selected items",
    group: "Group",
    groups: "Groups",
    ungroup: "Ungroup",
    groupSelection: "Group",
    randomizeSelection: "Arrange Selection",
    lockSelection: "Lock Selection",
    unlockSelection: "Unlock Selection",
    deleteSelection: "Delete Selection",
    multiSelectShortcut: "Ctrl + click",
    multiSelectHint: "Multi-select objects, then group, lock, delete, or arrange only that set.",
    smartArrangeHint: "Smart arrange keeps fixed items in place and uses object relationships only inside explicit groups.",
    ungroupHint: "Remove the selected group while keeping its objects in the room.",
    groupHint: "Create a reusable group from the current multi-selection.",
    recommended: "Recommended",
    saveRoom: "Save Room",
    randomizeRoom: "Randomize",
    randomLayouts: "Random Layouts",
    randomLayoutsHint: "Choose a generated option for this room. Locked and fixed items stay where they are.",
    activeLayout: "Active",
    closePanel: "Close",
    noWarningsShort: "Clean",
    warningsShort: "warnings",
    errorsShort: "errors",
    resetDefault: "Default Layout",
    resetSaved: "Saved Layout",
    resetSceneOptions: "Reset Options",
    savedLayout: "Saved layout",
    noSavedLayout: "No saved layout yet",
    captureScreenshot: "Capture Screenshot",
    hidePanels: "Hide Panels",
    showPanels: "Show Panels",
    panels: "Panels",
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
    roomPurpose: "Oda Türü",
    rectangle: "Dikd\u00f6rtgen",
    square: "Kare",
    lShape: "L Tipi",
    customShape: "\u00d6zel",
    cutoutWidth: "L Kesit En",
    cutoutDepth: "L Kesit Boy",
    inspectorPanel: "\u0130nceleme Paneli",
    details: "Detaylar",
    outliner: "\u00d6\u011fe Listesi",
    inventory: "Envanter",
    validate: "Do\u011frulama",
    shortcuts: "K\u0131sayollar",
    roomSettings: "Oda Ayarlar\u0131",
    wallDetails: "Duvar Detaylar\u0131",
    wallLength: "Duvar Uzunlu\u011fu",
    wallStart: "Duvar Ba\u015flang\u0131c\u0131",
    wallEnd: "Duvar Biti\u015fi",
    wallStartX: "Ba\u015flang\u0131\u00e7 X",
    wallStartZ: "Ba\u015flang\u0131\u00e7 Z",
    wallEndX: "Biti\u015f X",
    wallEndZ: "Biti\u015f Z",
    splitWall: "Duvar\u0131 B\u00f6l",
    linkedSetting: "Ba\u011fl\u0131 Ayar",
    openingDetails: "A\u00e7\u0131kl\u0131k Detaylar\u0131",
    sceneMetrics: "Sahne \u00d6l\u00e7\u00fcleri",
    objectDetails: "\u00d6\u011fe Detaylar\u0131",
    selectObjectHint:
      "Boyut, konum, d\u00f6n\u00fc\u015f ve rengi d\u00fczenlemek i\u00e7in viewport'tan veya outliner'dan bir \u00f6\u011fe se\u00e7.",
    worldOutliner: "Sahne \u00d6\u011feleri",
    locked: "Kilitli",
    open: "Serbest",
    editable: "D\u00fczenlenebilir",
    positionX: "Konum X",
    positionZ: "Konum Z",
    rotation: "D\u00f6n\u00fc\u015f",
    color: "Renk",
    category: "Kategori",
    placement: "Yerle\u015fim",
    dimensions: "\u00d6l\u00e7\u00fcler",
    appearance: "G\u00f6r\u00fcn\u00fcm",
    itemState: "Durum",
    movableObject: "Ta\u015f\u0131nabilir",
    fixedObject: "Sabit",
    maxHeight: "Maks. y\u00fckseklik",
    wall: "Duvar",
    wallNumber: "Duvar",
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
    selectedItems: "Se\u00e7ili \u00f6\u011feler",
    group: "Grup",
    groups: "Gruplar",
    ungroup: "Grubu \u00c7\u00f6z",
    groupSelection: "Grupla",
    randomizeSelection: "Se\u00e7imi Diz",
    lockSelection: "Se\u00e7imi Kilitle",
    unlockSelection: "Kilidi A\u00e7",
    deleteSelection: "Se\u00e7imi Sil",
    multiSelectShortcut: "Ctrl + t\u0131kla",
    multiSelectHint: "Nesneleri \u00e7oklu se\u00e7, sonra yaln\u0131zca bu se\u00e7imi grupla, kilitle, sil veya yeniden d\u00fczenle.",
    smartArrangeHint: "Ak\u0131ll\u0131 dizim sabit \u00f6\u011feleri korur; e\u015fya ili\u015fkilerini yaln\u0131zca kullan\u0131c\u0131n\u0131n olu\u015fturdu\u011fu gruplarda kullan\u0131r.",
    ungroupHint: "Se\u00e7ili grubu kald\u0131r\u0131r, i\u00e7indeki \u00f6\u011feler odada kal\u0131r.",
    groupHint: "Mevcut \u00e7oklu se\u00e7imden tekrar se\u00e7ilebilir bir grup olu\u015fturur.",
    recommended: "\u00d6nerilenler",
    saveRoom: "Oday\u0131 Kaydet",
    randomizeRoom: "Rastgele Diz",
    randomLayouts: "Rastgele D\u00fczenler",
    randomLayoutsHint: "Bu oda i\u00e7in olu\u015fturulan d\u00fczeni se\u00e7. Kilitli ve sabit \u00f6\u011feler yerinde kal\u0131r.",
    activeLayout: "Aktif",
    closePanel: "Kapat",
    noWarningsShort: "Temiz",
    warningsShort: "uyar\u0131",
    errorsShort: "hata",
    resetDefault: "Varsay\u0131lan D\u00fczen",
    resetSaved: "Kay\u0131tl\u0131 D\u00fczen",
    resetSceneOptions: "S\u0131f\u0131rlama Se\u00e7enekleri",
    savedLayout: "Kay\u0131tl\u0131 d\u00fczen",
    noSavedLayout: "Hen\u00fcz kay\u0131tl\u0131 d\u00fczen yok",
    captureScreenshot: "Ekran G\u00f6r\u00fcnt\u00fcs\u00fc Al",
    hidePanels: "Panelleri Gizle",
    showPanels: "Panelleri G\u00f6ster",
    panels: "Paneller",
    deleteObject: "Sil",
    copyAction: "Kopyala",
    pasteAction: "Yap\u0131\u015ft\u0131r",
    cutAction: "Kes",
    removeAction: "Kald\u0131r",
  },
};

const labelTranslations: Record<string, Record<Locale, string>> = {
  "room.studioLoft": { en: "Studio Loft", tr: "St\u00fcdyo Oda" },
  "room.purpose.empty": { en: "Empty Room", tr: "Bo\u015f Oda" },
  "room.purpose.living": { en: "Living Room", tr: "Salon" },
  "room.purpose.kitchen": { en: "Kitchen", tr: "Mutfak" },
  "room.purpose.bedroom": { en: "Bedroom", tr: "Yatak Odas\u0131" },
  "room.purpose.kids": { en: "Kids Room", tr: "\u00c7ocuk Odas\u0131" },
  "room.purpose.study": { en: "Study", tr: "\u00c7al\u0131\u015fma Odas\u0131" },
  "room.purpose.bathroom": { en: "Bathroom", tr: "Banyo" },
  "room.purpose.dining": { en: "Dining Room", tr: "Yemek Odas\u0131" },
  "room.purpose.laundry": { en: "Laundry", tr: "\u00c7ama\u015f\u0131r Odas\u0131" },
  "room.purpose.entry": { en: "Entry Hall", tr: "Antre / Hol" },
  "room.purpose.balcony": { en: "Balcony / Terrace", tr: "Balkon / Teras" },
  "room.purpose.dressing": { en: "Dressing Room", tr: "Giyinme Odas\u0131" },
  "object.tvUnit": { en: "TV Unit", tr: "TV \u00dcnitesi" },
  "object.sofa": { en: "Sofa", tr: "Koltuk" },
  "object.loungeSofa": { en: "Lounge Sofa", tr: "Geni\u015f Koltuk" },
  "object.armchair": { en: "Armchair", tr: "Berjer" },
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
  "object.coffeeTable": { en: "Coffee Table", tr: "Orta Sehpa" },
  "object.sideTable": { en: "Side Table", tr: "Yan Sehpa" },
  "object.chair": { en: "Chair", tr: "Sandalye" },
  "object.officeChair": { en: "Office Chair", tr: "Ofis Sandalyesi" },
  "object.diningChair": { en: "Dining Chair", tr: "Yemek Sandalyesi" },
  "object.mediaConsole": { en: "Media Console", tr: "Medya \u00dcnitesi" },
  "object.tvStand": { en: "TV Stand", tr: "TV Sehpas\u0131" },
  "object.storageBox": { en: "Storage Box", tr: "Saklama Kutusu" },
  "object.storageBench": { en: "Storage Bench", tr: "Saklama Bank\u0131" },
  "object.cube": { en: "Cube", tr: "K\u00fcp" },
  "object.roundColumn": { en: "Round Column", tr: "Yuvarlak Kolon" },
  "object.squareColumn": { en: "Square Column", tr: "Kare Kolon" },
  "object.counter": { en: "Counter", tr: "Tezgah" },
  "object.kitchenIsland": { en: "Kitchen Island", tr: "Mutfak Adas\u0131" },
  "object.consoleTable": { en: "Console Table", tr: "Dresuar" },
  "object.fridge": { en: "Fridge", tr: "Buzdolab\u0131" },
  "object.nightstand": { en: "Nightstand", tr: "Komodin" },
  "object.floorLamp": { en: "Floor Lamp", tr: "Ayakl\u0131 Lambader" },
  "object.spiralStair": { en: "Spiral Stair", tr: "Dairesel Merdiven" },
  "object.straightStair": { en: "Straight Stair", tr: "D\u00fcz Merdiven" },
  "object.acUnit": { en: "AC Unit", tr: "Klima" },
  "object.framedArt": { en: "Framed Art", tr: "\u00c7er\u00e7eveli Tablo" },
  "object.wallShelf": { en: "Wall Shelf", tr: "Duvar Raf\u0131" },
  "object.mirrorPanel": { en: "Mirror Panel", tr: "Ayna Paneli" },
  "object.planter": { en: "Planter", tr: "Saks\u0131" },
  "object.windowFrame": { en: "Window Frame", tr: "Pencere \u00c7er\u00e7evesi" },
  "object.guitarStand": { en: "Guitar Stand", tr: "Gitar Stand\u0131" },
  "object.roundTable": { en: "Round Table", tr: "Yuvarlak Masa" },
  "object.barStool": { en: "Bar Stool", tr: "Bar Taburesi" },
  "object.lSofa": { en: "L Sofa", tr: "L Koltuk" },
  "object.tallPlant": { en: "Tall Plant", tr: "Uzun Bitki" },
  "object.kitchenSink": { en: "Kitchen Sink", tr: "Mutfak Evyesi" },
  "object.cooktop": { en: "Cooktop", tr: "Ocak" },
  "object.oven": { en: "Oven", tr: "F\u0131r\u0131n" },
  "object.dishwasher": { en: "Dishwasher", tr: "Bula\u015f\u0131k Makinesi" },
  "object.washer": { en: "Washing Machine", tr: "\u00c7ama\u015f\u0131r Makinesi" },
  "object.bathtub": { en: "Bathtub", tr: "K\u00fcvet" },
  "object.toilet": { en: "Toilet", tr: "Klozet" },
  "object.vanity": { en: "Bathroom Vanity", tr: "Banyo Dolab\u0131" },
  "object.wallClock": { en: "Wall Clock", tr: "Duvar Saati" },
  "object.curtainPanel": { en: "Curtain Panel", tr: "Perde Paneli" },
  "object.balconyDoor": { en: "Balcony Door", tr: "Balkon Kap\u0131s\u0131" },
  "object.ladderStair": { en: "Ladder Stair", tr: "Dikey Merdiven" },
  "object.piano": { en: "Piano", tr: "Piyano" },
  "object.floorMirror": { en: "Floor Mirror", tr: "Ayakl\u0131 Ayna" },
  "object.radiatorPanel": { en: "Radiator Panel", tr: "Kalorifer Paneli" },
  "object.slidingWindow": { en: "Sliding Window", tr: "S\u00fcrg\u00fcl\u00fc Pencere" },
  "object.slidingDoor": { en: "Sliding Door", tr: "S\u00fcrg\u00fcl\u00fc Kap\u0131" },
  "object.ceilingLight": { en: "Ceiling Light", tr: "Tavan Lambas\u0131" },
  "object.wallSconce": { en: "Wall Sconce", tr: "Duvar Apli\u011fi" },
  "object.shoeRack": { en: "Shoe Rack", tr: "Ayakkab\u0131l\u0131k" },
  "object.coatStand": { en: "Coat Stand", tr: "Ask\u0131l\u0131k" },
  "object.roomDivider": { en: "Room Divider", tr: "Paravan" },
  "object.modularCabinet": { en: "Modular Cabinet", tr: "Mod\u00fcler Dolap" },
  "object.dresser": { en: "Dresser", tr: "\u015eifonyer" },
  "object.sideboard": { en: "Sideboard", tr: "Konsol Dolap" },
  "object.pouf": { en: "Pouf", tr: "Puf" },
  "object.beanBag": { en: "Bean Bag", tr: "Armut Koltuk" },
  "object.baseCabinet": { en: "Base Cabinet", tr: "Alt Mutfak Dolab\u0131" },
  "object.upperCabinet": { en: "Upper Cabinet", tr: "\u00dcst Mutfak Dolab\u0131" },
  "object.microwave": { en: "Microwave", tr: "Mikrodalga" },
  "object.rangeHood": { en: "Range Hood", tr: "Davlumbaz" },
  "object.dryer": { en: "Dryer", tr: "Kurutma Makinesi" },
  "object.showerCabin": { en: "Shower Cabin", tr: "Du\u015f Kabini" },
  "object.towelRack": { en: "Towel Rack", tr: "Havlu Ask\u0131s\u0131" },
  "object.monitor": { en: "Monitor", tr: "Monit\u00f6r" },
  "object.windowBlinds": { en: "Window Blinds", tr: "Jaluzi" },
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
  generic_box: { en: "Object", tr: "Nesne" },
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
    door: { en: "Door", tr: "Kap\u0131" },
    window: { en: "Window", tr: "Pencere" },
    balcony_door: { en: "Balcony Door", tr: "Balkon Kap\u0131s\u0131" },
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
    case "roomPresetApplied":
      return locale === "en"
        ? "Room type preset loaded"
        : "Oda t\u00fcr\u00fc yerle\u015fimi y\u00fcklendi";
    case "roomSaved":
      return locale === "en" ? "Room layout saved" : "Oda d\u00fczeni kaydedildi";
    case "roomRandomized":
      return locale === "en"
        ? "Room randomized without moving fixed items"
        : "Sabit \u00f6\u011feler korunarak oda rastgele dizildi";
    case "randomLayoutOptionApplied":
      return locale === "en"
        ? "Random layout option applied"
        : "Rastgele d\u00fczen se\u00e7ildi";
    case "randomLayoutOptionsReady":
      return locale === "en"
        ? "Random layout options opened"
        : "Rastgele d\u00fczen listesi a\u00e7\u0131ld\u0131";
    case "selectionUpdated":
      return locale === "en" ? "Selection updated" : "Se\u00e7im g\u00fcncellendi";
    case "selectionRandomized":
      return locale === "en"
        ? "Selected items arranged"
        : "Se\u00e7ili \u00f6\u011feler d\u00fczenlendi";
    case "selectionDeleted":
      return locale === "en" ? "Selected items deleted" : "Se\u00e7ili \u00f6\u011feler silindi";
    case "selectionLocked":
      return locale === "en" ? "Selected items locked" : "Se\u00e7ili \u00f6\u011feler kilitlendi";
    case "selectionUnlocked":
      return locale === "en"
        ? "Selected items unlocked"
        : "Se\u00e7ili \u00f6\u011felerin kilidi a\u00e7\u0131ld\u0131";
    case "groupCreated":
      return locale === "en" ? "Group created" : "Grup olu\u015fturuldu";
    case "groupRemoved":
      return locale === "en" ? "Group removed" : "Grup kald\u0131r\u0131ld\u0131";
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
    case "openingUpdated":
      return locale === "en" ? "Opening updated" : "A\u00e7\u0131kl\u0131k g\u00fcncellendi";
    case "wallUpdated":
      return locale === "en" ? "Wall updated" : "Duvar g\u00fcncellendi";
    case "wallSplit":
      return locale === "en" ? "Wall split with a new pivot" : "Duvara yeni pivot eklendi";
    case "undoApplied":
      return locale === "en" ? "Undo applied" : "Geri al uyguland\u0131";
    case "redoApplied":
      return locale === "en" ? "Redo applied" : "\u0130leri al uyguland\u0131";
    case "sceneReset":
      return locale === "en"
        ? "Scene reset to default layout"
        : "Sahne varsay\u0131lan d\u00fczene s\u0131f\u0131rland\u0131";
    case "sceneResetSaved":
      return locale === "en"
        ? "Scene restored from saved layout"
        : "Sahne kay\u0131tl\u0131 d\u00fczenden geri y\u00fcklendi";
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
