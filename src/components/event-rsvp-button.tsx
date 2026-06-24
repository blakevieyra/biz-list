"use client";

import { useState } from "react";
import { toggleEventRsvp } from "@/lib/actions/events";

export function EventRsvpButton({
  eventId,
  initialGoing,
  requiresAuth,
}: {
  eventId: string;
  initialGoing: boolean;
  requiresAuth?: boolean;
}) {
  const [going, setGoing] = useState(initialGoing);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (requiresAuth) {
    return (
      <a
        href={`/auth/login?next=${encodeURIComponent(`/events/${eventId}`)}`}
        className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover"
      >
        Sign in to RSVP
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
          const result = await toggleEventRsvp(eventId);
          if (result.error) {
            setError(result.error);
          } else {
            setGoing((v) => !v);
          }
          setPending(false);
        }}
        className={`inline-flex min-h-11 items-center rounded-full px-5 py-2 text-sm font-medium transition ${
          going
            ? "border border-accent bg-blue-50 text-accent"
            : "bg-accent text-white hover:bg-accent-hover"
        }`}
      >
        {pending ? "Updating..." : going ? "Going ✓" : "I'm going"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
