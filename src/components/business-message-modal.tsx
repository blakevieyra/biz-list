"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { sendMessage, startMessageWithBusinessOwner } from "@/lib/actions/social";

export function BusinessMessageModal({
  businessId,
  businessName,
  open,
  onClose,
  currentUserId,
}: {
  businessId: string;
  businessName: string;
  open: boolean;
  onClose: () => void;
  currentUserId: string | null;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  function handleClose() {
    if (pending) return;
    setBody("");
    setError(null);
    setConversationId(null);
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    if (!currentUserId) {
      window.location.href = `/auth/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    startTransition(async () => {
      setError(null);
      const start = await startMessageWithBusinessOwner(businessId);
      if (start.error) {
        setError(start.error);
        return;
      }
      if (!start.conversationId) {
        setError("Could not start conversation.");
        return;
      }

      const sent = await sendMessage(start.conversationId, body.trim());
      if (sent.error) {
        setError(sent.error);
        return;
      }

      setConversationId(start.conversationId);
      setBody("");
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="business-message-title"
    >
      <button
        type="button"
        aria-label="Close message dialog"
        className="absolute inset-0"
        onClick={handleClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
        {conversationId ? (
          <>
            <h3 id="business-message-title" className="text-lg font-semibold">
              Message sent
            </h3>
            <p className="mt-2 text-sm text-muted">
              Your message was sent to {businessName}. Continue the conversation in Messages.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="min-h-10 rounded-full border border-border px-4 py-2 text-sm font-medium"
              >
                Close
              </button>
              <Link
                href={`/messages/${conversationId}`}
                className="inline-flex min-h-10 items-center justify-center rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover"
              >
                Open thread
              </Link>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3 id="business-message-title" className="text-lg font-semibold">
              Message {businessName}
            </h3>
            <p className="mt-1 text-sm text-muted">
              Ask a question, request info, or follow up without leaving this page.
            </p>

            <label className="mt-4 block text-sm">
              <span className="font-medium">Your message</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                rows={5}
                autoFocus
                placeholder="Hi — I'm interested in learning more about..."
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm"
              />
            </label>

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleClose}
                disabled={pending}
                className="min-h-10 rounded-full border border-border px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending || !body.trim()}
                className="min-h-10 rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {pending ? "Sending…" : "Send message"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
