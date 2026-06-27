"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toggleCollaborationInterest } from "@/lib/actions/social";

export function CollaborationInterestedButton({
  collaborationId,
  initialInterested,
  requiresAuth,
  compact,
}: {
  collaborationId: string;
  initialInterested: boolean;
  requiresAuth?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [interested, setInterested] = useState(initialInterested);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sizeClass = compact
    ? "px-3 py-1 text-xs min-h-7"
    : "px-3 py-1.5 text-xs min-h-8";

  if (requiresAuth) {
    return (
      <a
        href={`/auth/login?next=${encodeURIComponent(`/partnerships/${collaborationId}`)}`}
        className={`inline-flex items-center rounded-full bg-accent font-medium text-white hover:bg-accent-hover ${sizeClass}`}
      >
        Interested
      </a>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          const result = await toggleCollaborationInterest(collaborationId);
          if (result.error) {
            setError(result.error);
          } else {
            setInterested((value) => !value);
            router.refresh();
          }
          setPending(false);
        }}
        className={`inline-flex items-center rounded-full font-medium transition ${sizeClass} ${
          interested
            ? "border border-accent bg-blue-50 text-accent"
            : "bg-accent text-white hover:bg-accent-hover"
        }`}
      >
        {pending ? "…" : interested ? "Interested ✓" : "Interested"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
