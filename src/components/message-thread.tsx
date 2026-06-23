"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sendMessage } from "@/lib/actions/social";
import type { Message } from "@/lib/types";
import { Card, formatDate } from "./ui";

export function MessageThread({
  conversationId,
  initialMessages,
  currentUserId,
}: {
  conversationId: string;
  initialMessages: Message[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <div className="space-y-3">
        {initialMessages.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">No messages yet. Say hello!</p>
          </Card>
        ) : (
          initialMessages.map((message) => {
            const isMine = message.senderId === currentUserId;
            return (
              <div
                key={message.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    isMine
                      ? "bg-accent text-white"
                      : "border border-border bg-card"
                  }`}
                >
                  {!isMine && (
                    <p className="mb-1 text-xs font-medium opacity-80">
                      {message.senderName}
                    </p>
                  )}
                  <p>{message.body}</p>
                  <p
                    className={`mt-1 text-xs ${isMine ? "text-teal-100" : "text-muted"}`}
                  >
                    {formatDate(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!body.trim()) return;

          startTransition(async () => {
            setError(null);
            const result = await sendMessage(conversationId, body.trim());
            if (result.error) {
              setError(result.error);
              return;
            }
            setBody("");
            router.refresh();
          });
        }}
      >
        <textarea
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message..."
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending || !body.trim()}
          className="mt-3 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Sending..." : "Send message"}
        </button>
      </form>
    </div>
  );
}
