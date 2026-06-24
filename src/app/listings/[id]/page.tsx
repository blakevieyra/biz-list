import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessActions } from "@/components/business-actions";
import { BusinessPostsSection, BusinessReviewsSection } from "@/components/business-social";
import { GoogleMapEmbed } from "@/components/google-map-embed";
import { JobApplySection } from "@/components/job-apply-section";
import { ServiceListing } from "@/components/service-listing";
import { ShareButton } from "@/components/share-button";
import { SafeExternalLink } from "@/components/safe-external-link";
import { Card, IntentBadge, PageHeader } from "@/components/ui";
import {
  getBusinessById,
  getBusinessConnectionState,
  getProfileById,
} from "@/lib/data";
import { getBusinessPosts, getBusinessReviews } from "@/lib/data/business";
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

  const [owner, connectionState, posts, reviews] = await Promise.all([
    getProfileById(business.ownerId),
    getBusinessConnectionState(business.id, userId),
    getBusinessPosts(business.id),
    getBusinessReviews(business.id),
  ]);

  const isOwner = userId === business.ownerId;
  const socialEntries = Object.entries(business.socialLinks).filter(([, url]) => url);
  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://bizlist.app"}/listings/${business.id}`;
  const cover = business.mediaUrls[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/listings" className="text-sm text-accent hover:underline">
        ← Back to listings
      </Link>

      {cover ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-border">
          <div className="aspect-[3/1] max-h-72 overflow-hidden bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" className="h-full w-full object-cover" />
          </div>
        </div>
      ) : null}

      <PageHeader
        title={business.name}
        description={business.tagline}
        action={
          <div className="flex flex-wrap gap-2">
            <ShareButton title={business.name} url={shareUrl} />
            <BusinessActions
              businessId={business.id}
              ownerId={business.ownerId}
              currentUserId={userId}
              initialState={connectionState}
            />
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        {business.isHiring && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-800">
            Now hiring
          </span>
        )}
        <span className="rounded-full bg-slate-100 px-3 py-1 text-muted">
          {business.likeCount} likes
        </span>
        {business.ratingCount > 0 && (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">
            {business.ratingAvg.toFixed(1)} ★ ({business.ratingCount})
          </span>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h2 className="font-semibold">About</h2>
            <p className="mt-3 text-sm leading-relaxed">{business.description}</p>
          </Card>

          <JobApplySection
            businessId={business.id}
            businessName={business.name}
            isHiring={business.isHiring}
            currentUserId={userId}
            isOwner={isOwner}
          />

          {business.services.length > 0 && (
            <Card>
              <h2 className="font-semibold">Shop & services</h2>
              <ul className="mt-3 space-y-3">
                {business.services.map((service) => (
                  <li key={service.name} className="rounded-xl border border-border p-3">
                    <p className="font-medium">{service.name}</p>
                    <p className="mt-1 text-sm text-muted">{service.description}</p>
                    {service.price && (
                      <p className="mt-1 text-sm font-medium">{service.price}</p>
                    )}
                    <ServiceListing
                      service={service}
                      businessId={business.id}
                      businessWebsite={business.website}
                      currentUserId={userId}
                      isOwner={isOwner}
                    />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {business.importantInfo && (
            <Card>
              <h2 className="font-semibold">Important information</h2>
              <p className="mt-3 text-sm leading-relaxed">{business.importantInfo}</p>
            </Card>
          )}

          {business.mediaUrls.length > 1 && (
            <Card>
              <h2 className="font-semibold">Photos</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {business.mediaUrls.slice(1).map((url, index) => (
                  <div key={`${url}-${index}`} className="overflow-hidden rounded-xl border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="aspect-square w-full object-cover" />
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <h2 className="font-semibold">What they&apos;re looking for</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {business.intents.map((intent) => (
                <IntentBadge key={intent} intent={intent} />
              ))}
            </div>
          </Card>

          <BusinessPostsSection
            businessId={business.id}
            posts={posts}
            currentUserId={userId}
            isOwner={isOwner}
          />

          <BusinessReviewsSection
            businessId={business.id}
            reviews={reviews}
            ratingAvg={business.ratingAvg}
            ratingCount={business.ratingCount}
            currentUserId={userId}
            isOwner={isOwner}
          />
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="font-semibold">Location</h2>
            <p className="mt-2 text-sm text-muted">
              {business.city}, {business.state}
              {business.zipCode ? ` ${business.zipCode}` : ""}
            </p>
            <div className="mt-4">
              <GoogleMapEmbed
                name={business.name}
                city={business.city}
                state={business.state}
                zipCode={business.zipCode}
              />
            </div>
          </Card>

          <Card>
            <h2 className="font-semibold">Details</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-muted">Category</dt>
                <dd className="font-medium">{business.category}</dd>
              </div>
              {business.phone && (
                <div>
                  <dt className="text-muted">Phone</dt>
                  <dd className="font-medium">{business.phone}</dd>
                </div>
              )}
              {business.hours && (
                <div>
                  <dt className="text-muted">Hours</dt>
                  <dd className="font-medium">{business.hours}</dd>
                </div>
              )}
              {business.website && (
                <div>
                  <dt className="text-muted">Website</dt>
                  <dd>
                    <SafeExternalLink
                      url={business.website}
                      label="Visit site"
                      className="font-medium text-accent hover:underline"
                    />
                  </dd>
                </div>
              )}
              {socialEntries.length > 0 && (
                <div>
                  <dt className="text-muted">Social</dt>
                  <dd className="mt-1 flex flex-wrap gap-2">
                    {socialEntries.map(([network, url]) => (
                      <SafeExternalLink
                        key={network}
                        url={url!}
                        label={network}
                        className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium capitalize hover:bg-slate-200"
                      />
                    ))}
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
