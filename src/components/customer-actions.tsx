"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { startMessageWithUser } from "@/lib/actions/social";

export function CustomerActions({
  userId,
  currentUserId,
}: {
  userId: string;
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isSelf = currentUserId === userId;

  function handleMessage() {
    if (!currentUserId) {
      router.push("/auth/login");
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await startMessageWithUser(userId);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.conversationId) {
        router.push(`/messages/${result.conversationId}`);
      }
    });
  }

  if (isSelf) {
    return (
      <button
        type="button"
        onClick={() => router.push("/profile/edit")}
        className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-accent/40"
      >
        Edit profile
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={handleMessage}
        className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
      >
        Message
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
