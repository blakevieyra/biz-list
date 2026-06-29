import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/data";
import { getBusinessById } from "@/lib/data";
import { canActForBusiness } from "@/lib/actions/affiliates";
import { getBusinessPosts } from "@/lib/data/business";
import { getAuthUserId } from "@/lib/actions/auth";
import { canAccess } from "@/lib/plans";
import { BusinessPostComposer } from "@/components/business-post-composer";
import { PostTypeBadge } from "@/components/post-media";
import { Card, formatDate } from "@/components/ui";

export default async function AffiliatePostsPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const profile = await getCurrentProfile();
  if (!profile) redirect("/profile/create");
  if (profile.role !== "marketer") redirect("/dashboard");

  const [business, canAct] = await Promise.all([
    getBusinessById(businessId),
    canActForBusiness(businessId),
  ]);

  if (!business) notFound();
  if (!canAct) redirect("/dashboard/affiliates");

  if (!canAccess(profile.planTier, "businessPosts")) redirect("/pricing");

  const posts = await getBusinessPosts(businessId, userId);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
      <div>
        <Link href="/dashboard/affiliates" className="mb-4 inline-block text-sm text-accent hover:underline">
          ← Back to affiliations
        </Link>
        <div className="flex items-center gap-3">
          {business.mediaUrls[0] ? (
            <img src={business.mediaUrls[0]} alt={business.name} className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-sm font-bold text-accent">
              {business.name[0]}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold">Post on behalf of {business.name}</h1>
            <p className="text-sm text-muted">You are an affiliate marketer for this business.</p>
          </div>
        </div>
      </div>

      <BusinessPostComposer businessId={businessId} />

      {posts.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">Recent posts</h2>
          <div className="space-y-3">
            {posts.map((post) => (
              <Card key={post.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <PostTypeBadge type={post.postType} />
                      <p className="font-medium">{post.title}</p>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{post.body}</p>
                    <p className="mt-1 text-xs text-muted">{formatDate(post.createdAt)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
