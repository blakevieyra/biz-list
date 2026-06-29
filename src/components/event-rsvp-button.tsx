"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toggleEventRsvp, toggleEventRsvpInterested } from "@/lib/actions/events";

function RsvpBtn({
  active,
  pending,
  onClick,
  activeLabel,
  inactiveLabel,
  size,
  variant,
}: {
  active: boolean;
  pending: boolean;
  onClick: () => void;
  activeLabel: string;
  inactiveLabel: string;
  size: "sm" | "md";
  variant: "going" | "interested";
}) {
  const sizeClass = size === "sm" ? "px-3.5 py-1.5 text-xs" : "min-h-11 px-5 py-2 text-sm";
  const activeClass =
    variant === "going"
      ? "border border-accent bg-blue-50 text-accent"
      : "border border-accent bg-blue-50 text-accent";
  const inactiveClass = "border border-border bg-card text-muted hover:border-accent hover:text-accent";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      className={`inline-flex items-center rounded-full font-medium transition ${sizeClass} ${
        active ? activeClass : inactiveClass
      }`}
    >
      {pending ? "…" : active ? activeLabel : inactiveLabel}
    </button>
  );
}

export function EventRsvpButton({
  eventId,
  initialGoing,
  initialInterested,
  requiresAuth,
  size = "md",
}: {
  eventId: string;
  initialGoing: boolean;
  initialInterested?: boolean;
  requiresAuth?: boolean;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [going, setGoing] = useState(initialGoing);
  const [interested, setInterested] = useState(initialInterested ?? false);
  const [pendingGoing, setPendingGoing] = useState(false);
  const [pendingInterested, setPendingInterested] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sizeClass = size === "sm" ? "px-3.5 py-1.5 text-xs" : "min-h-11 px-5 py-2 text-sm";

  if (requiresAuth) {
    return (
      <div className="flex items-center gap-2">
        <a
          href={`/auth/login?next=${encodeURIComponent(`/events/${eventId}`)}`}
          className={`inline-flex items-center rounded-full bg-accent font-medium text-white hover:bg-accent-hover ${sizeClass}`}
        >
          Sign in to RSVP
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <RsvpBtn
        active={going}
        pending={pendingGoing}
        activeLabel="Going ✓"
        inactiveLabel="I'm going"
        size={size}
        variant="going"
        onClick={async () => {
          setPendingGoing(true);
          setError(null);
          const result = await toggleEventRsvp(eventId);
          if (result.error) {
            setError(result.error);
          } else {
            const nowGoing = !going;
            setGoing(nowGoing);
            if (nowGoing) setInterested(false);
            router.refresh();
          }
          setPendingGoing(false);
        }}
      />
      <RsvpBtn
        active={interested}
        pending={pendingInterested}
        activeLabel="Interested ✓"
        inactiveLabel="Interested"
        size={size}
        variant="interested"
        onClick={async () => {
          setPendingInterested(true);
          setError(null);
          const result = await toggleEventRsvpInterested(eventId);
          if (result.error) {
            setError(result.error);
          } else {
            const nowInterested = !interested;
            setInterested(nowInterested);
            if (nowInterested) setGoing(false);
            router.refresh();
          }
          setPendingInterested(false);
        }}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
