import Link from "next/link";
import { redirect } from "next/navigation";
import { BusinessPostComposer } from "@/components/business-post-composer";
import { PostTypeBadge } from "@/components/post-media";
import { Card, PageHeader, formatDate } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import { getBusinessPosts } from "@/lib/data/business";
import { getBusinessById, getCurrentProfile } from "@/lib/data";
import { canAccess } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

async function getOwnerBusiness(userId: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();
  return data;
}

export default async function DashboardPostsPage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const profile = await getCurrentProfile();
  if (!profile) redirect("/profile/create");
  if (!canAccess(profile.planTier, "businessPosts")) redirect("/pricing");

  const businessRow = await getOwnerBusiness(userId);
  const business = businessRow ? await getBusinessById(businessRow.id) : null;
  const posts = business ? await getBusinessPosts(business.id) : [];

  return (
    <>
      <PageHeader
        title="Posts & marketing"
        description="Publish updates, job openings, sales, and video content to your BizList feed and listing."
        action={
          business ? (
            <Link
              href={`/listings/${business.id}`}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
            >
              View listing →
            </Link>
          ) : undefined
        }
      />

      {!business ? (
        <Card>
          <p className="text-sm text-muted">
            Complete your business profile first so you can publish to the feed.
          </p>
          <Link href="/dashboard/profile" className="mt-4 inline-block text-sm text-accent hover:underline">
            Set up your listing →
          </Link>
        </Card>
      ) : (
        <div className="grid gap-8 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <h2 className="font-semibold">Create a post</h2>
            <p className="mt-1 text-sm text-muted">
              Content appears on your public listing and in the local BizList feed.
            </p>
            <div className="mt-6">
              <BusinessPostComposer businessId={business.id} />
            </div>
          </Card>

          <div className="space-y-4 lg:col-span-2">
            <Card>
              <h2 className="font-semibold">Quick tips</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                <li>· Job posts mark your business as hiring and show in the Jobs tab.</li>
                <li>· Deal posts appear in Sales & deals for nearby customers.</li>
                <li>· Video posts support YouTube, Vimeo, and uploaded clips.</li>
                <li>· Pro plans get a trending boost on new posts.</li>
              </ul>
              <Link href="/feed" className="mt-4 inline-block text-sm text-accent hover:underline">
                Preview the public feed →
              </Link>
            </Card>

            <Card>
              <h2 className="font-semibold">Your posts ({posts.length})</h2>
              {posts.length === 0 ? (
                <p className="mt-2 text-sm text-muted">Nothing published yet.</p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {posts.slice(0, 5).map((post) => (
                    <li key={post.id} className="border-b border-border pb-4 last:border-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <PostTypeBadge type={post.postType} />
                        {post.isTrending && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                            Trending
                          </span>
                        )}
                      </div>
                      <p className="mt-2 font-medium">{post.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted">{post.body}</p>
                      <p className="mt-2 text-xs text-muted">{formatDate(post.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}

    </>
  );
}
