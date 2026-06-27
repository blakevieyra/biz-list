"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui";

type Message = { role: "user" | "agent"; text: string; streaming?: boolean };

function markdownToHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>")
    .replace(/^#{1,3} (.+)$/gm, "<strong>$1</strong>")
    .replace(/^[-•] (.+)$/gm, "• $1")
    .replace(/\n/g, "<br/>");
}

function BusinessAvatar({ imageUrl, name, size = "md" }: { imageUrl?: string | null; name: string; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-8 w-8 text-sm" : "h-10 w-10 text-base";
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        className={`${dim} flex-shrink-0 rounded-full object-cover shadow-sm ring-2 ring-white`}
      />
    );
  }
  return (
    <div className={`${dim} flex flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-accent to-teal-400 font-bold text-white shadow-sm ring-2 ring-white`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="mr-6 flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export function ListingVirtualAgent({
  businessId,
  businessName,
  businessImage,
  isAuthenticated,
  autoOpen = false,
}: {
  businessId: string;
  businessName: string;
  businessImage?: string | null;
  isAuthenticated?: boolean;
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);
  const [message, setMessage] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const welcomeSentRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const sendWelcome = useCallback(async () => {
    if (welcomeSentRef.current || streaming) return;
    welcomeSentRef.current = true;
    setStreaming(true);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch("/api/agent/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          message: `Greet the customer warmly in 1-2 sentences, introduce yourself as the virtual assistant for ${businessName}, and ask how you can help them today.`,
        }),
        signal: abort.signal,
      });

      if (!res.ok) return;

      setMessages([{ role: "agent", text: "", streaming: true }]);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload) as {
              type?: string;
              delta?: { type?: string; text?: string };
              text?: string;
            };
            let chunk = "";
            if (parsed.type === "content_block_delta" && parsed.delta?.text) chunk = parsed.delta.text;
            else if (parsed.type === "text" && parsed.text) chunk = parsed.text;
            if (chunk) {
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last?.role === "agent") copy[copy.length - 1] = { ...last, text: last.text + chunk, streaming: true };
                return copy;
              });
            }
          } catch { /* skip malformed */ }
        }
      }

      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === "agent") copy[copy.length - 1] = { ...last, streaming: false };
        return copy;
      });
    } catch (err: unknown) {
      if ((err as { name?: string }).name === "AbortError") return;
      // If welcome fails, show a static fallback so chat never looks empty
      setMessages([{
        role: "agent",
        text: `Hi! I'm the virtual assistant for ${businessName}. How can I help you today?`,
      }]);
    } finally {
      setStreaming(false);
    }
  }, [businessId, businessName, streaming]);

  // Send welcome message when chat is opened
  useEffect(() => {
    if (open && !welcomeSentRef.current) {
      sendWelcome();
    }
  }, [open, sendWelcome]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full bg-gradient-to-r from-violet-600 to-accent py-2.5 pl-2.5 pr-5 text-sm font-medium text-white shadow-lg transition hover:opacity-90"
      >
        <BusinessAvatar imageUrl={businessImage} name={businessName} size="sm" />
        Chat with {businessName}
      </button>
    );
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = message.trim();
    if (!text || streaming) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setMessage("");
    setError(null);
    setStreaming(true);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch("/api/agent/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, message: text }),
        signal: abort.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Failed to get a response.");
      }

      setMessages((prev) => [...prev, { role: "agent", text: "", streaming: true }]);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;

          try {
            const parsed = JSON.parse(payload) as {
              type?: string;
              delta?: { type?: string; text?: string };
              text?: string;
            };

            let chunk = "";
            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              chunk = parsed.delta.text;
            } else if (parsed.type === "text" && parsed.text) {
              chunk = parsed.text;
            }

            if (chunk) {
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last?.role === "agent") {
                  copy[copy.length - 1] = { ...last, text: last.text + chunk, streaming: true };
                }
                return copy;
              });
            }
          } catch {
            // ignore malformed SSE lines
          }
        }
      }

      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === "agent") copy[copy.length - 1] = { ...last, streaming: false };
        return copy;
      });
    } catch (err: unknown) {
      if ((err as { name?: string }).name === "AbortError") return;
      setError((err as Error).message ?? "Something went wrong.");
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === "agent" && last.streaming) copy.pop();
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <Card className="fixed bottom-6 right-6 z-40 flex w-[min(100vw-2rem,380px)] flex-col overflow-hidden border-accent/30 p-0 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-violet-50 to-teal-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <BusinessAvatar imageUrl={businessImage} name={businessName} />
          <div>
            <p className="text-sm font-semibold">{businessName}</p>
            <p className="text-xs text-muted">Virtual assistant · Powered by AI</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            abortRef.current?.abort();
            setOpen(false);
          }}
          className="rounded-full px-2 py-1 text-xs text-muted hover:bg-white/80"
        >
          Close
        </button>
      </div>

      {/* Messages */}
      <div className="max-h-72 space-y-2 overflow-y-auto px-4 py-3">
        {messages.map((entry, index) => (
          <div
            key={index}
            className={`rounded-lg px-3 py-2 text-sm ${
              entry.role === "user" ? "ml-6 bg-accent text-white" : "mr-6 bg-slate-100 text-foreground"
            }`}
          >
            {entry.role === "agent" ? (
              <>
                <span dangerouslySetInnerHTML={{ __html: markdownToHtml(entry.text) }} />
                {entry.streaming && (
                  <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-current opacity-70" />
                )}
              </>
            ) : (
              <>
                {entry.text}
                {entry.streaming && (
                  <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-current opacity-70" />
                )}
              </>
            )}
          </div>
        ))}
        {streaming && messages[messages.length - 1]?.role !== "agent" && <TypingDots />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} className="border-t border-border p-3">
        <div className="flex gap-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your question..."
            className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2 text-sm"
            disabled={streaming}
          />
          <button
            type="submit"
            disabled={streaming || !message.trim()}
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {streaming ? "…" : "Send"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        {isAuthenticated && (
          <Link
            href="/messages"
            className="mt-2 inline-block text-xs text-accent hover:underline"
          >
            Continue in Messages →
          </Link>
        )}
      </form>
    </Card>
  );
}
