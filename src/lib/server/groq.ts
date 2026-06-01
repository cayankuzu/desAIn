import { layoutResponseSchema } from "@/lib/ai/schemas";
import { parseJsonObject } from "@/lib/ai/json";
import { buildLayoutChatGuidance } from "@/lib/ai/prompts";
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
      : "AI geçersiz bir layout çıktısı döndürdü ve yok sayıldı.",
  ],
});

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
    const text = await res.text();
    const excerpt = text.trim().slice(0, 280);
    const message =
      params.locale === "en"
        ? `Groq request failed (${res.status}). ${excerpt || "No response body."}`
        : `Groq isteği başarısız oldu (${res.status}). ${excerpt || "Yanıt gövdesi yok."}`;
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
          : "Geçerli bir layout yanıtı oluşturamadım.",
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
            : "Geçerli bir layout yanıtı oluşturamadım.",
      layout: buildFallbackLayout(params.locale),
    };
  }

  return {
    reply: parsed.reply,
    layout: layoutValidation.data,
  };
}
