import Link from "next/link";
import { notFound } from "next/navigation";
import { EventRsvpButton } from "@/components/event-rsvp-button";
import { Card, PageHeader, formatPostDateTime } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import { getBusinessEventById } from "@/lib/data/events";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getAuthUserId();
  const event = await getBusinessEventById(id, userId);

  if (!event) notFound();

  const when = formatPostDateTime(event.startsAt);
  const endWhen = event.endsAt ? formatPostDateTime(event.endsAt) : null;
  const where = [event.location || event.address, event.city, event.state]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader
        title={event.title}
        description={event.businessName ? `Hosted by ${event.businessName}` : "Local business event"}
        action={
          <Link
            href="/events"
            className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
          >
            All events
          </Link>
        }
      />

      {(event.imageUrl || event.businessMediaUrl) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.imageUrl || event.businessMediaUrl}
          alt=""
          className="mb-6 h-56 w-full rounded-2xl object-cover sm:h-72"
        />
      )}

      <Card>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-muted">When</dt>
            <dd className="mt-1">{when}</dd>
            {endWhen && <dd className="mt-1 text-muted">Ends {endWhen}</dd>}
          </div>
          <div>
            <dt className="font-medium text-muted">Where</dt>
            <dd className="mt-1">{where || "Location TBA"}</dd>
          </div>
          {event.category && (
            <div>
              <dt className="font-medium text-muted">Category</dt>
              <dd className="mt-1">{event.category}</dd>
            </div>
          )}
          <div>
            <dt className="font-medium text-muted">Attending</dt>
            <dd className="mt-1">
              {event.goingCount} going
              {event.capacity ? ` · capacity ${event.capacity}` : ""}
            </dd>
          </div>
        </dl>

        {event.description && (
          <div className="mt-6 border-t border-border pt-6">
            <h2 className="font-semibold">About this event</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">
              {event.description}
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-6">
          <EventRsvpButton
            eventId={event.id}
            initialGoing={event.userRsvp === "going"}
            requiresAuth={!userId}
          />
          {event.businessId && (
            <Link
              href={`/listings/${event.businessId}`}
              className="inline-flex min-h-11 items-center rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
            >
              View business
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
