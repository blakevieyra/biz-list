"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toggleEventRsvp } from "@/lib/actions/events";

export function EventRsvpButton({
  eventId,
  initialGoing,
  requiresAuth,
  size = "md",
}: {
  eventId: string;
  initialGoing: boolean;
  requiresAuth?: boolean;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [going, setGoing] = useState(initialGoing);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sizeClass = size === "sm"
    ? "px-3.5 py-1.5 text-xs"
    : "min-h-11 px-5 py-2 text-sm";

  if (requiresAuth) {
    return (
      <a
        href={`/auth/login?next=${encodeURIComponent(`/events/${eventId}`)}`}
        className={`inline-flex items-center rounded-full bg-accent font-medium text-white hover:bg-accent-hover ${sizeClass}`}
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
            router.refresh();
          }
          setPending(false);
        }}
        className={`inline-flex items-center rounded-full font-medium transition ${sizeClass} ${
          going
            ? "border border-accent bg-blue-50 text-accent"
            : "bg-accent text-white hover:bg-accent-hover"
        }`}
      >
        {pending ? "…" : going ? "Going ✓" : "I'm going"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
