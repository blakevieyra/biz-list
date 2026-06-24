"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { virtualAgentReply } from "@/lib/actions/pro";
import { Card, PageHeader } from "@/components/ui";

export default function VirtualAgentClient({
  businessName = "Your business",
  category = "local services",
  services = "custom packages",
}: {
  businessName?: string;
  category?: string;
  services?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "agent"; text: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setMessage("");

    startTransition(async () => {
      setError(null);
      const result = await virtualAgentReply({
        businessName,
        category,
        services,
        message: text,
      });
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
    <>
      <PageHeader
        title="Virtual Agent"
        description="A customer-facing agent trained on your business profile, services, and hiring status."
      />

      <Card>
        <div className="mb-4 rounded-xl bg-teal-50 p-4 text-sm">
          Preview mode for <strong>{businessName}</strong> — responses use your profile, services, and common customer questions.
        </div>

        <div className="max-h-96 space-y-3 overflow-y-auto rounded-xl border border-border p-4">
          {messages.length === 0 && (
            <p className="text-sm text-muted">
              Try: &quot;What are your hours?&quot; or &quot;Are you hiring?&quot;
            </p>
          )}
          {messages.map((entry, index) => (
            <div
              key={index}
              className={`rounded-lg px-3 py-2 text-sm ${
                entry.role === "user" ? "ml-8 bg-accent text-white" : "mr-8 bg-slate-100"
              }`}
            >
              {entry.text}
            </div>
          ))}
        </div>

        <form onSubmit={sendMessage} className="mt-4 flex gap-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask as a customer would..."
            className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            Send
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </Card>

      <Link href="/dashboard" className="mt-6 inline-block text-sm text-accent hover:underline">
        ← Back to dashboard
      </Link>
    </>
  );
}
