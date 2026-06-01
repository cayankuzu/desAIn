import { layoutResponseSchema } from "@/lib/ai/schemas";
import { parseJsonObject } from "@/lib/ai/json";
import { buildLayoutChatGuidance } from "@/lib/ai/prompts";
import type { LayoutChatResult } from "@/types/ai";
import type { ProjectMessage } from "@/types/project";
import type { RoomData } from "@/types/room";

type GeminiChatCompletion = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

export async function planLayoutWithGemini(params: {
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
      .map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      })) ?? [];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(params.model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": params.apiKey,
      },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: guidance }] },
          ...historyMessages,
          { role: "user", parts: [{ text: `User message: ${params.message}` }] },
        ],
        generationConfig: {
          temperature: 0.35,
          topK: 40,
          topP: 0.9,
          maxOutputTokens: 1600,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!res.ok) {
    const message =
      params.locale === "en"
        ? `Gemini request failed (${res.status}).`
        : `Gemini isteği başarısız oldu (${res.status}).`;

    return {
      reply: message,
      layout: {
        layoutName: "",
        summary: "",
        objects: [],
        constraintsRespected: [],
        warnings: [message],
      },
    };
  }

  const json = (await res.json()) as unknown;
  const response = json as GeminiChatCompletion;
  const textParts = response.candidates?.[0]?.content?.parts ?? [];
  const text = textParts.map((part) => part.text).filter(Boolean).join("\n");

  const parsedUnknown = parseJsonObject<unknown>(text);
  if (!parsedUnknown || typeof parsedUnknown !== "object") {
    return {
      reply:
        params.locale === "en"
          ? "I couldn't generate a valid layout response."
          : "Geçerli bir layout yanıtı oluşturamadım.",
      layout: {
        layoutName: "",
        summary: "",
        objects: [],
        constraintsRespected: [],
        warnings: [
          params.locale === "en"
            ? "Gemini returned an invalid layout payload."
            : "Gemini geçersiz bir layout çıktısı döndürdü.",
        ],
      },
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
            : "Geçerli bir layout yanıtı oluşturamadım.",
      layout: {
        layoutName: "",
        summary: "",
        objects: [],
        constraintsRespected: [],
        warnings: [
          params.locale === "en"
            ? "Gemini returned a layout payload that did not match the schema."
            : "Gemini şemayla eşleşmeyen bir layout çıktısı döndürdü.",
        ],
      },
    };
  }

  return {
    reply: parsed.reply,
    layout: layoutValidation.data,
  };
}
