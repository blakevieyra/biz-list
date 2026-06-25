"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toggleCollaborationInterest } from "@/lib/actions/social";

export function CollaborationInterestedButton({
  collaborationId,
  initialInterested,
  requiresAuth,
}: {
  collaborationId: string;
  initialInterested: boolean;
  requiresAuth?: boolean;
}) {
  const router = useRouter();
  const [interested, setInterested] = useState(initialInterested);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (requiresAuth) {
    return (
      <a
        href={`/auth/login?next=${encodeURIComponent(`/partnerships/${collaborationId}`)}`}
        className="inline-flex min-h-10 items-center rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
      >
        Sign in to show interest
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
        className={`inline-flex min-h-10 items-center rounded-full px-4 py-2 text-sm font-medium transition ${
          interested
            ? "border border-accent bg-blue-50 text-accent"
            : "bg-accent text-white hover:bg-accent-hover"
        }`}
      >
        {pending ? "Updating..." : interested ? "Interested ✓" : "Interested"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
