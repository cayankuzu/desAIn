import { layoutResponseSchema } from "@/lib/ai/schemas";
import { parseJsonObject } from "@/lib/ai/json";
import {
  ROOM_ANALYSIS_OUTPUT_GUIDELINES,
  ROOM_ANALYSIS_RULES,
  ROOM_ANALYSIS_SYSTEM_PROMPT,
  ROOM_CAPTURE_GUIDANCE,
  buildLayoutChatGuidance,
} from "@/lib/ai/prompts";
import { roomDraftSchema, type RoomDraft } from "@/lib/ai/roomDraft";
import { GROQ_VISION_BATCH_SIZE } from "@/lib/project/workflowLimits";
import type { LayoutChatResult } from "@/types/ai";
import type { RoomData } from "@/types/room";
import type { ProjectMessage } from "@/types/project";

type GroqChatCompletion = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const buildFallbackLayout = (locale: "tr" | "en") => ({
  layoutName: "",
  summary: "",
  objects: [],
  constraintsRespected: [] as string[],
  warnings: [
    locale === "en"
      ? "The AI returned an invalid layout payload and it was ignored."
      : "AI geÃ§ersiz bir layout Ã§Ä±ktÄ±sÄ± dÃ¶ndÃ¼rdÃ¼ ve yok sayÄ±ldÄ±.",
  ],
});

const GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const chunkArray = <T,>(values: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
};

const buildInventoryText = (
  inventory: Array<{
    id: string;
    label: string;
    category: string;
    width: number;
    depth: number;
    height: number;
    tags: string[];
  }>,
) =>
  inventory
    .slice(0, 120)
    .map(
      (item) =>
        `- ${item.id} | ${item.category} | ${item.label} | ${item.width}x${item.depth}x${item.height}m | tags: ${item.tags.slice(0, 6).join(", ")}`,
    )
    .join("\n");

const VALID_ROOM_SHAPES = new Set(["rectangle", "square", "l_shape"]);
const VALID_OPENING_TYPES = new Set(["door", "window", "balcony_door", "radiator"]);
const VALID_ROOM_CATEGORIES = new Set([
  "sofa",
  "bed",
  "table",
  "chair",
  "wardrobe",
  "tv_unit",
  "carpet",
  "generic_box",
]);
const VALID_ROOM_GENERATORS = new Set([
  "SofaGenerator",
  "BedGenerator",
  "TableGenerator",
  "ChairGenerator",
  "WardrobeGenerator",
  "TVUnitGenerator",
  "CarpetGenerator",
  "GenericObjectGenerator",
]);

const FALLBACK_DIMENSIONS_BY_CATEGORY: Record<
  string,
  { width: number; depth: number; height: number }
> = {
  sofa: { width: 2.2, depth: 0.95, height: 0.85 },
  bed: { width: 2.0, depth: 1.6, height: 0.75 },
  table: { width: 1.2, depth: 0.8, height: 0.75 },
  chair: { width: 0.55, depth: 0.55, height: 0.95 },
  wardrobe: { width: 1.0, depth: 0.6, height: 2.0 },
  tv_unit: { width: 1.8, depth: 0.45, height: 0.55 },
  carpet: { width: 2.0, depth: 1.5, height: 0.02 },
  generic_box: { width: 0.8, depth: 0.3, height: 0.8 },
};

