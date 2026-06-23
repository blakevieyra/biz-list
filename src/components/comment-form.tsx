"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createComment } from "@/lib/actions/social";

export function CommentForm({
  postId,
  isAuthenticated,
}: {
  postId: string;
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!isAuthenticated) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-border bg-background px-4 py-6 text-center text-sm">
        <p className="text-muted">Sign in to join the conversation.</p>
        <Link
          href="/auth/login"
          className="mt-3 inline-block text-accent hover:underline"
        >
          Sign in
        </Link>
        {" · "}
        <Link href="/auth/signup" className="text-accent hover:underline">
          Create account
        </Link>
      </div>
    );
  }

  return (
    <form
      className="mt-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!body.trim()) return;

        startTransition(async () => {
          setError(null);
          const result = await createComment(postId, body.trim());
          if (result.error) {
            setError(result.error);
            return;
          }
          setBody("");
          router.refresh();
        });
      }}
    >
      <textarea
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share your experience or advice..."
        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring"
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending || !body.trim()}
        className="mt-3 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
      >
        {pending ? "Posting..." : "Post comment"}
      </button>
    </form>
  );
}
