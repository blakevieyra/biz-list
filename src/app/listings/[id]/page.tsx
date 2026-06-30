import Link from "next/link";

import { notFound } from "next/navigation";

import { BusinessActions } from "@/components/business-actions";

import {

  BusinessActivitySection,

  BusinessReviewsSection,

} from "@/components/business-social";

import { ReportButton } from "@/components/report-button";

import { ListingPhotosCard } from "@/components/listing-photos-card";

import { GoogleMapEmbed } from "@/components/google-map-embed";

import { JobApplySection } from "@/components/job-apply-section";

import { ShopOfferingsSection } from "@/components/shop-offerings-section";

import { SafeExternalLink } from "@/components/safe-external-link";

import { ListingRatingHeader } from "@/components/listing-rating-header";
import { Card, IntentBadge } from "@/components/ui";

import {

  getBusinessById,

  getBusinessConnectionState,

  getPartnerBusinesses,

  getProfileById,

} from "@/lib/data";

import { getBusinessPosts, getBusinessReviews, getExistingJobApplication } from "@/lib/data/business";
import { getBusinessEvents, getEventsForBusinessOwner, getUserSavedEvents } from "@/lib/data/events";
import { EventCard } from "@/components/event-card";

import { getBusinessContentLikeState } from "@/lib/data/content-likes";

import { getAuthUserId } from "@/lib/actions/auth";
import { socialPlatformLabel } from "@/lib/social-platforms";

import { buildResumeSnapshot } from "@/lib/resume";

import { contentLikeKey, isContentLiked } from "@/lib/content-likes-types";

