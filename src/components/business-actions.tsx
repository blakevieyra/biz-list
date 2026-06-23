"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  requestConnection,
  startMessageWithBusinessOwner,
  toggleFollowBusiness,
} from "@/lib/actions/social";
import type { BusinessConnectionState } from "@/lib/types";

export function BusinessActions({
  businessId,
  ownerId,
  currentUserId,
  initialState,
}: {
  businessId: string;
  ownerId: string;
  currentUserId: string | null;
  initialState: BusinessConnectionState;
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

  function handleConnect() {
    if (!currentUserId) {
      router.push("/auth/login");
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await requestConnection(businessId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setState((prev) => ({ ...prev, connectionStatus: "pending" }));
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

  const connectLabel =
    state.connectionStatus === "pending"
      ? "Pending"
      : state.connectionStatus === "accepted"
        ? "Connected"
        : "Connect";

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {!isOwner && (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={handleFollow}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-accent/40 disabled:opacity-50"
            >
              {state.isFollowing ? "Following" : "Follow"}
            </button>
            <button
              type="button"
              disabled={pending || state.connectionStatus !== "none"}
              onClick={handleConnect}
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {connectLabel}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={handleMessage}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-accent/40 disabled:opacity-50"
            >
              Message
            </button>
          </>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-3 text-sm text-muted">
        {state.followerCount} followers
        {currentUserId ? ` · you follow ${state.followingCount} businesses` : ""}
      </p>
    </div>
  );
}
