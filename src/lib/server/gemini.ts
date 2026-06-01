import { roomDraftSchema, type RoomDraft } from "@/lib/ai/roomDraft";
import { parseJsonObject } from "@/lib/ai/json";
import {
  ROOM_ANALYSIS_OUTPUT_GUIDELINES,
  ROOM_ANALYSIS_RULES,
  ROOM_ANALYSIS_SYSTEM_PROMPT,
  ROOM_CAPTURE_GUIDANCE,
} from "@/lib/ai/prompts";

type GeminiInlineImage = {
  mimeType: string;
  base64: string;
};

type GeminiPart =
  | { text: string }
  | {
      inline_data: {
        mime_type: string;
        data: string;
      };
    };

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

export async function analyzeRoomWithGemini(params: {
  images: GeminiInlineImage[];
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
}) {
  const inventoryText = params.inventory
    .slice(0, 120)
    .map(
      (item) =>
        `- ${item.id} | ${item.category} | ${item.label} | ${item.width}x${item.depth}x${item.height}m | tags: ${item.tags.slice(0, 6).join(", ")}`,
    )
    .join("\n");

  const system = [
    ROOM_ANALYSIS_SYSTEM_PROMPT.trim(),
    "",
    ROOM_ANALYSIS_RULES.trim(),
    "",
    params.locale === "en"
      ? "Language: English. Write all human-readable notes, warnings, and capture advice in English."
      : "Dil: Türkçe. İnsan tarafından okunacak tüm notları, uyarıları ve çekim önerilerini Türkçe yaz.",
    "",
    ROOM_ANALYSIS_OUTPUT_GUIDELINES.trim(),
    "",
    params.locale === "en"
      ? "Capture guidance to apply while analyzing:"
      : "Analiz sırasında uygulanacak çekim rehberi:",
    ...ROOM_CAPTURE_GUIDANCE.map((line) => `- ${line}`),
    "",
    params.locale === "en" ? "Current inventory catalog:" : "Mevcut envanter kataloğu:",
    inventoryText,
  ].join("\n");

  const parts: GeminiPart[] = [{ text: system }];
  for (const image of params.images) {
    parts.push({
      inline_data: { mime_type: image.mimeType, data: image.base64 },
    });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(params.model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": params.apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.9,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as unknown;
  const response = json as GeminiResponse;
  const textParts = response.candidates?.[0]?.content?.parts ?? [];
  const text = textParts.map((p) => p.text).filter(Boolean).join("\n");

  const parsedUnknown = parseJsonObject<unknown>(text);
  if (!parsedUnknown || typeof parsedUnknown !== "object") {
    throw new Error("Gemini response did not contain valid JSON");
  }

  const parsed = roomDraftSchema.safeParse(parsedUnknown);
  if (!parsed.success) {
    throw new Error("Gemini response did not match RoomDraft schema");
  }

  return parsed.data satisfies RoomDraft;
}
