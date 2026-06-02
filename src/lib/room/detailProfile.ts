import type { ObjectCategory, RoomObject } from "@/types/room";

type DetailSource = {
  id?: string;
  labelKey?: string;
  category?: ObjectCategory;
  color?: string;
  params?: RoomObject["params"];
};

export type ObjectDetailProfile = {
  seed: number;
  variant: number;
  accentColor: string;
  trimColor: string;
  darkTrimColor: string;
  metalColor: string;
  fabricColor: string;
  glassColor: string;
  pattern: string;
  handleStyle: string;
  lineCount: number;
  warmth: number;
};

const accentPalette = [
  "#e6b06f",
  "#8db2c7",
  "#c97966",
  "#8fa56d",
  "#d8c486",
  "#a78bc6",
  "#7fb6a4",
  "#c6977a",
  "#7f9bc2",
  "#d3a557",
];

const trimPalette = [
  "#f4e6d4",
  "#d8c7b2",
  "#c9d8dc",
  "#ead2a6",
  "#d0b693",
  "#e8edf0",
  "#c5b59d",
  "#d7d1c6",
];

const darkTrimPalette = [
  "#27313a",
  "#3f342c",
  "#4b4036",
  "#24323a",
  "#3d4a42",
  "#312c3b",
];

const metalPalette = ["#b7bfc8", "#d8c59d", "#9fa8ad", "#c7b48b", "#aeb7c2"];
const fabricPalette = ["#efe2d6", "#d8e5dd", "#e7d0b6", "#d7dfec", "#e6d7e9", "#eee9d1"];
const glassPalette = ["#c7e0ea", "#b9d3df", "#dcecf4", "#a9c6d8", "#c2d7e4"];
const patternNames = ["stripe", "grid", "panel", "dot", "rail", "plain"];
const handleStyles = ["bar", "knob", "slot", "rail"];

const hashString = (input: string) => {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const pick = (values: string[], seed: number, shift = 0) =>
  values[(seed >>> shift) % values.length];

const getNumberParam = (
  params: RoomObject["params"] | undefined,
  key: string,
  fallback: number,
) => {
  const value = params?.[key];

  return typeof value === "number" ? value : fallback;
};

const getStringParam = (
  params: RoomObject["params"] | undefined,
  key: string,
  fallback: string,
) => {
  const value = params?.[key];

  return typeof value === "string" ? value : fallback;
};

export const createInventoryDetailParams = (source: DetailSource) => {
  const seed = hashString(
    [
      source.id,
      source.labelKey,
      source.category,
      source.color,
      source.params?.baseShape,
    ]
      .filter(Boolean)
      .join("|"),
  );

  return {
    detailSeed: seed % 9973,
    detailVariant: seed % 9,
    detailAccent: pick(accentPalette, seed),
    detailTrim: pick(trimPalette, seed, 4),
    detailDarkTrim: pick(darkTrimPalette, seed, 8),
    detailMetal: pick(metalPalette, seed, 12),
    detailFabric: pick(fabricPalette, seed, 16),
    detailGlass: pick(glassPalette, seed, 20),
    detailPattern: pick(patternNames, seed, 24),
    detailHandleStyle: pick(handleStyles, seed, 28),
    detailLineCount: 2 + (seed % 5),
    detailWarmth: Number((0.78 + ((seed >>> 6) % 28) / 100).toFixed(2)),
  };
};

export const getObjectDetailProfile = (object: DetailSource): ObjectDetailProfile => {
  const fallback = createInventoryDetailParams(object);
  const seed = getNumberParam(object.params, "detailSeed", Number(fallback.detailSeed));

  return {
    seed,
    variant: getNumberParam(object.params, "detailVariant", Number(fallback.detailVariant)),
    accentColor: getStringParam(object.params, "detailAccent", String(fallback.detailAccent)),
    trimColor: getStringParam(object.params, "detailTrim", String(fallback.detailTrim)),
    darkTrimColor: getStringParam(object.params, "detailDarkTrim", String(fallback.detailDarkTrim)),
    metalColor: getStringParam(object.params, "detailMetal", String(fallback.detailMetal)),
    fabricColor: getStringParam(object.params, "detailFabric", String(fallback.detailFabric)),
    glassColor: getStringParam(object.params, "detailGlass", String(fallback.detailGlass)),
    pattern: getStringParam(object.params, "detailPattern", String(fallback.detailPattern)),
    handleStyle: getStringParam(object.params, "detailHandleStyle", String(fallback.detailHandleStyle)),
    lineCount: getNumberParam(object.params, "detailLineCount", Number(fallback.detailLineCount)),
    warmth: getNumberParam(object.params, "detailWarmth", Number(fallback.detailWarmth)),
  };
};
