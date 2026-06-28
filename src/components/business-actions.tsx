"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  startMessageWithBusinessOwner,
  sendProposalOutreach,
  toggleFollowBusiness,
} from "@/lib/actions/social";
import { toggleLikeBusiness } from "@/lib/actions/business";
import type { BusinessConnectionState, BusinessEvent } from "@/lib/types";
import { SaveButton } from "@/components/save-button";

type OutreachType = "proposal" | "event" | null;

function formatEventDate(startsAt: string) {
  return new Date(startsAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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
  senderEvents = [],
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
  senderEvents?: BusinessEvent[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [sentConversationId, setSentConversationId] = useState<string | null>(null);
  const [outreachType, setOutreachType] = useState<OutreachType>(null);
  const [outreachMsg, setOutreachMsg] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const isOwner = currentUserId === ownerId;

  const biz = businessName ?? "this business";

  const selectedEvent = senderEvents.find((e) => e.id === selectedEventId) ?? null;

  function buildEventNote(event: BusinessEvent | null, extra: string) {
    const base = event
      ? `Hi! I'd like to invite ${biz} to ${event.title} on ${formatEventDate(event.startsAt)}${event.location ? ` at ${event.location}` : ""}. Would love to see you there!`
      : `Hi! I wanted to invite ${biz} to an upcoming event.`;
    return extra.trim() ? `${base}\n\n${extra.trim()}` : base;
  }

  function openCollaborate() {
    if (!currentUserId) { router.push("/auth/login"); return; }
    setSent(false);
    setSentConversationId(null);
    setOutreachType("proposal");
    setOutreachMsg(`Hi! I'd like to explore a collaboration opportunity with ${biz}. We think there could be a great partnership here — would love to connect and share more details.`);
  }

  function openEventInvite() {
    if (!currentUserId) { router.push("/auth/login"); return; }
    setSent(false);
    setSentConversationId(null);
    setOutreachType("event");
    setSelectedEventId(senderEvents[0]?.id ?? "");
    setOutreachMsg("");
  }

  function sendOutreach() {
    const event = outreachType === "event" ? selectedEvent : null;
    const body = outreachType === "event"
      ? buildEventNote(event, outreachMsg)
      : outreachMsg.trim();

    if (!body) {
      setError("Please write a message before sending.");
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await sendProposalOutreach(businessId, outreachType!, body);
      if (result.error) { setError(result.error); return; }
      setSent(true);
      setSentConversationId(result.conversationId ?? null);
    });
  }

  function handleFollow() {
    if (!currentUserId) { router.push("/auth/login"); return; }
    startTransition(async () => {
      setError(null);
      const result = await toggleFollowBusiness(businessId);
      if (result.error) { setError(result.error); return; }
      setState((prev) => ({
        ...prev,
        isFollowing: !prev.isFollowing,
        followerCount: prev.isFollowing ? prev.followerCount - 1 : prev.followerCount + 1,
      }));
      router.refresh();
    });
  }

  function handleLike() {
    if (!currentUserId) { router.push("/auth/login"); return; }
    startTransition(async () => {
      setError(null);
      const result = await toggleLikeBusiness(businessId);
      if (result.error) { setError(result.error); return; }
      setState((prev) => ({ ...prev, isLiked: !prev.isLiked }));
      router.refresh();
    });
  }

  function handleMessage() {
    if (!currentUserId) { router.push("/auth/login"); return; }
    startTransition(async () => {
      setError(null);
      const result = await startMessageWithBusinessOwner(businessId);
      if (result.error) { setError(result.error); return; }
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
      } catch { /* user cancelled */ }
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
            <button type="button" disabled={pending} onClick={openCollaborate} className={buttonClass}>
              Collaborate
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
      {outreachType && !sent && (
        <div className="mt-3 rounded-xl border border-border bg-card p-4 text-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold">
              {outreachType === "proposal" ? "Send a collaboration request" : "Invite to an event"}
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
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-muted">
                Select one of your events
              </label>
              {senderEvents.length > 0 ? (
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  <option value="">— Choose an event —</option>
                  {senderEvents.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title} · {formatEventDate(event.startsAt)}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted">
                  You have no upcoming events. You can still send a personal invite below.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              {outreachType === "event" ? "Personal note" : "Your message"}
            </label>
            <textarea
              rows={4}
              value={outreachType === "event"
                ? outreachMsg || buildEventNote(selectedEvent, "")
                : outreachMsg}
              onChange={(e) => setOutreachMsg(
                outreachType === "event"
                  ? e.target.value
                  : e.target.value
              )}
              onFocus={() => {
                if (outreachType === "event" && !outreachMsg) {
                  setOutreachMsg(buildEventNote(selectedEvent, ""));
                }
              }}
              placeholder={outreachType === "event" ? "Personalise your invite…" : "Edit your message…"}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

          <button
            type="button"
            disabled={pending}
            onClick={sendOutreach}
            className="mt-3 rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? "Sending…" : outreachType === "event" ? "Send invite" : "Send message"}
          </button>
        </div>
      )}

      {/* Sent confirmation */}
      {sent && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
          <p className="font-medium text-emerald-800">Message sent!</p>
          {sentConversationId && (
            <a
              href={`/messages/${sentConversationId}`}
              className="mt-1 block text-xs text-emerald-700 underline"
            >
              View conversation →
            </a>
          )}
        </div>
      )}

      {!sent && error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
