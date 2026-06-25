import Link from "next/link";

import { notFound } from "next/navigation";

import { BusinessActions } from "@/components/business-actions";

import {

  BusinessActivitySection,

  BusinessPhotosSection,

  BusinessReviewsSection,

} from "@/components/business-social";

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

import { getBusinessPosts, getBusinessReviews, getExistingJobApplication } from "@/lib/data/business";

import { getBusinessContentLikeState } from "@/lib/data/content-likes";

import { getAuthUserId } from "@/lib/actions/auth";
import { socialPlatformLabel } from "@/lib/social-platforms";

import { buildResumeSnapshot } from "@/lib/resume";

import { contentLikeKey, isContentLiked } from "@/lib/content-likes-types";

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



  const likeTargets = [

    ...posts.map((post) => ({ type: "post" as const, id: post.id })),

    ...business.services

      .filter((s) => s.name.trim())

      .map((service) => ({ type: "service" as const, id: service.name })),

    ...business.mediaUrls.map((url) => ({ type: "photo" as const, id: url })),

  ];

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

            {business.followerIds.length > 0 && (

              <span className="rounded-full bg-slate-100 px-3 py-1 text-muted">

                {business.followerIds.length} followers

              </span>

            )}

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

            <BusinessActivitySection

              businessId={business.id}

              posts={posts}

              currentUserId={userId}

              isOwner={isOwner}

              contentLikes={contentLikes}

            />



            {business.services.length > 0 && (

              <Card id="shop">

                <h2 className="font-semibold">Shop & services</h2>

                <ul className="mt-4 space-y-4">

                  {business.services.map((service) => {

                    const likeKey = contentLikeKey("service", service.name);

                    return (

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

                          <div className="mt-3 flex flex-wrap items-center gap-3">

                            <ServiceListing

                              service={service}

                              businessId={business.id}

                              businessWebsite={business.website}

                              currentUserId={userId}

                              isOwner={isOwner}

                              likeCount={contentLikes.counts[likeKey] ?? 0}

                              liked={isContentLiked(contentLikes, "service", service.name)}

                            />

                          </div>

                        </div>

                      </li>

                    );

                  })}

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



            <BusinessPhotosSection

              businessId={business.id}

              mediaUrls={business.mediaUrls}

              contentLikes={contentLikes}

            />



            <JobApplySection

              businessId={business.id}

              businessName={business.name}

              isHiring={business.isHiring}

              currentUserId={userId}

              isOwner={isOwner}

              resumePreview={resumePreview}

              existingApplication={existingApplication}

            />

          </div>



          <div className="space-y-6">

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

          </div>

        </div>

      </div>

    </>

  );

}


