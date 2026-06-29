"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, formatPostDateTime } from "@/components/ui";
import type { BusinessEvent } from "@/lib/types";
import { SaveButton } from "@/components/save-button";
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
  initialSaved = false,
}: {
  event: BusinessEvent;
  currentUserId?: string | null;
  initialSaved?: boolean;
}) {
  const when = formatPostDateTime(event.startsAt);
  const where = [event.location || event.address, event.city, event.state]
    .filter(Boolean)
    .join(", ");

  return (
    <Card className="relative overflow-hidden p-0">
      {/* Overlay link covers the whole card; interactive elements sit above it */}
      <Link
        href={`/events/${event.id}`}
        className="absolute inset-0 z-0 rounded-[inherit]"
        aria-label={event.title}
      />

      {/* Image — not interactive, just decoration */}
      <div className="relative z-[1] pointer-events-none">
        <EventImage imageUrl={event.imageUrl} businessMediaUrl={event.businessMediaUrl} />
      </div>

      {/* Content */}
      <div className="relative z-[1] p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          {event.businessName ?? "Local business"}
        </p>
        <h3 className="mt-1 font-semibold leading-snug">{event.title}</h3>

        {/* Short description excerpt */}
        {event.description && (
          <p className="mt-1.5 line-clamp-2 text-sm text-muted">{event.description}</p>
        )}

        <p className="mt-2 text-sm text-muted">{when}</p>
        {where && <p className="mt-1 text-sm text-muted">{where}</p>}

        <p className="mt-2 text-xs text-muted">
          {event.goingCount} going
          {event.userRsvp === "going" ? " · You're going" : ""}
        </p>
      </div>

      {/* Footer: RSVP + Save — both above the overlay */}
      <div className="relative z-[1] flex items-center justify-between border-t border-border px-4 py-2.5 gap-3">
        <EventRsvpButton
          eventId={event.id}
          initialGoing={event.userRsvp === "going"}
          requiresAuth={!currentUserId}
          size="sm"
        />
        <div className="flex items-center gap-3">
          <Link
            href={`/events/${event.id}`}
            className="text-xs font-medium text-accent hover:underline"
          >
            View details →
          </Link>
          {currentUserId && (
            <SaveButton
              itemType="event"
              itemId={event.id}
              itemTitle={event.title}
              itemSubtitle={when}
              itemUrl={`/events/${event.id}`}
              initialSaved={initialSaved}
              size="sm"
            />
          )}
        </div>
      </div>
    </Card>
  );
}
