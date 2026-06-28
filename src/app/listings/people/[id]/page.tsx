import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerActions } from "@/components/customer-actions";
import { Card, PageHeader, formatDate } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import { getProfileById } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { FORUM_CATEGORY_LABELS } from "@/lib/types";

async function getRecentActivity(userId: string) {
  const supabase = await createClient();
  if (!supabase) return { forumPosts: [], businessPosts: [] };

  const [{ data: forumRows }, { data: postRows }] = await Promise.all([
    supabase
      .from("forum_posts")
      .select("id, title, category, created_at")
      .eq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("business_posts")
      .select("id, title, post_type, created_at, businesses(name)")
      .eq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  return {
    forumPosts: forumRows ?? [],
    businessPosts: (postRows ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      title: r.title as string,
      postType: r.post_type as string,
      createdAt: r.created_at as string,
      businessName: (() => {
        const b = r.businesses;
        if (!b) return undefined;
        if (Array.isArray(b)) return (b[0] as { name: string })?.name;
        return (b as { name: string }).name;
      })(),
    })),
  };
}

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [profile, userId] = await Promise.all([getProfileById(id), getAuthUserId()]);

  if (!profile || profile.role !== "customer") {
    notFound();
  }

  const isOwnProfile = userId === profile.id;
  const activity = await getRecentActivity(profile.id);

  const initials = profile.displayName
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const planLabel =
    profile.planTier === "pro"
      ? "Pro"
      : profile.planTier === "platinum"
        ? "Platinum"
        : "Community";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/feed" className="text-sm text-accent hover:underline">
        ← Back to feed
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          {profile.avatarUrl ? (
            <Image
              src={profile.avatarUrl}
              alt={profile.displayName}
              width={72}
              height={72}
              className="h-18 w-18 rounded-2xl object-cover shrink-0"
            />
          ) : (
            <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-teal-50 text-2xl font-bold text-accent">
              {initials || "?"}
            </div>
          )}

          <div>
            <h1 className="text-2xl font-bold">{profile.displayName}</h1>
            {profile.headline && (
              <p className="mt-0.5 text-muted">{profile.headline}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {profile.isSeekingWork && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                  Looking for work
                </span>
              )}
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-muted">
                {planLabel} member
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-muted">
                {profile.city}, {profile.state}
              </span>
            </div>
          </div>
        </div>

        {isOwnProfile ? (
          <Link
            href="/profile/edit"
            className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
          >
            Edit profile
          </Link>
        ) : (
          <CustomerActions userId={profile.id} currentUserId={userId} />
        )}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">

          <Card>
            <h2 className="font-semibold">About</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {profile.bio || "No bio yet."}
            </p>
          </Card>

          {profile.skills.length > 0 && (
            <Card>
              <h2 className="font-semibold">Skills</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-slate-100 px-3 py-1 text-sm text-muted"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {profile.interestTags.length > 0 && (
            <Card>
              <h2 className="font-semibold">Interests</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.interestTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border px-3 py-1 text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Recent activity */}
          {(activity.forumPosts.length > 0 || activity.businessPosts.length > 0) && (
            <Card>
              <h2 className="font-semibold">Recent activity</h2>
              <ul className="mt-3 space-y-3">
                {activity.forumPosts.map((post: { id: string; title: string; category: string; created_at: string }) => (
                  <li key={`forum-${post.id}`} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <Link href={`/forum/${post.id}`} className="font-medium text-accent hover:underline line-clamp-1">
                        {post.title}
                      </Link>
                      <p className="text-xs text-muted">
                        Forum · {FORUM_CATEGORY_LABELS[post.category as keyof typeof FORUM_CATEGORY_LABELS] ?? post.category}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted">{formatDate(post.created_at)}</span>
                  </li>
                ))}
                {activity.businessPosts.map((post) => (
                  <li key={`post-${post.id}`} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <Link href={`/posts/${post.id}`} className="font-medium text-accent hover:underline line-clamp-1">
                        {post.title}
                      </Link>
                      <p className="text-xs text-muted capitalize">
                        {post.businessName ?? "Post"} · {post.postType.replace("_", " ")}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted">{formatDate(post.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {profile.forumInterests.length > 0 && (
            <Card>
              <h2 className="font-semibold">Forum topics</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.forumInterests.map((category) => (
                  <span
                    key={category}
                    className="rounded-full bg-blue-50 px-3 py-1 text-sm text-accent"
                  >
                    {FORUM_CATEGORY_LABELS[category]}
                  </span>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {!isOwnProfile && (
            <Card>
              <h2 className="font-semibold">Connect</h2>
              <p className="mt-3 text-sm text-muted">
                Message {profile.displayName.split(" ")[0]} to learn more, ask about
                opportunities, or start a local collaboration.
              </p>
              <div className="mt-4">
                <CustomerActions userId={profile.id} currentUserId={userId} />
              </div>
            </Card>
          )}

          {profile.industryInterests.length > 0 && (
            <Card>
              <h2 className="font-semibold">Industries</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.industryInterests.map((ind) => (
                  <span key={ind} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-muted">
                    {ind}
                  </span>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <h2 className="font-semibold">Location</h2>
            <p className="mt-3 text-sm font-medium">
              {profile.city}, {profile.state}
            </p>
          </Card>

          {profile.isSeekingWork && profile.targetJobTitles.length > 0 && (
            <Card className="border-emerald-200 bg-emerald-50/40">
              <h2 className="font-semibold text-emerald-800">Looking for work</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.targetJobTitles.map((title) => (
                  <span key={title} className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs text-emerald-800">
                    {title}
                  </span>
                ))}
              </div>
              {profile.experienceText && (
                <p className="mt-3 text-sm text-muted">{profile.experienceText}</p>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
