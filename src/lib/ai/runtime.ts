import {
  buildLocalCommandModeLayoutResponse,
  buildMockAnalysis,
} from "@/lib/ai/mockResponses";
import { sanitizeLayoutChatResult } from "@/lib/ai/layoutGuard";
import {
  getAIChannelConfig,
  getGeminiFallbackConfig,
  getGroqVisionFallbackConfig,
  assertProviderReady,
} from "@/lib/ai/providerConfig";
import { analyzeRoomWithGemini } from "@/lib/server/gemini";
import { analyzeRoomWithGroq } from "@/lib/server/groq";
import { planLayoutWithGemini } from "@/lib/server/geminiChat";
import { planLayoutWithGroq } from "@/lib/server/groq";
import type { LayoutChatResult } from "@/types/ai";
import type { ProjectMessage } from "@/types/project";
import type { RoomData } from "@/types/room";

const GEMINI_LAYOUT_MODEL_FALLBACKS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-2.5-flash-lite",
];

function isGeminiLayoutFailure(result: LayoutChatResult) {
  const signal = `${result.reply} ${result.layout.warnings.join(" ")}`.toLowerCase();
  return (
    signal.includes("gemini request failed") ||
    signal.includes("gemini returned") ||
    signal.includes("invalid layout payload") ||
    signal.includes("did not match the schema") ||
    signal.includes("unavailable") ||
    signal.includes("503") ||
    signal.includes("429")
  );
}

export async function analyzeRoomWithCurrentProvider(params: {
  images: Array<{
    mimeType: string;
    base64: string;
  }>;
  locale?: "tr" | "en";
  inventory: Array<{
    id: string;
    label: string;
    category: string;
    width: number;
    depth: number;
    height: number;
    tags: string[];
  }>;
}) {
  const config = getAIChannelConfig("vision");
  const locale = params.locale ?? "tr";
  const groqVision = getGroqVisionFallbackConfig();

  if (config.provider === "mock") {
    if (groqVision) {
      return await analyzeRoomWithGroq({
        images: params.images,
        inventory: params.inventory,
        apiKey: groqVision.apiKey,
        model: groqVision.model,
        locale,
      });
    }

    return buildMockAnalysis(locale);
  }

  assertProviderReady(config);

  switch (config.provider) {
    case "gemini":
      try {
        return await analyzeRoomWithGemini({
          images: params.images,
          inventory: params.inventory,
          apiKey: config.apiKey as string,
          model: config.model,
          locale,
        });
      } catch (geminiError) {
        if (groqVision) {
          return await analyzeRoomWithGroq({
            images: params.images,
            inventory: params.inventory,
            apiKey: groqVision.apiKey,
            model: groqVision.model,
            locale,
          });
        }

        throw geminiError instanceof Error
          ? geminiError
          : new Error("Gemini vision analysis failed");
      }
    case "groq": {
      const apiKey = groqVision?.apiKey ?? config.apiKey;
      const model = groqVision?.model ?? config.model;

      if (!apiKey) {
        throw new Error("Missing API key for vision provider groq");
      }
      return await analyzeRoomWithGroq({
        images: params.images,
        inventory: params.inventory,
        apiKey,
        model,
        locale,
      });
    }
    default:
      throw new Error(`Unsupported vision provider: ${config.provider}`);
  }
}

export async function planLayoutWithCurrentProvider(params: {
  message: string;
  roomData: RoomData;
  locale?: "tr" | "en";
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
}) {
  const config = getAIChannelConfig("chat");
  const locale = params.locale ?? "tr";

  if (config.provider === "mock") {
    const result = buildLocalCommandModeLayoutResponse(params.message, params.roomData, locale);
    return sanitizeLayoutChatResult({
      message: params.message,
      roomData: params.roomData,
      locale,
      selection: params.selection ?? null,
      result,
    });
  }

  assertProviderReady(config);

  switch (config.provider) {
    case "gemini": {
      try {
        const result = await planLayoutWithGemini({
          message: params.message,
          roomData: params.roomData,
          locale,
          history: params.history,
          selection: params.selection,
          apiKey: config.apiKey as string,
          model: config.model,
        });
        return sanitizeLayoutChatResult({
          message: params.message,
          roomData: params.roomData,
          locale,
          selection: params.selection ?? null,
          result,
        });
      } catch {
        const fallback = buildLocalCommandModeLayoutResponse(
          params.message,
          params.roomData,
          locale,
        );
        return sanitizeLayoutChatResult({
          message: params.message,
          roomData: params.roomData,
          locale,
          selection: params.selection ?? null,
          result: {
            ...fallback,
            layout: {
              ...fallback.layout,
              warnings: [
                ...fallback.layout.warnings,
                locale === "en"
                  ? "Gemini is temporarily unavailable, so a fallback layout was used."
                  : "Gemini geçici olarak kullanılamadığı için yedek bir layout kullanıldı.",
              ],
            },
          },
        });
      }
    }
    case "groq": {
      try {
        const result = await planLayoutWithGroq({
          message: params.message,
          roomData: params.roomData,
          locale,
          history: params.history,
          selection: params.selection,
          apiKey: config.apiKey as string,
          model: config.model,
        });
        return sanitizeLayoutChatResult({
          message: params.message,
          roomData: params.roomData,
          locale,
          selection: params.selection ?? null,
          result,
        });
      } catch {
        const geminiFallback = getGeminiFallbackConfig();

        if (geminiFallback) {
          const geminiModels = [
            geminiFallback.model,
            ...GEMINI_LAYOUT_MODEL_FALLBACKS,
          ].filter((model, index, self) => self.indexOf(model) === index);

          let lastResult: LayoutChatResult | null = null;

          for (const model of geminiModels) {
            const result = await planLayoutWithGemini({
              message: params.message,
              roomData: params.roomData,
              locale,
              history: params.history,
              selection: params.selection,
              apiKey: geminiFallback.apiKey,
              model,
            });
            lastResult = result;

            if (!isGeminiLayoutFailure(result)) {
              return sanitizeLayoutChatResult({
                message: params.message,
                roomData: params.roomData,
                locale,
                selection: params.selection ?? null,
                result,
              });
            }
          }

          if (lastResult) {
            return sanitizeLayoutChatResult({
              message: params.message,
              roomData: params.roomData,
              locale,
              selection: params.selection ?? null,
              result: lastResult,
            });
          }
        }

        const fallback = buildLocalCommandModeLayoutResponse(
          params.message,
          params.roomData,
          locale,
        );
        return sanitizeLayoutChatResult({
          message: params.message,
          roomData: params.roomData,
          locale,
          selection: params.selection ?? null,
          result: {
            ...fallback,
            layout: {
              ...fallback.layout,
              warnings: [
                ...fallback.layout.warnings,
                locale === "en"
                  ? "Groq is temporarily unavailable, so a fallback layout was used."
                  : "Groq geçici olarak kullanılamadığı için yedek bir layout kullanıldı.",
              ],
            },
          },
        });
      }
    }
    default:
      throw new Error(`Unsupported chat provider: ${config.provider}`);
  }
}