const GENERATOR_BY_CATEGORY: Record<string, string> = {
  sofa: "SofaGenerator",
  bed: "BedGenerator",
  table: "TableGenerator",
  chair: "ChairGenerator",
  wardrobe: "WardrobeGenerator",
  tv_unit: "TVUnitGenerator",
  carpet: "CarpetGenerator",
  generic_box: "GenericObjectGenerator",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toNumber = (value: unknown, fallback: number) => {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toOptionalNumber = (value: unknown) => {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
};

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const toStringValue = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;

const truncateText = (value: string, maxLength: number) =>
  value.length > maxLength ? value.slice(0, maxLength).trimEnd() : value;

const normalizeText = (value: unknown, fallback: string, maxLength: number) =>
  truncateText(toStringValue(value, fallback), maxLength);

const parseRetryDelayMs = (value: string | null) => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const headerSeconds = Number.parseFloat(trimmed);
  if (Number.isFinite(headerSeconds) && headerSeconds > 0) {
    return Math.max(250, Math.ceil(headerSeconds * 1000));
  }

  const secondsMatch = trimmed.match(/try again in\s+(\d+(?:\.\d+)?)s/i);
  if (secondsMatch) {
    return Math.max(250, Math.ceil(Number.parseFloat(secondsMatch[1]) * 1000));
  }

  return null;
};

const normalizeCategory = (value: unknown) => {
  const lowered = toStringValue(value, "generic_box").toLowerCase().replace(/\s+/g, "_");

  if (lowered.includes("sofa") || lowered.includes("couch")) return "sofa";
  if (lowered.includes("bed")) return "bed";
  if (lowered.includes("table") || lowered.includes("desk") || lowered.includes("sehp")) return "table";
  if (lowered.includes("chair") || lowered.includes("stool") || lowered.includes("sandal")) return "chair";
  if (lowered.includes("wardrobe") || lowered.includes("closet") || lowered.includes("dolap")) return "wardrobe";
  if (lowered.includes("tv") || lowered.includes("console") || lowered.includes("media")) return "tv_unit";
  if (lowered.includes("carpet") || lowered.includes("rug") || lowered.includes("hal")) return "carpet";
  if (VALID_ROOM_CATEGORIES.has(lowered)) return lowered;
  return "generic_box";
};

const normalizeGenerator = (category: string, value: unknown) => {
  const candidate = toStringValue(value, "");
  if (VALID_ROOM_GENERATORS.has(candidate)) {
    return candidate;
  }

  return GENERATOR_BY_CATEGORY[category] ?? "GenericObjectGenerator";
};

const normalizeParams = (value: unknown) => {
  if (!isRecord(value)) {
    return {};
  }

  const params: Record<string, string | number | boolean> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean") {
      params[key] = entry;
    }
  }

  return params;
};

const normalizeStringArray = (value: unknown, limit = 30, maxLength = 260) => {
  const source = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];

  return source
    .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    .map((entry) => truncateText(entry.trim(), maxLength))
    .slice(0, limit);
};

