"use client";

import { useState } from "react";
import { Loader2, SendHorizonal } from "lucide-react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { useRoomStore } from "@/store/roomStore";
import type { ChatMessage as ChatMessageType, LayoutChatResult } from "@/types/ai";

const starterMessages: ChatMessageType[] = [
  {
    id: "assistant_welcome",
    role: "assistant",
    content:
      "Mevcut demo odan hazir. Bana 'daha ferah yap', 'TV odakli duzenle' ya da 'calisma masasini pencereye yaklastir' gibi istekler yazabilirsin.",
  },
];

export function AIChatPanel() {
  const roomData = useRoomStore((state) => state.roomData);
  const applyLayout = useRoomStore((state) => state.applyLayout);
  const setSelectedObjectId = useRoomStore((state) => state.setSelectedObjectId);
  const [messages, setMessages] = useState<ChatMessageType[]>(starterMessages);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);

  const submitPrompt = async () => {
    const prompt = draft.trim();

    if (!prompt || pending) {
      return;
    }

    const userMessage: ChatMessageType = {
      id: `user_${Date.now()}`,
      role: "user",
      content: prompt,
    };

    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setPending(true);

    try {
      const response = await fetch("/api/layout-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: prompt,
          roomData,
        }),
      });

      if (!response.ok) {
        throw new Error("Mock AI yaniti alinmadi.");
      }

      const result = (await response.json()) as LayoutChatResult;
      applyLayout(result.layout);
      setSelectedObjectId(result.layout.objects[0]?.id ?? null);

      setMessages((current) => [
        ...current,
        {
          id: `assistant_${Date.now()}`,
          role: "assistant",
          content: result.reply,
          layoutName: result.layout.layoutName,
          warnings: result.layout.warnings,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant_error_${Date.now()}`,
          role: "assistant",
          content:
            "Mock AI yanitini uygulayamadim. API route ve state tarafini kontrol etmek gerekebilir.",
          warnings: [error instanceof Error ? error.message : "Bilinmeyen hata"],
        },
      ]);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="rounded-[26px] border border-border/80 bg-surface-strong px-4 py-3 text-sm leading-6 text-foreground/80">
        Chat paneli su an mock API ile calisiyor. JSON akisi gercek AI modele gecmeye hazir olacak sekilde ayrildi.
      </div>

      <div className="scroll-area flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {pending ? (
          <div className="flex items-center gap-2 rounded-3xl border border-border/80 bg-surface-strong px-4 py-3 text-sm text-foreground/70">
            <Loader2 className="h-4 w-4 animate-spin" />
            Mock AI yeni yerlesim deniyor...
          </div>
        ) : null}
      </div>

      <div className="rounded-[28px] border border-border/80 bg-surface-strong p-3">
        <textarea
          aria-label="AI oda duzenleme istegi"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submitPrompt();
            }
          }}
          rows={4}
          placeholder="Ornek: Pencere onunu bos birak ve daha ferah yap."
          className="min-h-28 w-full resize-none rounded-2xl border border-border/80 bg-white/70 px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs leading-5 text-foreground/60">
            Oneri: `daha ferah yap`, `TV odakli yap`, `masa pencereye yakin olsun`
          </p>
          <button
            type="button"
            onClick={() => void submitPrompt()}
            disabled={pending || !draft.trim()}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SendHorizonal className="h-4 w-4" />
            Uygula
          </button>
        </div>
      </div>
    </div>
  );
}
