"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleSaveItem } from "@/lib/actions/saved";

export function SaveButton({
  itemType,
  itemId,
  itemTitle,
  itemSubtitle,
  itemUrl,
  initialSaved = false,
  className,
  size = "default",
}: {
  itemType: string;
  itemId: string;
  itemTitle: string;
  itemSubtitle?: string;
  itemUrl?: string;
  initialSaved?: boolean;
  className?: string;
  size?: "default" | "sm" | "icon";
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleSaveItem({ itemType, itemId, itemTitle, itemSubtitle, itemUrl });
      if (result.error) return;
      setSaved(result.saved);
      router.refresh();
    });
  }

  if (size === "icon") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={handleToggle}
        title={saved ? "Remove from saved" : "Save"}
        className={`rounded-full p-1.5 transition-colors disabled:opacity-50 ${saved ? "text-accent" : "text-muted hover:text-foreground"} ${className ?? ""}`}
      >
        {saved ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7a2 2 0 0 0-2 2v16l7-3 7 3V5a2 2 0 0 0-2-2z"/></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3H7a2 2 0 0 0-2 2v16l7-3 7 3V5a2 2 0 0 0-2-2z"/></svg>
        )}
      </button>
    );
  }

  const base = size === "sm"
    ? "rounded-full border px-3 py-1 text-xs font-medium"
    : "rounded-full border px-4 py-2 text-sm font-medium";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleToggle}
      className={`${base} transition-colors disabled:opacity-50 ${
        saved
          ? "border-accent bg-teal-50 text-accent"
          : "border-border bg-card hover:border-accent/40"
      } ${className ?? ""}`}
    >
      {saved ? "Saved" : "Save"}
    </button>
  );
}
