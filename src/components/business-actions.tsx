"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  startMessageWithBusinessOwner,
  toggleFollowBusiness,
} from "@/lib/actions/social";
import { toggleLikeBusiness } from "@/lib/actions/business";
import type { BusinessConnectionState } from "@/lib/types";

export function BusinessActions({
  businessId,
  ownerId,
  currentUserId,
  initialState,
  shareTitle,
  shareUrl,
}: {
  businessId: string;
  ownerId: string;
  currentUserId: string | null;
  initialState: BusinessConnectionState;
  shareTitle?: string;
  shareUrl?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const isOwner = currentUserId === ownerId;

  function handleFollow() {
    if (!currentUserId) {
      router.push("/auth/login");
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await toggleFollowBusiness(businessId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setState((prev) => ({
        ...prev,
        isFollowing: !prev.isFollowing,
        followerCount: prev.isFollowing
          ? prev.followerCount - 1
          : prev.followerCount + 1,
      }));
      router.refresh();
    });
  }

  function handleLike() {
    if (!currentUserId) {
      router.push("/auth/login");
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await toggleLikeBusiness(businessId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setState((prev) => ({ ...prev, isLiked: !prev.isLiked }));
      router.refresh();
    });
  }

  function handleMessage() {
    if (!currentUserId) {
      router.push("/auth/login");
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await startMessageWithBusinessOwner(businessId);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.conversationId) {
        router.push(`/messages/${result.conversationId}`);
      }
    });
  }

  async function handleShare() {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle ?? "BizList listing", url: shareUrl });
        return;
      } catch {
        /* user cancelled */
      }
    }
    await navigator.clipboard.writeText(shareUrl);
  }

  const buttonClass =
    "rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-accent/40 disabled:opacity-50";

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {!isOwner && (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={handleFollow}
              className={buttonClass}
            >
              {state.isFollowing ? "Following" : "Follow"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={handleLike}
              className={`rounded-full border px-4 py-2 text-sm font-medium disabled:opacity-50 ${
                state.isLiked
                  ? "border-accent bg-teal-50 text-accent"
                  : "border-border bg-card hover:border-accent/40"
              }`}
            >
              {state.isLiked ? "Liked" : "Like"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={handleMessage}
              className={buttonClass}
            >
              Message
            </button>
            {shareUrl && (
              <button type="button" onClick={handleShare} className={buttonClass}>
                Share
              </button>
            )}
          </>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
