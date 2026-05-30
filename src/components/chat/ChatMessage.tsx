import type { ChatMessage as ChatMessageType } from "@/types/ai";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <article
      className={`rounded-3xl border px-4 py-3 ${
        message.role === "assistant"
          ? "border-border/80 bg-surface-strong text-foreground"
          : "border-accent/20 bg-accent text-white"
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.22em] opacity-70">
          {message.role === "assistant" ? "desAIn AI" : "Sen"}
        </span>
        {message.layoutName ? (
          <span className="rounded-full bg-black/5 px-2 py-1 text-[10px] font-semibold tracking-[0.2em] uppercase">
            {message.layoutName}
          </span>
        ) : null}
      </div>
      <p className="text-sm leading-6">{message.content}</p>
      {message.warnings?.length ? (
        <div className="mt-3 rounded-2xl border border-warning/20 bg-warning/10 px-3 py-2 text-xs leading-5 text-warning">
          {message.warnings.join(" ")}
        </div>
      ) : null}
    </article>
  );
}
