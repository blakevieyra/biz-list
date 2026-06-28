"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, formatPostDateTime } from "@/components/ui";
import type { BusinessEvent } from "@/lib/types";
import { SaveButton } from "@/components/save-button";

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
    <Card className="overflow-hidden p-0">
      <Link href={`/events/${event.id}`} className="block">
        <EventImage imageUrl={event.imageUrl} businessMediaUrl={event.businessMediaUrl} />
        <div className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-accent">
            {event.businessName ?? "Local business"}
          </p>
          <h3 className="mt-1 font-semibold leading-snug">{event.title}</h3>
          <p className="mt-2 text-sm text-muted">{when}</p>
          {where && <p className="mt-1 text-sm text-muted">{where}</p>}
          <p className="mt-3 text-xs text-muted">
            {event.goingCount} going
            {event.userRsvp === "going" ? " · You're going" : ""}
          </p>
          <p className="mt-3 text-sm font-medium text-accent">View event details →</p>
        </div>
      </Link>
      {currentUserId && (
        <div className="flex items-center justify-end border-t border-border px-4 py-2">
          <SaveButton
            itemType="event"
            itemId={event.id}
            itemTitle={event.title}
            itemSubtitle={when}
            itemUrl={`/events/${event.id}`}
            initialSaved={initialSaved}
            size="sm"
          />
        </div>
      )}
    </Card>
  );
}