function normalizeRoomDraftCandidate(raw: unknown, previousDraft?: RoomDraft | null) {
  if (!isRecord(raw)) {
    return null;
  }

  const roomSource = isRecord(raw.room) ? raw.room : {};
  const roomDimensionsSource =
    isRecord(roomSource.dimensions) ? roomSource.dimensions : isRecord(raw.dimensions) ? raw.dimensions : {};
  const fallbackRoom = previousDraft?.room ?? { shape: "rectangle", width: 5.5, depth: 5.5, height: 2.6 };
  const roomShape = toStringValue(roomSource.shape ?? raw.shape, fallbackRoom.shape);
  const normalizedRoomShape = VALID_ROOM_SHAPES.has(roomShape) ? roomShape : fallbackRoom.shape;
  const normalizedRoomWidth = clampNumber(
    toNumber(roomSource.width ?? raw.width ?? roomDimensionsSource.width, fallbackRoom.width),
    0.5,
    50,
  );
  const normalizedRoomDepth = clampNumber(
    toNumber(roomSource.depth ?? raw.depth ?? roomDimensionsSource.depth, fallbackRoom.depth),
    0.5,
    50,
  );
  const normalizedRoomHeight = clampNumber(
    toNumber(roomSource.height ?? raw.height ?? roomDimensionsSource.height, fallbackRoom.height),
    1.8,
    6,
  );

  const room = {
    shape: normalizedRoomShape,
    width: normalizedRoomWidth,
    depth: normalizedRoomDepth,
    height: normalizedRoomHeight,
    openings: Array.isArray(roomSource.openings)
      ? roomSource.openings.slice(0, 24).map((entry, index) => {
          const opening = isRecord(entry) ? entry : {};
          const type = toStringValue(opening.type, "door").toLowerCase();
          return {
            id: normalizeText(opening.id, `${type}_${index + 1}`, 80),
            type: VALID_OPENING_TYPES.has(type) ? type : "door",
            wallId: normalizeText(opening.wallId ?? opening.wall, "wall_1", 80),
            position: Math.max(0, toNumber(opening.position ?? opening.along, 0.5)),
            width: clampNumber(toNumber(opening.width, 0.9), 0.2, 8),
            height: toOptionalNumber(opening.height),
            sillHeight: toOptionalNumber(opening.sillHeight),
            clearDepth: toOptionalNumber(opening.clearDepth),
            locked: typeof opening.locked === "boolean" ? opening.locked : true,
          };
        })
      : [],
  };

  const items = Array.isArray(raw.items)
    ? raw.items.slice(0, 120).map((entry) => {
        const item = isRecord(entry) ? entry : {};
        const templateId = normalizeText(
          item.templateId ?? item.template ?? item.id ?? item.name,
          "template_generic_box",
          120,
        );
        return {
          templateId,
          x: Math.max(0, toNumber(item.x ?? item.left, 0)),
          z: Math.max(0, toNumber(item.z ?? item.y ?? item.top, 0)),
          rotation: toOptionalNumber(item.rotation),
          locked: typeof item.locked === "boolean" ? item.locked : undefined,
          note:
            typeof item.note === "string" && item.note.trim().length > 0
              ? truncateText(item.note.trim(), 160)
              : undefined,
        };
      })
    : [];

  const notes = normalizeStringArray(raw.notes, 30, 240);
  const warnings = normalizeStringArray(raw.warnings, 20, 260);
  const captureAdvice = normalizeStringArray(raw.captureAdvice, 20, 260);
  const confidenceValue = toStringValue(raw.confidence, "medium").toLowerCase();
  const confidence = ["high", "medium", "low"].includes(confidenceValue)
    ? (confidenceValue as "high" | "medium" | "low")
    : "medium";

  const discoveredInventory = Array.isArray(raw.discoveredInventory)
    ? raw.discoveredInventory.slice(0, 40).map((entry, index) => {
        const item = isRecord(entry) ? entry : {};
        const category = normalizeCategory(item.category);
        const dimensionsSource = isRecord(item.dimensions) ? item.dimensions : {};
        const fallbackDimensions = FALLBACK_DIMENSIONS_BY_CATEGORY[category] ?? FALLBACK_DIMENSIONS_BY_CATEGORY.generic_box;

        return {
          id: normalizeText(item.id ?? item.templateId ?? item.name, `discovered_${index + 1}`, 80),
          label: normalizeText(item.label ?? item.name ?? item.id, `Discovered item ${index + 1}`, 80),
          labelKey:
            typeof item.labelKey === "string" && item.labelKey.trim().length > 0
              ? truncateText(item.labelKey.trim(), 120)
              : undefined,
          category,
          generator: normalizeGenerator(category, item.generator),
          color:
            typeof item.color === "string" && item.color.trim().length >= 3
              ? truncateText(item.color.trim(), 24)
              : undefined,
          dimensions: {
            width: clampNumber(
              toNumber(dimensionsSource.width ?? item.width, fallbackDimensions.width),
              0.05,
              20,
            ),
            depth: clampNumber(
              toNumber(dimensionsSource.depth ?? item.depth, fallbackDimensions.depth),
              0.05,
              20,
            ),
            height: clampNumber(
              toNumber(dimensionsSource.height ?? item.height, fallbackDimensions.height),
              0.05,
              20,
            ),
          },
          rotation: toOptionalNumber(item.rotation),
          previewType:
            typeof item.previewType === "string" && item.previewType.trim().length > 0
              ? truncateText(item.previewType.trim(), 40)
              : undefined,
          params: normalizeParams(item.params),
          tags: normalizeStringArray(item.tags, 24, 40),
        };
      })
    : [];

  return {
    room,
    items,
    notes,
    warnings,
    captureAdvice,
    confidence,
    discoveredInventory,
  };
}

