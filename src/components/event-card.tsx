import Link from "next/link";
import { Card, formatPostDateTime } from "@/components/ui";
import type { BusinessEvent } from "@/lib/types";

export function EventCard({ event }: { event: BusinessEvent }) {
  const when = formatPostDateTime(event.startsAt);
  const where = [event.location || event.address, event.city, event.state]
    .filter(Boolean)
    .join(", ");

  return (
    <Card className="overflow-hidden p-0">
      <Link href={`/events/${event.id}`} className="block">
        {event.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.imageUrl}
            alt=""
            className="h-40 w-full object-cover"
            loading="lazy"
          />
        ) : event.businessMediaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.businessMediaUrl}
            alt=""
            className="h-40 w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-40 items-center justify-center bg-blue-50 text-sm font-medium text-accent">
            Local event
          </div>
        )}
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
        </div>
      </Link>
    </Card>
  );
}