import { displayCategoryLabel } from "@/lib/industries";
import { ListingVirtualAgent } from "@/components/listing-virtual-agent";
import { PageViewTracker } from "@/components/page-view-tracker";
import { canAccess } from "@/lib/plans";
import { AffiliateButton } from "@/components/affiliate-button";
import type { AffiliateStatus } from "@/lib/actions/affiliates";



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



  const [owner, connectionState, posts, reviews, events, partnerBusinesses] = await Promise.all([

    getProfileById(business.ownerId),

    getBusinessConnectionState(business.id, userId),

    getBusinessPosts(business.id, userId),

    getBusinessReviews(business.id),

    getBusinessEvents({ businessId: business.id, userId, limit: 6 }),

    getPartnerBusinesses(business.id, business.ownerId),

  ]);



  const likeTargets = posts.map((post) => ({ type: "post" as const, id: post.id }));

  const contentLikes = await getBusinessContentLikeState(business.id, userId, likeTargets);



  const isOwner = userId === business.ownerId;

  // Marketer affiliation status
  const { getCurrentProfile: getProf } = await import("@/lib/data");
  const { getAffiliationStatus } = await import("@/lib/actions/affiliates");
  const [viewerProfile, affiliationStatus] = await Promise.all([
    userId && !isOwner ? getProf() : Promise.resolve(null),
    userId && !isOwner ? getAffiliationStatus(business.id) : Promise.resolve(null),
  ]);
  const isMarketer = viewerProfile?.role === "marketer";

  const [senderHostedEvents, senderAttendingEvents] = userId && !isOwner
    ? await Promise.all([
        getEventsForBusinessOwner(userId),
        getUserSavedEvents(userId, 20),
      ])
    : [[], []];
  const seenEventIds = new Set<string>();
  const senderEvents = [...senderHostedEvents, ...senderAttendingEvents].filter((e) => {
    if (seenEventIds.has(e.id)) return false;
    seenEventIds.add(e.id);
    return true;
  });

  const customerProfile =
    userId && !isOwner ? await getProfileById(userId) : null;
  const existingApplication =
    userId && !isOwner && business.isHiring
      ? await getExistingJobApplication(business.id, userId)
      : null;
  const resumePreview =
    customerProfile && customerProfile.role === "customer"
      ? buildResumeSnapshot(customerProfile)
      : undefined;

  const socialEntries = Object.entries(business.socialLinks).filter(([, url]) => url);

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://bizlist.app"}/listings/${business.id}`;

  const cover = business.mediaUrls[0];



  return (

    <>

      <section className="w-full border-b border-border bg-card">

        {cover ? (

          <div className="relative aspect-[3/1] max-h-80 w-full overflow-hidden bg-slate-100">

            {/* eslint-disable-next-line @next/next/no-img-element */}

            <img src={cover} alt="" className="h-full w-full object-cover" />

            {isOwner && (
              <Link
                href="/dashboard/profile#photos"
                className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-black/70"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M13.586 3.586a2 2 0 1 1 2.828 2.828l-.793.793-2.828-2.828.793-.793ZM11.379 5.793 3 14.172V17h2.828l8.38-8.379-2.83-2.828Z" />
                </svg>
                Edit cover photo
              </Link>
            )}

          </div>

        ) : isOwner ? (
          <div className="flex aspect-[3/1] max-h-80 w-full items-center justify-center bg-slate-100">
            <Link
              href="/dashboard/profile#photos"
              className="flex items-center gap-2 rounded-full border border-dashed border-slate-300 px-4 py-2 text-sm text-muted hover:border-accent/50 hover:text-accent"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M1 8a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 8.07 3h3.86a2 2 0 0 1 1.664.89l.812 1.22A2 2 0 0 0 16.07 6H17a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8Zm13.5 3a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM10 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
              </svg>
              Add cover photo
            </Link>
          </div>
        ) : null}



        <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6">

          <Link href="/listings" className="text-sm text-accent hover:underline">

            ← Back to listings

          </Link>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

            <div className="min-w-0">

              {/* Name + rating inline */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {owner?.avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={owner.avatarUrl}
                    alt={business.name}
                    className="h-10 w-10 shrink-0 rounded-full border-2 border-white object-cover shadow-sm sm:h-12 sm:w-12"
                  />
                )}
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{business.name}</h1>
                <ListingRatingHeader
                  ratingAvg={business.ratingAvg}
                  ratingCount={business.ratingCount}
                  showLeaveReview={Boolean(userId && !isOwner)}
                />
              </div>

              {business.tagline && (
                <p className="mt-0.5 text-sm text-muted">{business.tagline}</p>
              )}

              {/* Category + hiring — own row under name */}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-accent">
                  {displayCategoryLabel(business.category, business.subcategory)}
                </span>
                {business.isHiring && (!viewerProfile || viewerProfile.role === "customer") && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                    Now hiring
                  </span>
                )}
              </div>

            </div>

            {/* Right column: actions + stats */}
            <div className="flex shrink-0 flex-col items-end gap-2">

              <BusinessActions

                businessId={business.id}

                ownerId={business.ownerId}

                currentUserId={userId}

                viewerRole={viewerProfile?.role}

                initialState={connectionState}

                shareTitle={business.name}

                shareUrl={shareUrl}

                businessName={business.name}

                senderEvents={senderEvents}

              />

              {/* Affiliate request button for marketers */}
              {isMarketer && !isOwner && (
                <AffiliateButton businessId={business.id} status={affiliationStatus} />
              )}

              {/* Likes · Followers · Social links */}
              <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs text-muted">

                {business.likeCount > 0 && (
                  <span>{business.likeCount} {business.likeCount === 1 ? "like" : "likes"}</span>
                )}

                {business.followerIds.length > 0 && (
                  <span>{business.followerIds.length} {business.followerIds.length === 1 ? "follower" : "followers"}</span>
                )}

                {socialEntries.map(([network, url]) => (

                  <SafeExternalLink

                    key={network}

                    url={url!}

                    label={socialPlatformLabel(network)}

                    className="hover:text-foreground hover:underline"

                  />

                ))}

              </div>

              {business.website && (
                <SafeExternalLink
                  url={business.website}
                  label="Visit website →"
                  className="text-sm font-semibold text-accent hover:underline"
                />
              )}

            </div>

          </div>

        </div>

      </section>

      <PageViewTracker businessId={business.id} />



      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">

        <div className="grid gap-8 lg:grid-cols-3">

          <div className="space-y-6 lg:col-span-2 lg:row-start-1">

            <ShopOfferingsSection

              businessId={business.id}

              businessName={business.name}

              services={business.services}

              currentUserId={userId}

              isOwner={isOwner}

            />

            <BusinessActivitySection

              businessId={business.id}

              posts={posts}

              currentUserId={userId}

              isOwner={isOwner}

              contentLikes={contentLikes}

            />

            <BusinessReviewsSection

              businessId={business.id}

              reviews={reviews}

              currentUserId={userId}

              isOwner={isOwner}

            />

            {events.length > 0 && (

              <div>

                <div className="mb-3 flex items-center justify-between">

                  <h2 className="font-semibold">Upcoming events</h2>

                </div>

                <div className="grid gap-4 sm:grid-cols-2">

                  {events.map((event) => (

                    <EventCard key={event.id} event={event} showRsvp={false} />

                  ))}

                </div>

              </div>

            )}

          </div>



          <div className="space-y-6 lg:col-start-3 lg:row-start-1">

            <ListingPhotosCard urls={business.mediaUrls} />

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



            {partnerBusinesses.length > 0 && (

              <Card>

                <h2 className="font-semibold">Partners</h2>

                <p className="mt-1 text-xs text-muted">Businesses and organizations this listing has a mutual connection with.</p>

                <ul className="mt-3 space-y-2">

                  {partnerBusinesses.map((partner) => (

                    <li key={partner.id}>

                      <a

                        href={`/listings/${partner.id}`}

                        className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-slate-50"

                      >

                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-border bg-slate-100">

                          {partner.mediaUrl ? (

                            // eslint-disable-next-line @next/next/no-img-element

                            <img src={partner.mediaUrl} alt="" className="h-full w-full object-cover" />

                          ) : (

                            <div className="flex h-full w-full items-center justify-center text-sm font-bold text-accent/30">

                              {partner.name.charAt(0)}

                            </div>

                          )}

                        </div>

                        <div className="min-w-0">

                          <p className="truncate text-sm font-medium leading-snug">{partner.name}</p>

                          <p className="truncate text-xs text-muted">{partner.category} · {partner.city}, {partner.state}</p>

                        </div>

                      </a>

                    </li>

                  ))}

                </ul>

              </Card>

            )}



            <Card id="about">

              <h2 className="font-semibold">About</h2>

              <p className="mt-3 text-sm leading-relaxed">{business.description}</p>

              <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">

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

                          label={socialPlatformLabel(network)}

                          className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium hover:bg-slate-200"

                        />

                      ))}

                    </dd>

                  </div>

                )}

                {owner && (

                  <div>

                    <dt className="text-muted">Profile owner</dt>

                    <dd className="font-medium">{owner.displayName}</dd>

                    {owner.bio && (

                      <dd className="mt-1 text-sm leading-relaxed text-muted">{owner.bio}</dd>

                    )}

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

              <h2 className="font-semibold">Location</h2>

              <p className="mt-2 text-sm text-muted">

                {business.city}, {business.state}

                {business.county ? ` · ${business.county} County` : ""}

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

            {!isOwner && (

              <div className="flex justify-end">

                <ReportButton

                  target={{ type: "listing", id: business.id, name: business.name }}

                  className="text-xs text-muted hover:text-red-600 transition-colors"

                />

              </div>

            )}

            {business.isHiring && !isOwner && viewerProfile?.role === "customer" && (

              <JobApplySection

                businessId={business.id}

                businessName={business.name}

                business={business}

                isHiring={business.isHiring}

                currentUserId={userId}

                isOwner={isOwner}

                resumePreview={resumePreview}

                existingApplication={existingApplication}

              />

            )}

          </div>




        </div>

      </div>

      {(business.virtualAgentEnabled ||
        canAccess(owner?.planTier ?? "free", "virtualAgent")) && (
        <ListingVirtualAgent
          businessId={business.id}
          businessName={business.name}
          businessImage={business.mediaUrls[0] ?? null}
          isAuthenticated={Boolean(userId)}
          autoOpen={canAccess(owner?.planTier ?? "free", "virtualAgent")}
        />
      )}
    </>
  );
}
