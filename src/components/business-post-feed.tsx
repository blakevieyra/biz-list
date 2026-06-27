import Link from "next/link";
import type { BusinessPost } from "@/lib/types";
import { Card, formatDate } from "./ui";
import { PostMediaGallery, PostTypeBadge } from "@/components/post-media";
import { isImageUrl } from "@/lib/media/post-media";

function BusinessPostItem({ post, compact }: { post: BusinessPost; compact?: boolean }) {
  const hero = post.mediaUrls.find(isImageUrl);
  const businessPhoto = post.businessMediaUrl;

  return (
    <Card className="overflow-hidden p-0">
      {hero && !compact && (
        <div className="h-40 overflow-hidden border-b border-border bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hero} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <div className={`flex ${compact ? "" : ""}`}>
        {/* Business photo strip — shown in compact/embedded mode */}
        {compact && (
          <Link
            href={`/listings/${post.businessId}`}
            className="relative block w-20 shrink-0 self-stretch overflow-hidden bg-slate-100"
          >
            {businessPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={businessPhoto}
                alt={post.businessName ?? ""}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 text-2xl font-bold text-accent/20">
                {(post.businessName ?? "B").charAt(0)}
              </div>
            )}
          </Link>
        )}

        <div className={compact ? "min-w-0 flex-1 p-4" : "p-5"}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="mb-1">
                <PostTypeBadge type={post.postType} />
              </div>
              <Link
                href={`/listings/${post.businessId}`}
                className="text-sm font-semibold text-accent hover:underline"
              >
                {post.businessName ?? "Local business"}
              </Link>
              {post.businessCategory && (
                <p className="text-xs text-muted">{post.businessCategory}</p>
              )}
            </div>
            <span className="shrink-0 text-xs text-muted">{formatDate(post.createdAt)}</span>
          </div>

          <h3 className={`mt-2 font-semibold ${compact ? "text-sm" : ""}`}>{post.title}</h3>
          <p
            className={`mt-1 leading-relaxed text-muted ${compact ? "line-clamp-2 text-xs" : "mt-2 line-clamp-3 text-sm"}`}
          >
            {post.body}
          </p>

          {post.mediaUrls.length > 0 && !compact && (
            <div className="mt-4">
              <PostMediaGallery urls={post.mediaUrls} />
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <Link
              href={`/listings/${post.businessId}`}
              className="text-xs font-medium text-accent hover:underline"
            >
              View business →
            </Link>
            {post.isTrending && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Trending
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function BusinessPostFeed({
  posts,
  embedded = false,
}: {
  posts: BusinessPost[];
  embedded?: boolean;
}) {
  if (!posts.length) return null;

  if (embedded) {
    return (
      <div className="space-y-4">
        {posts.map((post) => (
          <BusinessPostItem key={post.id} post={post} compact />
        ))}
      </div>
    );
  }

  return (
    <section className="mb-10">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Local business updates</h2>
          <p className="mt-1 text-sm text-muted">
            Updates, jobs, deals, and video from businesses in your feed.
          </p>
        </div>
        <Link href="/feed" className="text-sm font-medium text-accent hover:underline">
          View feed →
        </Link>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
        {posts.map((post) => (
          <BusinessPostItem key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