function buildRoomAnalysisGuidance(params: {
  locale: "tr" | "en";
  inventory: Array<{
    id: string;
    label: string;
    category: string;
    width: number;
    depth: number;
    height: number;
    tags: string[];
  }>;
  batchIndex: number;
  batchCount: number;
  previousDraft?: RoomDraft | null;
}) {
  const inventoryText = buildInventoryText(params.inventory);
  const isEnglish = params.locale === "en";

  return [
    ROOM_ANALYSIS_SYSTEM_PROMPT.trim(),
    "",
    ROOM_ANALYSIS_RULES.trim(),
    "",
    isEnglish
      ? "Language: English. Write all human-readable notes, warnings, and capture advice in English."
      : "Dil: TÃ¼rkÃ§e. Ä°nsan tarafÄ±ndan okunacak tÃ¼m notlarÄ±, uyarÄ±larÄ± ve Ã§ekim Ã¶nerilerini TÃ¼rkÃ§e yaz.",
    "",
    ROOM_ANALYSIS_OUTPUT_GUIDELINES.trim(),
    "",
    isEnglish
      ? "Capture guidance to apply while analyzing:"
      : "Analiz sÄ±rasÄ±nda uygulanacak Ã§ekim rehberi:",
    ...ROOM_CAPTURE_GUIDANCE.map((line) => `- ${line}`),
    "",
    isEnglish ? "Current inventory catalog:" : "Mevcut envanter kataloÄŸu:",
    inventoryText,
    "",
    isEnglish
      ? `This is photo batch ${params.batchIndex + 1} of ${params.batchCount}. Analyze this batch as part of the same room capture session.`
      : `Bu, aynÄ± oda Ã§ekiminin ${params.batchIndex + 1}. fotoÄŸraf grubu. Bu grubu aynÄ± oda Ã§ekiminin bir parÃ§asÄ± olarak analiz et.`,
    params.previousDraft
      ? [
          "",
          isEnglish
            ? "Previous draft to refine with this new batch:"
            : "Bu yeni grupla iyileÅŸtirilecek Ã¶nceki taslak:",
          JSON.stringify(params.previousDraft, null, 2),
          "",
          isEnglish
            ? "Refine the previous draft conservatively using the new images. Preserve correct facts, fix wrong dimensions or placements, and return the full updated RoomDraft JSON."
            : "Ã–nceki taslaÄŸÄ± yeni gÃ¶rÃ¼ntÃ¼lere gÃ¶re temkinli biÃ§imde iyileÅŸtir. DoÄŸru bilgileri koru, yanlÄ±ÅŸ Ã¶lÃ§Ã¼leri veya yerleÅŸimleri dÃ¼zelt ve tam gÃ¼ncellenmiÅŸ RoomDraft JSON dÃ¶ndÃ¼r.",
        ].join("\n")
      : isEnglish
        ? "Return a complete RoomDraft JSON for this room capture."
        : "Bu oda Ã§ekimi iÃ§in eksiksiz bir RoomDraft JSON dÃ¶ndÃ¼r.",
  ].join("\n");
}

