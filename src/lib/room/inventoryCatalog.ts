import type { GeneratorName, ObjectCategory, RoomObject } from "@/types/room";

export const INVENTORY_DRAG_MIME = "application/x-desain-object-template";

export interface InventoryTemplate {
  id: string;
  label: string;
  labelKey: string;
  category: ObjectCategory;
  generator: GeneratorName;
  color: string;
  dimensions: RoomObject["dimensions"];
  rotation?: number;
  params: RoomObject["params"];
}

export const inventoryCatalog: InventoryTemplate[] = [
  {
    id: "template_sofa_straight",
    label: "Sofa",
    labelKey: "object.sofa",
    category: "sofa",
    generator: "SofaGenerator",
    color: "#66776d",
    dimensions: { width: 2.2, depth: 0.92, height: 0.84 },
    params: { shape: "straight", cushionCount: 3, hasArmrests: true },
  },
  {
    id: "template_sofa_lounge",
    label: "Lounge Sofa",
    labelKey: "object.loungeSofa",
    category: "sofa",
    generator: "SofaGenerator",
    color: "#56657a",
    dimensions: { width: 2.6, depth: 1.02, height: 0.82 },
    params: { shape: "straight", cushionCount: 4, hasArmrests: true },
  },
  {
    id: "template_bed_double",
    label: "Double Bed",
    labelKey: "object.doubleBed",
    category: "bed",
    generator: "BedGenerator",
    color: "#c89b6a",
    dimensions: { width: 1.8, depth: 2.1, height: 1.04 },
    params: { pillows: 2, headboard: true },
  },
  {
    id: "template_bed_single",
    label: "Single Bed",
    labelKey: "object.singleBed",
    category: "bed",
    generator: "BedGenerator",
    color: "#d2a97a",
    dimensions: { width: 1, depth: 2, height: 0.95 },
    params: { pillows: 1, headboard: true },
  },
  {
    id: "template_desk",
    label: "Desk",
    labelKey: "object.desk",
    category: "table",
    generator: "TableGenerator",
    color: "#956844",
    dimensions: { width: 1.2, depth: 0.6, height: 0.76 },
    params: { legStyle: "straight", thickness: "medium" },
  },
  {
    id: "template_dining_table",
    label: "Dining Table",
    labelKey: "object.diningTable",
    category: "table",
    generator: "TableGenerator",
    color: "#a97955",
    dimensions: { width: 1.45, depth: 0.82, height: 0.76 },
    params: { legStyle: "straight", thickness: "medium" },
  },
  {
    id: "template_side_table",
    label: "Side Table",
    labelKey: "object.sideTable",
    category: "table",
    generator: "TableGenerator",
    color: "#8d6b4f",
    dimensions: { width: 0.55, depth: 0.55, height: 0.58 },
    params: { legStyle: "straight", thickness: "thin" },
  },
  {
    id: "template_chair_office",
    label: "Office Chair",
    labelKey: "object.officeChair",
    category: "chair",
    generator: "ChairGenerator",
    color: "#4e7080",
    dimensions: { width: 0.56, depth: 0.56, height: 0.94 },
    params: { hasBackrest: true },
  },
  {
    id: "template_chair_dining",
    label: "Dining Chair",
    labelKey: "object.diningChair",
    category: "chair",
    generator: "ChairGenerator",
    color: "#64707a",
    dimensions: { width: 0.5, depth: 0.5, height: 0.88 },
    params: { hasBackrest: true },
  },
  {
    id: "template_wardrobe_tall",
    label: "Tall Wardrobe",
    labelKey: "object.tallWardrobe",
    category: "wardrobe",
    generator: "WardrobeGenerator",
    color: "#c7b18d",
    dimensions: { width: 1.4, depth: 0.7, height: 2.28 },
    params: { doorCount: 3, mirrored: false },
  },
  {
    id: "template_bookshelf",
    label: "Bookshelf",
    labelKey: "object.bookshelf",
    category: "wardrobe",
    generator: "WardrobeGenerator",
    color: "#a98c6c",
    dimensions: { width: 0.95, depth: 0.36, height: 2.1 },
    params: { doorCount: 0, mirrored: false },
  },
  {
    id: "template_media_console",
    label: "Media Console",
    labelKey: "object.mediaConsole",
    category: "tv_unit",
    generator: "TVUnitGenerator",
    color: "#a96f53",
    dimensions: { width: 1.8, depth: 0.42, height: 1.18 },
    params: { shelves: 2, screenRatio: "wide" },
  },
  {
    id: "template_tv_stand",
    label: "TV Stand",
    labelKey: "object.tvStand",
    category: "tv_unit",
    generator: "TVUnitGenerator",
    color: "#8c5f48",
    dimensions: { width: 1.4, depth: 0.4, height: 1.06 },
    params: { shelves: 1, screenRatio: "wide" },
  },
  {
    id: "template_carpet_large",
    label: "Large Rug",
    labelKey: "object.largeRug",
    category: "carpet",
    generator: "CarpetGenerator",
    color: "#d4c09b",
    dimensions: { width: 2.6, depth: 1.9, height: 0.03 },
    params: { border: true },
  },
  {
    id: "template_carpet_runner",
    label: "Runner Rug",
    labelKey: "object.runnerRug",
    category: "carpet",
    generator: "CarpetGenerator",
    color: "#c6b39c",
    dimensions: { width: 0.9, depth: 2.2, height: 0.03 },
    params: { border: false },
  },
  {
    id: "template_storage_box",
    label: "Storage Box",
    labelKey: "object.storageBox",
    category: "generic_box",
    generator: "GenericObjectGenerator",
    color: "#86786f",
    dimensions: { width: 0.65, depth: 0.45, height: 0.48 },
    params: { baseShape: "box" },
  },
  {
    id: "template_storage_bench",
    label: "Storage Bench",
    labelKey: "object.storageBench",
    category: "generic_box",
    generator: "GenericObjectGenerator",
    color: "#9c8571",
    dimensions: { width: 1.1, depth: 0.42, height: 0.52 },
    params: { baseShape: "box" },
  },
];

export const getInventoryTemplateById = (templateId: string) =>
  inventoryCatalog.find((item) => item.id === templateId) ?? null;
