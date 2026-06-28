import Link from "next/link";
import { redirect } from "next/navigation";
import { EventPublishForm } from "@/components/event-publish-form";
import { Card, PageHeader, formatPostDateTime } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import { getBusinessByOwnerId, getCurrentProfile } from "@/lib/data";
import { getEventsForBusinessOwner } from "@/lib/data/events";

export default async function DashboardEventsPage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const profile = await getCurrentProfile();
  if (!profile) redirect("/profile/create");

  const isBusinessAccount = profile.role === "business" || profile.role === "organization" || profile.role === "marketer";
  if (!isBusinessAccount) {
    redirect("/events");
  }

  const business = await getBusinessByOwnerId(userId);
  if (!business) {
    return (
      <Card>
        <p className="text-sm text-muted">
          Create your business listing first from{" "}
          <Link href="/dashboard/profile" className="text-accent hover:underline">
            Profile
          </Link>
          .
        </p>
      </Card>
    );
  }

  const events = await getEventsForBusinessOwner(userId);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Events"
        description="Publish local events for customers to discover and RSVP."
      />

      <Card>
        <h2 className="font-semibold">Publish a new event</h2>
        <div className="mt-4">
          <EventPublishForm businessId={business.id} />
        </div>
      </Card>

      <section>
        <h2 className="mb-4 font-semibold">Your events</h2>
        {events.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">No events published yet.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <Card key={event.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Link href={`/events/${event.id}`} className="font-medium hover:text-accent">
                      {event.title}
                    </Link>
                    <p className="text-sm text-muted">{formatPostDateTime(event.startsAt)}</p>
                    <p className="text-xs text-muted">{event.goingCount} going</p>
                  </div>
                  <span className="text-xs uppercase tracking-wide text-muted">{event.status}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
