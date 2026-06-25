import Link from "next/link";
import { notFound } from "next/navigation";
import { EventCommentsSection } from "@/components/event-comments-section";
import { EventRsvpButton } from "@/components/event-rsvp-button";
import { GoogleMapEmbed } from "@/components/google-map-embed";
import { Card, formatPostDateTime } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import { getBusinessEventById, getEventComments } from "@/lib/data/events";
import { displayCategoryLabel } from "@/lib/industries";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getAuthUserId();
  const [event, comments] = await Promise.all([
    getBusinessEventById(id, userId),
    getEventComments(id),
  ]);

  if (!event) notFound();

  const when = formatPostDateTime(event.startsAt);
  const endWhen = event.endsAt ? formatPostDateTime(event.endsAt) : null;
  const venue = event.location || event.businessName || "Event venue";
  const addressLine = [event.address, event.city, event.state, event.zipCode]
    .filter(Boolean)
    .join(", ");
  const cover = event.imageUrl || event.businessMediaUrl;

  return (
    <>
      <section className="w-full border-b border-border bg-card">
        {cover ? (
          <div className="aspect-[3/1] max-h-80 w-full overflow-hidden bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center bg-blue-50 text-sm font-medium text-accent">
            Local event
          </div>
        )}

        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
          <Link href="/events" className="text-sm text-accent hover:underline">
            ← All events
          </Link>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              {event.businessName && event.businessId && (
                <Link
                  href={`/listings/${event.businessId}`}
                  className="text-xs font-medium uppercase tracking-wide text-accent hover:underline"
                >
                  {event.businessName}
                </Link>
              )}
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{event.title}</h1>
              <div className="mt-3 flex flex-wrap gap-2">
                {event.category && (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-accent">
                    {displayCategoryLabel(event.category)}
                  </span>
                )}
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
                  {event.goingCount} going
                  {event.capacity ? ` · ${event.capacity} capacity` : ""}
                </span>
                {event.userRsvp === "going" && (
                  <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-white">
                    You&apos;re going
                  </span>
                )}
              </div>
            </div>

            <EventRsvpButton
              eventId={event.id}
              initialGoing={event.userRsvp === "going"}
              requiresAuth={!userId}
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <dl className="grid gap-6 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted">When</dt>
                  <dd className="mt-2 text-sm font-medium">{when}</dd>
                  {endWhen && <dd className="mt-1 text-sm text-muted">Ends {endWhen}</dd>}
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Where</dt>
                  <dd className="mt-2 text-sm font-medium">{venue}</dd>
                  {addressLine && <dd className="mt-1 text-sm text-muted">{addressLine}</dd>}
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
            </Card>

            <EventCommentsSection
              eventId={event.id}
              comments={comments}
              currentUserId={userId}
            />
          </div>

          <div className="space-y-6">
            <Card>
              <h2 className="font-semibold">Join this event</h2>
              <p className="mt-2 text-sm text-muted">
                {event.goingCount} {event.goingCount === 1 ? "person is" : "people are"} going
                {event.capacity
                  ? ` · ${Math.max(0, event.capacity - event.goingCount)} spots left`
                  : ""}
              </p>
              <div className="mt-4">
                <EventRsvpButton
                  eventId={event.id}
                  initialGoing={event.userRsvp === "going"}
                  requiresAuth={!userId}
                />
              </div>
            </Card>

            {event.businessId && (
              <Card>
                <h2 className="font-semibold">Hosted by</h2>
                <p className="mt-2 text-sm font-medium">{event.businessName ?? "Local business"}</p>
                <Link
                  href={`/listings/${event.businessId}`}
                  className="mt-4 inline-flex min-h-11 items-center rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
                >
                  View business profile
                </Link>
              </Card>
            )}

            {(event.city || event.state) && (
              <Card>
                <h2 className="font-semibold">Location</h2>
                <p className="mt-2 text-sm text-muted">{addressLine || `${event.city}, ${event.state}`}</p>
                <div className="mt-4">
                  <GoogleMapEmbed
                    name={venue}
                    city={event.city}
                    state={event.state}
                    zipCode={event.zipCode}
                  />
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
