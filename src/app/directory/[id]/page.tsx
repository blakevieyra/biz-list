import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessActions } from "@/components/business-actions";
import { Card, IntentBadge, PageHeader } from "@/components/ui";
import {
  getBusinessById,
  getBusinessConnectionState,
  getProfileById,
} from "@/lib/data";
import { getAuthUserId } from "@/lib/actions/auth";

export default async function BusinessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [business, userId] = await Promise.all([
    getBusinessById(id),
    getAuthUserId(),
  ]);

  if (!business) {
    notFound();
  }

  const [owner, connectionState] = await Promise.all([
    getProfileById(business.ownerId),
    getBusinessConnectionState(business.id, userId),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/directory" className="text-sm text-accent hover:underline">
        ← Back to directory
      </Link>

      <PageHeader
        title={business.name}
        description={business.tagline}
        action={
          <BusinessActions
            businessId={business.id}
            ownerId={business.ownerId}
            currentUserId={userId}
            initialState={connectionState}
          />
        }
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h2 className="font-semibold">About</h2>
            <p className="mt-3 text-sm leading-relaxed">{business.description}</p>
          </Card>

          <Card>
            <h2 className="font-semibold">What they&apos;re looking for</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {business.intents.map((intent) => (
                <IntentBadge key={intent} intent={intent} />
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="font-semibold">Details</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-muted">Category</dt>
                <dd className="font-medium">{business.category}</dd>
              </div>
              <div>
                <dt className="text-muted">Location</dt>
                <dd className="font-medium">
                  {business.city}, {business.state}
                </dd>
              </div>
              {business.website && (
                <div>
                  <dt className="text-muted">Website</dt>
                  <dd>
                    <a
                      href={business.website}
                      className="font-medium text-accent hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Visit site
                    </a>
                  </dd>
                </div>
              )}
              {owner && (
                <div>
                  <dt className="text-muted">Profile owner</dt>
                  <dd className="font-medium">{owner.displayName}</dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