async function analyzeRoomWithGroqVisionChunk(params: {
  images: Array<{
    mimeType: string;
    base64: string;
  }>;
  inventory: Array<{
    id: string;
    label: string;
    category: string;
    width: number;
    depth: number;
    height: number;
    tags: string[];
  }>;
  apiKey: string;
  model: string;
  locale: "tr" | "en";
  batchIndex: number;
  batchCount: number;
  previousDraft?: RoomDraft | null;
}): Promise<RoomDraft> {
  const guidance = buildRoomAnalysisGuidance({
    locale: params.locale,
    inventory: params.inventory,
    batchIndex: params.batchIndex,
    batchCount: params.batchCount,
    previousDraft: params.previousDraft ?? null,
  });

  const content = [
    {
      type: "text",
      text: params.previousDraft
        ? params.locale === "en"
          ? "Refine the previous draft using this new photo batch and return only JSON."
          : "Ã–nceki taslaÄŸÄ± bu yeni fotoÄŸraf grubuyla iyileÅŸtir ve yalnÄ±zca JSON dÃ¶ndÃ¼r."
        : params.locale === "en"
          ? "Analyze the room photos and return only JSON."
          : "Oda fotoÄŸraflarÄ±nÄ± analiz et ve yalnÄ±zca JSON dÃ¶ndÃ¼r.",
    },
    ...params.images.map((image) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:${image.mimeType};base64,${image.base64}`,
      },
    })),
  ];

  const requestBody = {
    model: params.model || GROQ_VISION_MODEL,
    messages: [
      { role: "system", content: guidance },
      { role: "user", content },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_completion_tokens: 1280,
  };

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < 3) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errorText = await res.text();
      lastError = new Error(`Groq vision request failed (${res.status}): ${errorText}`);

      if (res.status === 429 && attempt < 2) {
        const retryAfterMs = parseRetryDelayMs(res.headers.get("retry-after") ?? errorText);
        if (retryAfterMs) {
          await delay(retryAfterMs);
          attempt += 1;
          continue;
        }
      }

      break;
    }

    const json = (await res.json()) as unknown;
    const response = json as GroqChatCompletion;
    const contentText = response.choices?.[0]?.message?.content ?? "";
    const parsedUnknown = parseJsonObject<unknown>(contentText);

    if (!parsedUnknown || typeof parsedUnknown !== "object") {
      lastError = new Error("Groq vision response did not contain valid JSON");
      break;
    }

    const normalized = normalizeRoomDraftCandidate(parsedUnknown, params.previousDraft ?? null);
    const parsed = normalized ? roomDraftSchema.safeParse(normalized) : null;
    if (!parsed || !parsed.success) {
      lastError = new Error("Groq vision response did not match RoomDraft schema");
      break;
    }

    return parsed.data;
  }

  const warning =
    params.locale === "en"
      ? `Vision analysis fell back after a provider error: ${lastError?.message ?? "unknown error"}`
      : `Görsel analiz sağlayıcı hatası sonrası güvenli yedeğe düştü: ${lastError?.message ?? "bilinmeyen hata"}`;

  if (params.previousDraft) {
    return {
      ...params.previousDraft,
      warnings: normalizeStringArray([...(params.previousDraft.warnings ?? []), warning], 20, 260),
    };
  }

  return {
    room: {
      shape: "rectangle",
      width: 5.5,
      depth: 5.5,
      height: 2.6,
      openings: [],
    },
    items: [],
    notes: [],
    warnings: [warning],
    captureAdvice: [],
    confidence: "low",
    discoveredInventory: [],
  };
}

export async function analyzeRoomWithGroq(params: {
  images: Array<{
    mimeType: string;
    base64: string;
  }>;
  inventory: Array<{
    id: string;
    label: string;
    category: string;
    width: number;
    depth: number;
    height: number;
    tags: string[];
  }>;
  apiKey: string;
  model?: string;
  locale: "tr" | "en";
}): Promise<RoomDraft> {
  if (!params.images.length) {
    throw new Error("No room images were provided");
  }

  const chunks = chunkArray(params.images, GROQ_VISION_BATCH_SIZE);
  let previousDraft: RoomDraft | null = null;

  for (let index = 0; index < chunks.length; index += 1) {
    previousDraft = await analyzeRoomWithGroqVisionChunk({
      images: chunks[index],
      inventory: params.inventory,
      apiKey: params.apiKey,
      model: params.model ?? GROQ_VISION_MODEL,
      locale: params.locale,
      batchIndex: index,
      batchCount: chunks.length,
      previousDraft,
    });
  }

  if (!previousDraft) {
    throw new Error("Groq vision analysis did not produce a draft");
  }

  return previousDraft;
}

export async function planLayoutWithGroq(params: {
  message: string;
  roomData: RoomData;
  locale: "tr" | "en";
  history?: ProjectMessage[];
  selection?: {
    objectId?: string | null;
    objectIds?: string[];
    groupId?: string | null;
    structure?:
      | {
          type: "wall" | "opening";
          id: string;
        }
      | null;
  } | null;
  apiKey: string;
  model: string;
}): Promise<LayoutChatResult> {
  const guidance = buildLayoutChatGuidance({
    locale: params.locale,
    roomData: params.roomData,
    selection: params.selection ?? null,
  });

  const historyMessages =
    params.history
      ?.filter((message) => message.role === "user" || message.role === "assistant")
      .slice(-6)
      .map((message) => ({ role: message.role, content: message.content })) ?? [];

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: "system", content: guidance },
        ...historyMessages,
        { role: "user", content: `User message: ${params.message}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.35,
      max_completion_tokens: 1600,
    }),
  });

  if (!res.ok) {
    const message =
      params.locale === "en"
        ? `Groq request failed (${res.status}).`
        : `Groq isteÄŸi baÅŸarÄ±sÄ±z oldu (${res.status}).`;
    throw new Error(message);
  }

  const json = (await res.json()) as unknown;
  const response = json as GroqChatCompletion;
  const content = response.choices?.[0]?.message?.content ?? "";

  const parsedUnknown = parseJsonObject<unknown>(content);
  if (!parsedUnknown || typeof parsedUnknown !== "object") {
    return {
      reply:
        params.locale === "en"
          ? "I couldn't generate a valid layout response."
          : "GeÃ§erli bir layout yanÄ±tÄ± oluÅŸturamadÄ±m.",
      layout: buildFallbackLayout(params.locale),
    };
  }

  const parsed = parsedUnknown as { reply?: unknown; layout?: unknown };
  const layoutValidation = layoutResponseSchema.safeParse(parsed.layout);
  if (!layoutValidation.success || typeof parsed.reply !== "string") {
    return {
      reply:
        typeof parsed.reply === "string"
          ? parsed.reply
          : params.locale === "en"
            ? "I couldn't generate a valid layout response."
            : "GeÃ§erli bir layout yanÄ±tÄ± oluÅŸturamadÄ±m.",
      layout: buildFallbackLayout(params.locale),
    };
  }

  return {
    reply: parsed.reply,
    layout: layoutValidation.data,
  };
}
