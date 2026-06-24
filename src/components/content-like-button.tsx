"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleContentLike } from "@/lib/actions/business";
import type { ContentLikeTarget } from "@/lib/content-likes-types";

export function ContentLikeButton({
  businessId,
  targetType,
  targetId,
  initialCount,
  initialLiked,
  size = "sm",
}: {
  businessId: string;
  targetType: ContentLikeTarget;
  targetId: string;
  initialCount: number;
  initialLiked: boolean;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);

  function handleClick(e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();

    startTransition(async () => {
      const result = await toggleContentLike({ businessId, targetType, targetId });
      if (result.error) return;
      setLiked((v) => !v);
      setCount((c) => (liked ? Math.max(0, c - 1) : c + 1));
      router.refresh();
    });
  }

  const sizeClass =
    size === "md"
      ? "px-3 py-1.5 text-sm"
      : "px-2.5 py-1 text-xs";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleClick}
      className={`inline-flex items-center gap-1 rounded-full border font-medium disabled:opacity-50 ${sizeClass} ${
        liked
          ? "border-accent bg-teal-50 text-accent"
          : "border-border bg-card text-muted hover:border-accent/40 hover:text-foreground"
      }`}
    >
      {liked ? "Liked" : "Like"}
      {count > 0 ? <span>· {count}</span> : null}
    </button>
  );
}
