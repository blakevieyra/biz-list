import Link from "next/link";

import { notFound } from "next/navigation";

import { BusinessActions } from "@/components/business-actions";

import {

  BusinessActivitySection,

  BusinessGallerySection,

  BusinessReviewsSection,

} from "@/components/business-social";

import { GoogleMapEmbed } from "@/components/google-map-embed";

import { JobApplySection } from "@/components/job-apply-section";

import { ShopOfferingsSection } from "@/components/shop-offerings-section";

import { SafeExternalLink } from "@/components/safe-external-link";

import { ListingRatingHeader } from "@/components/listing-rating-header";
import { Card, IntentBadge } from "@/components/ui";

import {

  getBusinessById,

  getBusinessConnectionState,

  getProfileById,

} from "@/lib/data";

import { getBusinessPosts, getBusinessReviews, getExistingJobApplication } from "@/lib/data/business";
import { getBusinessEvents } from "@/lib/data/events";
import { EventCard } from "@/components/event-card";

import { getBusinessContentLikeState } from "@/lib/data/content-likes";

import { getAuthUserId } from "@/lib/actions/auth";
import { socialPlatformLabel } from "@/lib/social-platforms";

import { buildResumeSnapshot } from "@/lib/resume";

import { contentLikeKey, isContentLiked } from "@/lib/content-likes-types";

import { displayCategoryLabel } from "@/lib/industries";
import { PageViewTracker } from "@/components/page-view-tracker";



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



  const [owner, connectionState, posts, reviews, events] = await Promise.all([

    getProfileById(business.ownerId),

    getBusinessConnectionState(business.id, userId),

    getBusinessPosts(business.id, userId),

    getBusinessReviews(business.id),

    getBusinessEvents({ businessId: business.id, userId, limit: 6 }),

  ]);



  const likeTargets = posts.map((post) => ({ type: "post" as const, id: post.id }));

  const contentLikes = await getBusinessContentLikeState(business.id, userId, likeTargets);



  const isOwner = userId === business.ownerId;
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

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{business.name}</h1>

              {business.tagline && (

                <p className="mt-1 text-base text-muted">{business.tagline}</p>

              )}

              <ListingRatingHeader

                ratingAvg={business.ratingAvg}

                ratingCount={business.ratingCount}

                showLeaveReview={Boolean(userId && !isOwner)}

              />

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



          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">

            <span className="rounded-full bg-blue-50 px-4 py-1.5 font-medium text-accent">

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

            {business.followerIds.length > 0 && (

              <span className="rounded-full bg-slate-100 px-3 py-1 text-muted">

                {business.followerIds.length} followers

              </span>

            )}

            {business.website && (

              <SafeExternalLink

                url={business.website}

                label="Visit website"

                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 font-medium hover:border-accent/40 hover:text-accent"

              />

            )}

            {socialEntries.map(([network, url]) => (

              <SafeExternalLink

                key={network}

                url={url!}

                label={socialPlatformLabel(network)}

                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-muted hover:border-accent/40 hover:text-foreground"

              />

            ))}

          </div>

        </div>

      </section>

      <PageViewTracker businessId={business.id} />



      <BusinessGallerySection mediaUrls={business.mediaUrls} />



      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">

        <div className="grid gap-8 lg:grid-cols-3">

          <div className="space-y-6 lg:col-span-2 lg:row-start-1">

            <BusinessActivitySection

              businessId={business.id}

              posts={posts}

              currentUserId={userId}

              isOwner={isOwner}

              contentLikes={contentLikes}

            />



            <ShopOfferingsSection

              businessId={business.id}

              businessName={business.name}

              services={business.services}

              currentUserId={userId}

              isOwner={isOwner}

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

                    <EventCard key={event.id} event={event} />

                  ))}

                </div>

              </div>

            )}

          </div>



          <div className="space-y-6 lg:col-start-3 lg:row-start-1">

            <Card id="about">

              <h2 className="font-semibold">About</h2>

              <p className="mt-3 text-sm leading-relaxed">{business.description}</p>

            </Card>



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

            {business.isHiring && !isOwner && (

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

    </>

  );

}


