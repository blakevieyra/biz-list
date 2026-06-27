"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { askListingAgent } from "@/lib/actions/pro";
import { Card } from "@/components/ui";

export function ListingVirtualAgent({
  businessId,
  businessName,
  isAuthenticated,
}: {
  businessId: string;
  businessName: string;
  isAuthenticated?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: "user" | "agent"; text: string }[]>([]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-accent px-5 py-3 text-sm font-medium text-white shadow-lg hover:bg-accent-hover"
      >
        Chat with {businessName}
      </button>
    );
  }

  function send(e: React.FormEvent) {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setMessage("");

    startTransition(async () => {
      setError(null);
      const result = await askListingAgent({ businessId, message: text });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.reply) {
        setMessages((prev) => [...prev, { role: "agent", text: result.reply! }]);
      }
    });
  }

  return (
    <Card className="fixed bottom-6 right-6 z-40 flex w-[min(100vw-2rem,380px)] flex-col overflow-hidden border-accent/30 p-0 shadow-xl">
      <div className="flex items-center justify-between border-b border-border bg-teal-50 px-4 py-3">
        <div>
          <p className="text-sm font-semibold">{businessName} assistant</p>
          <p className="text-xs text-muted">Platinum virtual agent · live on this listing</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full px-2 py-1 text-xs text-muted hover:bg-white/80"
        >
          Close
        </button>
      </div>

      <div className="max-h-72 space-y-2 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted">
            Ask about services, hours, pricing, jobs, or partnerships.
          </p>
        )}
        {messages.map((entry, index) => (
          <div
            key={index}
            className={`rounded-lg px-3 py-2 text-sm ${
              entry.role === "user" ? "ml-6 bg-accent text-white" : "mr-6 bg-slate-100 text-foreground"
            }`}
          >
            {entry.text}
          </div>
        ))}
      </div>

      <form onSubmit={send} className="border-t border-border p-3">
        <div className="flex gap-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your question..."
            className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Send
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
