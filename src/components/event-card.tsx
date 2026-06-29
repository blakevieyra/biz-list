"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, formatPostDateTime } from "@/components/ui";
import type { BusinessEvent } from "@/lib/types";
import { EventRsvpButton } from "@/components/event-rsvp-button";

function EventImage({ imageUrl, businessMediaUrl }: { imageUrl?: string; businessMediaUrl?: string }) {
  const [src, setSrc] = useState(imageUrl || businessMediaUrl);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className="h-44 w-full object-cover sm:h-48"
        loading="lazy"
        onError={() => {
          if (src === imageUrl && businessMediaUrl && businessMediaUrl !== imageUrl) {
            setSrc(businessMediaUrl);
          } else {
            setSrc(undefined);
          }
        }}
      />
    );
  }

  return (
    <div className="flex h-44 items-center justify-center bg-blue-50 text-sm font-medium text-accent sm:h-48">
      Local event
    </div>
  );
}

export function EventCard({
  event,
  currentUserId,
}: {
  event: BusinessEvent;
  currentUserId?: string | null;
}) {
  const when = formatPostDateTime(event.startsAt);
  const where = [event.location || event.address, event.city, event.state]
    .filter(Boolean)
    .join(", ");

  const going = event.userRsvp === "going";
  const interested = event.userRsvp === "interested";

  const attendanceParts: string[] = [];
  if (event.goingCount > 0) attendanceParts.push(`${event.goingCount} going`);
  if (event.interestedCount > 0) attendanceParts.push(`${event.interestedCount} interested`);
  const attendanceLabel = attendanceParts.join(" · ") || "Be the first to RSVP";

  const yourStatus = going ? " · You're going" : interested ? " · You're interested" : "";

  return (
    <Card className="relative overflow-hidden p-0">
      {/* Overlay link covers the whole card; interactive elements sit above it */}
      <Link
        href={`/events/${event.id}`}
        className="absolute inset-0 z-0 rounded-[inherit]"
        aria-label={event.title}
      />

      {/* Image */}
      <div className="relative z-[1] pointer-events-none">
        <EventImage imageUrl={event.imageUrl} businessMediaUrl={event.businessMediaUrl} />
      </div>

      {/* Content */}
      <div className="relative z-[1] p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          {event.businessName ?? "Local business"}
        </p>
        <h3 className="mt-1 font-semibold leading-snug">{event.title}</h3>

        {event.description && (
          <p className="mt-1.5 line-clamp-2 text-sm text-muted">{event.description}</p>
        )}

        <p className="mt-2 text-sm text-muted">{when}</p>
        {where && <p className="mt-1 text-sm text-muted">{where}</p>}

        <p className="mt-2 text-xs text-muted">
          {attendanceLabel}{yourStatus}
        </p>
      </div>

      {/* Footer: RSVP buttons + View details — all above the overlay */}
      <div className="relative z-[1] flex items-center justify-between border-t border-border px-4 py-2.5 gap-3">
        <EventRsvpButton
          eventId={event.id}
          initialGoing={going}
          initialInterested={interested}
          requiresAuth={!currentUserId}
          size="sm"
        />
        <Link
          href={`/events/${event.id}`}
          className="shrink-0 text-xs font-medium text-accent hover:underline"
        >
          View details →
        </Link>
      </div>
    </Card>
  );
}
