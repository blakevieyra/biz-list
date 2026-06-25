"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleForumPostLike } from "@/lib/actions/social";

export function ForumPostLikeButton({
  postId,
  initialLiked,
  initialCount,
  requiresAuth,
}: {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
  requiresAuth: boolean;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (requiresAuth) {
      router.push("/auth/login");
      return;
    }
    startTransition(async () => {
      const result = await toggleForumPostLike(postId);
      if ("liked" in result) {
        setLiked(result.liked ?? false);
        setCount(result.likeCount ?? 0);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition disabled:opacity-50 ${
        liked
          ? "border-accent bg-blue-50 text-accent"
          : "border-border bg-card text-muted hover:border-accent/40 hover:text-foreground"
      }`}
    >
      {liked ? "Interested ✓" : "Interested"}
      {count > 0 && <span className="opacity-70">· {count}</span>}
    </button>
  );
}
