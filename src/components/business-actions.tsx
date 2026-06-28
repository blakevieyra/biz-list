"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  startMessageWithBusinessOwner,
  toggleFollowBusiness,
} from "@/lib/actions/social";
import { toggleLikeBusiness } from "@/lib/actions/business";
import type { BusinessConnectionState } from "@/lib/types";
import { SaveButton } from "@/components/save-button";

type OutreachType = "proposal" | "event" | null;

export function BusinessActions({
  businessId,
  ownerId,
  currentUserId,
  initialState,
  shareTitle,
  shareUrl,
  businessName,
  initialSaved = false,
  listingUrl,
}: {
  businessId: string;
  ownerId: string;
  currentUserId: string | null;
  initialState: BusinessConnectionState;
  shareTitle?: string;
  shareUrl?: string;
  businessName?: string;
  initialSaved?: boolean;
  listingUrl?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [outreachType, setOutreachType] = useState<OutreachType>(null);
  const [outreachMsg, setOutreachMsg] = useState("");
  const [eventName, setEventName] = useState("");
  const isOwner = currentUserId === ownerId;

  const biz = businessName ?? "this business";

  function openProposal() {
    if (!currentUserId) { router.push("/auth/login"); return; }
    setOutreachType("proposal");
    setOutreachMsg(`Hi! I'd like to explore a collaboration opportunity with ${biz}. We think there could be a great partnership here — would love to connect and share more details.`);
  }

  function openEventInvite() {
    if (!currentUserId) { router.push("/auth/login"); return; }
    setOutreachType("event");
    setEventName("");
    setOutreachMsg("");
  }

  function sendOutreach() {
    const prefill = outreachType === "event"
      ? `Hi! I wanted to invite ${biz} to ${eventName || "an upcoming event"}. ${outreachMsg}`.trim()
      : outreachMsg.trim();
    if (!prefill) return;
    startTransition(async () => {
      setError(null);
      const result = await startMessageWithBusinessOwner(businessId);
      if (result.error) { setError(result.error); return; }
      if (result.conversationId) {
        router.push(`/messages/${result.conversationId}?prefill=${encodeURIComponent(prefill)}`);
      }
    });
  }

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
            <button type="button" disabled={pending} onClick={handleFollow} className={buttonClass}>
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
            <button type="button" disabled={pending} onClick={handleMessage} className={buttonClass}>
              Message
            </button>
            <button type="button" disabled={pending} onClick={openProposal} className={buttonClass}>
              Propose
            </button>
            <button type="button" disabled={pending} onClick={openEventInvite} className={buttonClass}>
              Invite to event
            </button>
            {currentUserId && (
              <SaveButton
                itemType="listing"
                itemId={businessId}
                itemTitle={businessName ?? shareTitle ?? "Business"}
                itemUrl={listingUrl ?? shareUrl}
                initialSaved={initialSaved}
              />
            )}
            {shareUrl && (
              <button type="button" onClick={handleShare} className={buttonClass}>
                Share
              </button>
            )}
          </>
        )}
      </div>

      {/* Outreach composer */}
      {outreachType && (
        <div className="mt-3 rounded-xl border border-border bg-card p-4 text-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-medium">
              {outreachType === "proposal" ? "Send a collaboration proposal" : "Invite to an event"}
            </p>
            <button
              type="button"
              onClick={() => setOutreachType(null)}
              className="text-xs text-muted hover:text-foreground"
            >
              Cancel
            </button>
          </div>

          {outreachType === "event" && (
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Event name or link (optional)"
              className="mb-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          )}

          <textarea
            rows={3}
            value={outreachMsg}
            onChange={(e) => setOutreachMsg(e.target.value)}
            placeholder={outreachType === "event" ? "Add a personal note (optional)…" : "Edit your message…"}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />

          <button
            type="button"
            disabled={pending}
            onClick={sendOutreach}
            className="mt-2 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? "Opening…" : "Open in messages"}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
