"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sendMessage } from "@/lib/actions/social";
import type { Message } from "@/lib/types";
import { Card, formatPostDateTime } from "./ui";

function Avatar({
  name,
  avatarUrl,
  size = 36,
}: {
  name: string;
  avatarUrl?: string;
  size?: number;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (avatarUrl && !imgFailed) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-teal-50 text-xs font-bold text-accent"
      style={{ width: size, height: size }}
    >
      {initials || "?"}
    </div>
  );
}

export function MessageThread({
  conversationId,
  initialMessages,
  currentUserId,
  currentUserName,
  currentUserAvatarUrl,
  otherUserName,
  otherUserAvatarUrl,
  otherUserIsSeekingWork,
  businessIsHiring,
  initialBody,
}: {
  conversationId: string;
  initialMessages: Message[];
  currentUserId: string;
  currentUserName?: string;
  currentUserAvatarUrl?: string;
  otherUserName?: string;
  otherUserAvatarUrl?: string;
  otherUserIsSeekingWork?: boolean;
  businessIsHiring?: boolean;
  initialBody?: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState(initialBody ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      {/* Badges */}
      {(otherUserIsSeekingWork || businessIsHiring) && (
        <div className="mb-4 flex flex-wrap gap-2">
          {otherUserIsSeekingWork && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
              Looking for work
            </span>
          )}
          {businessIsHiring && (
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
              Hiring
            </span>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="space-y-4">
        {initialMessages.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">No messages yet. Say hello!</p>
          </Card>
        ) : (
          initialMessages.map((message) => {
            const isMine = message.senderId === currentUserId;
            const name = isMine ? (currentUserName ?? "Me") : (otherUserName ?? message.senderName);
            const avatarUrl = isMine ? currentUserAvatarUrl : otherUserAvatarUrl;

            return (
              <div
                key={message.id}
                className={`flex items-end gap-2.5 ${isMine ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <Avatar name={name} avatarUrl={avatarUrl} size={34} />

                {/* Bubble */}
                <div className={`max-w-[72%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                  <p className={`mb-1 text-xs font-medium text-muted ${isMine ? "text-right" : "text-left"}`}>
                    {name}
                  </p>
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      isMine
                        ? "rounded-br-sm bg-accent text-white"
                        : "rounded-bl-sm border border-border bg-card"
                    }`}
                  >
                    <p>{message.body}</p>
                    <p className={`mt-1 text-xs ${isMine ? "text-teal-100" : "text-muted"}`}>
                      {formatPostDateTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Compose */}
      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!body.trim()) return;
          startTransition(async () => {
            setError(null);
            const result = await sendMessage(conversationId, body.trim());
            if (result.error) { setError(result.error); return; }
            setBody("");
            router.refresh();
          });
        }}
      >
        <textarea
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message…"
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending || !body.trim()}
          className="mt-3 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send message"}
        </button>
      </form>
    </div>
  );
}
