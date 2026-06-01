import type { GeneratorName, ObjectCategory, RoomObject } from "@/types/room";
import type { InventoryPreviewType, InventoryTemplate } from "@/lib/room/inventoryCatalog";

export type DiscoveredInventoryInput = {
  id: string;
  label: string;
  labelKey?: string;
  category: ObjectCategory;
  generator?: GeneratorName;
  color?: string;
  dimensions: RoomObject["dimensions"];
  rotation?: number;
  previewType?: string;
  params?: Record<string, string | number | boolean>;
  tags?: string[];
};

let runtimeInventoryTemplates: InventoryTemplate[] = [];

const primitiveValue = (value: string | number | boolean | undefined) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  return Boolean(value);
};

const clampDimension = (value: number) => {
  if (!Number.isFinite(value) || Number.isNaN(value)) {
    return 0.1;
  }

  return Math.max(0.05, Number(value.toFixed(2)));
};

const slugify = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const inferGenerator = (category: ObjectCategory, tags: string[]): GeneratorName => {
  const normalizedTags = tags.map((tag) => tag.toLowerCase());

  if (category === "sofa") return "SofaGenerator";
  if (category === "bed") return "BedGenerator";
  if (category === "table") return "TableGenerator";
  if (category === "chair") return "ChairGenerator";
  if (category === "wardrobe") return "WardrobeGenerator";
  if (category === "tv_unit") return "TVUnitGenerator";
  if (category === "carpet") return "CarpetGenerator";

  if (normalizedTags.some((tag) => tag.includes("chair") || tag.includes("seat"))) {
    return "ChairGenerator";
  }

  if (normalizedTags.some((tag) => tag.includes("bed") || tag.includes("sleep"))) {
    return "BedGenerator";
  }

  if (normalizedTags.some((tag) => tag.includes("sofa") || tag.includes("couch"))) {
    return "SofaGenerator";
  }

  return "GenericObjectGenerator";
};

const inferPreviewType = (
  previewType: string | undefined,
  category: ObjectCategory,
  tags: string[],
): InventoryPreviewType => {
  const normalized = (previewType ?? "").trim().toLowerCase();
  const normalizedTags = tags.map((tag) => tag.toLowerCase());

  const previewCandidates = new Set([
    "cube",
    "column",
    "sofa",
    "bed",
    "table",
    "chair",
    "wardrobe",
    "tv",
    "rug",
    "stairs",
    "lamp",
    "appliance",
    "storage",
    "decor",
    "door",
    "window",
    "wall",
    "kitchen",
    "bath",
    "plant",
    "instrument",
    "lighting",
  ]);

  if (previewCandidates.has(normalized)) {
    return normalized as InventoryPreviewType;
  }

  if (category === "sofa") return "sofa";
  if (category === "bed") return "bed";
  if (category === "table") return "table";
  if (category === "chair") return "chair";
  if (category === "wardrobe") return "wardrobe";
  if (category === "tv_unit") return "tv";
  if (category === "carpet") return "rug";

  if (normalizedTags.some((tag) => tag.includes("door"))) return "door";
  if (normalizedTags.some((tag) => tag.includes("window") || tag.includes("blind"))) return "window";
  if (normalizedTags.some((tag) => tag.includes("light") || tag.includes("lamp"))) return "lighting";
  if (normalizedTags.some((tag) => tag.includes("plant"))) return "plant";
  if (normalizedTags.some((tag) => tag.includes("instrument") || tag.includes("guitar") || tag.includes("piano"))) return "instrument";
  if (normalizedTags.some((tag) => tag.includes("bath") || tag.includes("shower") || tag.includes("toilet"))) return "bath";
  if (normalizedTags.some((tag) => tag.includes("kitchen") || tag.includes("appliance") || tag.includes("oven") || tag.includes("fridge"))) return "kitchen";
  if (normalizedTags.some((tag) => tag.includes("storage") || tag.includes("cabinet") || tag.includes("shelf"))) return "storage";

  return "decor";
};

const dedupeTemplates = (templates: InventoryTemplate[]) => {
  const seen = new Set<string>();

  return templates.filter((template) => {
    const signature = [
      template.id,
      template.labelKey,
      template.category,
      template.generator,
      template.previewType,
      template.dimensions.width,
      template.dimensions.depth,
      template.dimensions.height,
    ].join(":");

    if (seen.has(signature)) {
      return false;
    }

    seen.add(signature);
    return true;
  });
};

export function normalizeRuntimeInventoryTemplate(item: DiscoveredInventoryInput): InventoryTemplate {
  const tags = Array.from(
    new Set((item.tags ?? []).map((tag) => tag.trim()).filter(Boolean)),
  );
  const label = item.label.trim();
  const id = item.id.trim();
  const labelKey = item.labelKey?.trim() || `object.discovery.${slugify(label || id)}`;
  const params = Object.fromEntries(
    Object.entries(item.params ?? {}).map(([key, value]) => [key, primitiveValue(value)]),
  ) as RoomObject["params"];

  return {
    id,
    label,
    labelKey,
    category: item.category,
    generator: item.generator ?? inferGenerator(item.category, tags),
    color: item.color?.trim() || "#8a8f98",
    dimensions: {
      width: clampDimension(item.dimensions.width),
      depth: clampDimension(item.dimensions.depth),
      height: clampDimension(item.dimensions.height),
    },
    rotation: typeof item.rotation === "number" ? item.rotation : undefined,
    params: {
      ...params,
      discovered: true,
    },
    previewType: inferPreviewType(item.previewType, item.category, tags),
    featured: false,
    tags,
  };
}

export function setRuntimeInventoryTemplates(items: DiscoveredInventoryInput[] = []) {
  runtimeInventoryTemplates = dedupeTemplates(items.map((item) => normalizeRuntimeInventoryTemplate(item)));
  return getRuntimeInventoryTemplates();
}

export function clearRuntimeInventoryTemplates() {
  runtimeInventoryTemplates = [];
}

export function getRuntimeInventoryTemplates() {
  return runtimeInventoryTemplates.map((template) => ({
    ...template,
    dimensions: { ...template.dimensions },
    params: { ...template.params },
    tags: [...template.tags],
  }));
}

export function dedupeInventoryTemplates(templates: InventoryTemplate[]) {
  return dedupeTemplates(templates);
}

