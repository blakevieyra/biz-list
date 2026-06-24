import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessActions } from "@/components/business-actions";
import { BusinessPostsSection, BusinessReviewsSection } from "@/components/business-social";
import { GoogleMapEmbed } from "@/components/google-map-embed";
import { JobApplySection } from "@/components/job-apply-section";
import { ServiceListing } from "@/components/service-listing";
import { SafeExternalLink } from "@/components/safe-external-link";
import { Card, IntentBadge } from "@/components/ui";
import {
  getBusinessById,
  getBusinessConnectionState,
  getProfileById,
} from "@/lib/data";
import { getBusinessPosts, getBusinessReviews } from "@/lib/data/business";
import { getAuthUserId } from "@/lib/actions/auth";
import { displayCategoryLabel } from "@/lib/industries";

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
    <>
      <section className="w-full border-b border-border bg-card">
        {cover ? (
          <div className="aspect-[3/1] max-h-80 w-full overflow-hidden bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" className="h-full w-full object-cover" />
          </div>
        ) : null}

        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
          <Link href="/listings" className="text-sm text-accent hover:underline">
            ← Back to listings
          </Link>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{business.name}</h1>
              {business.tagline && (
                <p className="mt-1 text-muted">{business.tagline}</p>
              )}
            </div>
            <BusinessActions
              businessId={business.id}
              ownerId={business.ownerId}
              currentUserId={userId}
              initialState={connectionState}
              shareTitle={business.name}
              shareUrl={shareUrl}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-accent">
              {displayCategoryLabel(business.category, business.subcategory)}
            </span>
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
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <h2 className="font-semibold">About</h2>
              <p className="mt-3 text-sm leading-relaxed">{business.description}</p>
            </Card>

            {business.services.length > 0 && (
              <Card>
                <h2 className="font-semibold">Shop & services</h2>
                <ul className="mt-4 space-y-4">
                  {business.services.map((service) => (
                    <li
                      key={service.name}
                      className="flex flex-col gap-4 rounded-xl border border-border p-4 sm:flex-row"
                    >
                      {service.imageUrl ? (
                        <div className="h-32 w-full shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:h-28 sm:w-28">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={service.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-32 w-full shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-slate-50 sm:h-28 sm:w-28">
                          <span className="text-2xl font-bold text-accent/30">
                            {service.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{service.name}</p>
                        {service.price && (
                          <p className="mt-1 text-sm font-medium text-accent">{service.price}</p>
                        )}
                        {service.description && (
                          <p className="mt-2 text-sm leading-relaxed text-muted">
                            {service.description}
                          </p>
                        )}
                        <ServiceListing
                          service={service}
                          businessId={business.id}
                          businessWebsite={business.website}
                          currentUserId={userId}
                          isOwner={isOwner}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <BusinessReviewsSection
              businessId={business.id}
              reviews={reviews}
              ratingAvg={business.ratingAvg}
              ratingCount={business.ratingCount}
              currentUserId={userId}
              isOwner={isOwner}
            />

            <BusinessPostsSection
              businessId={business.id}
              posts={posts}
              currentUserId={userId}
              isOwner={isOwner}
            />

            {business.mediaUrls.length > 1 && (
              <Card>
                <h2 className="font-semibold">Photos</h2>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {business.mediaUrls.slice(1).map((url, index) => (
                    <div
                      key={`${url}-${index}`}
                      className="overflow-hidden rounded-xl border border-border"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="aspect-square w-full object-cover" />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <JobApplySection
              businessId={business.id}
              businessName={business.name}
              isHiring={business.isHiring}
              currentUserId={userId}
              isOwner={isOwner}
            />
          </div>

          <div className="space-y-6">
            <Card>
              <h2 className="font-semibold">Details</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div>
                  <dt className="text-muted">Category</dt>
                  <dd className="font-medium">
                    {displayCategoryLabel(business.category, business.subcategory)}
                  </dd>
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

            {business.importantInfo && (
              <Card>
                <h2 className="font-semibold">Important information</h2>
                <p className="mt-3 text-sm leading-relaxed">{business.importantInfo}</p>
              </Card>
            )}

            <Card>
              <h2 className="font-semibold">What they&apos;re looking for</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {business.intents.length > 0 ? (
                  business.intents.map((intent) => <IntentBadge key={intent} intent={intent} />)
                ) : (
                  <p className="text-sm text-muted">No partnership intents listed yet.</p>
                )}
              </div>
            </Card>

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
          </div>
        </div>
      </div>
    </>
  );
}
