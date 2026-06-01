export type AIProviderId = "gemini" | "groq" | "mock";
export type AIChannelName = "vision" | "chat";

export interface AIChannelConfig {
  channel: AIChannelName;
  provider: AIProviderId;
  apiKey: string | null;
  model: string;
}

const readEnv = (name: string) => {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const isProviderId = (value: string | null): value is AIProviderId =>
  value === "gemini" || value === "groq" || value === "mock";

const readProvider = (channel: AIChannelName, legacyProvider: AIProviderId): AIProviderId => {
  const specific = readEnv(`AI_${channel.toUpperCase()}_PROVIDER`);

  if (isProviderId(specific)) {
    return specific;
  }

  return legacyProvider;
};

export function getAIChannelConfig(channel: AIChannelName): AIChannelConfig {
  if (channel === "vision") {
    const explicitProvider = readEnv("AI_VISION_PROVIDER");
    const apiKey =
      explicitProvider === "groq"
        ? readEnv("GROQ_API_KEY") ?? readEnv("AI_VISION_API_KEY") ?? readEnv("AI_CHAT_API_KEY")
        : readEnv("AI_VISION_API_KEY") ?? readEnv("GEMINI_API_KEY");
    const model =
      explicitProvider === "groq"
        ? readEnv("GROQ_VISION_MODEL") ??
          (readEnv("AI_VISION_MODEL")?.toLowerCase().includes("llama") ? readEnv("AI_VISION_MODEL") : null) ??
          "meta-llama/llama-4-scout-17b-16e-instruct"
        : readEnv("AI_VISION_MODEL") ?? readEnv("GEMINI_MODEL") ?? "gemini-2.5-flash";
    return {
      channel,
      provider: readProvider(channel, explicitProvider === "groq" ? "groq" : apiKey ? "gemini" : "mock"),
      apiKey,
      model,
    };
  }

  const explicitProvider = readEnv("AI_CHAT_PROVIDER");
  const chatModel = readEnv("AI_CHAT_MODEL");
  const chatApiKey = readEnv("AI_CHAT_API_KEY");
  const groqApiKey = readEnv("GROQ_API_KEY");
  const geminiApiKey = readEnv("GEMINI_API_KEY");
  const inferredProvider =
    isProviderId(explicitProvider)
      ? explicitProvider
      : chatModel?.toLowerCase().includes("gemini")
        ? "gemini"
        : chatApiKey || groqApiKey
          ? "groq"
          : geminiApiKey
            ? "gemini"
            : "mock";
  const provider = readProvider(channel, inferredProvider);
  const apiKey =
    provider === "gemini"
      ? geminiApiKey ?? chatApiKey
      : provider === "groq"
        ? groqApiKey ?? chatApiKey
        : null;
  const model =
    provider === "gemini"
      ? readEnv("GEMINI_MODEL") ?? (chatModel?.toLowerCase().includes("gemini") ? chatModel : null) ?? "gemini-2.5-flash"
      : provider === "groq"
        ? readEnv("GROQ_MODEL") ?? (chatModel && !chatModel.toLowerCase().includes("gemini") ? chatModel : null) ?? "llama-3.3-70b-versatile"
        : chatModel ?? "mock";
  return {
    channel,
    provider,
    apiKey,
    model,
  };
}

export function getGeminiFallbackConfig() {
  const apiKey = readEnv("AI_VISION_API_KEY") ?? readEnv("GEMINI_API_KEY");
  const model = readEnv("AI_VISION_MODEL") ?? readEnv("GEMINI_MODEL") ?? "gemini-2.5-flash";

  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    model,
  };
}

export function getGroqVisionFallbackConfig() {
  const apiKey = readEnv("GROQ_API_KEY");
  const model =
    readEnv("GROQ_VISION_MODEL") ??
    (readEnv("AI_VISION_MODEL")?.toLowerCase().includes("llama") ? readEnv("AI_VISION_MODEL") : null) ??
    "meta-llama/llama-4-scout-17b-16e-instruct";

  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    model,
  };
}

export function assertProviderReady(config: AIChannelConfig) {
  if (config.provider !== "mock" && !config.apiKey) {
    throw new Error(`Missing API key for ${config.channel} provider ${config.provider}`);
  }
}
