import Link from "next/link";
import type { BusinessPost } from "@/lib/types";
import { Card, formatDate } from "./ui";
import { PostMediaGallery, PostTypeBadge } from "@/components/post-media";
import { isImageUrl } from "@/lib/media/post-media";

export function BusinessPostFeed({ posts }: { posts: BusinessPost[] }) {
  if (!posts.length) return null;

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
        {posts.map((post) => {
          const hero = post.mediaUrls.find(isImageUrl);
          return (
            <Card key={post.id} className="overflow-hidden p-0">
              {hero && (
                <div className="h-40 overflow-hidden border-b border-border bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={hero} alt="" className="h-full w-full object-cover" />
                </div>
              )}
              <div className="p-5">
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
                  <span className="text-xs text-muted">{formatDate(post.createdAt)}</span>
                </div>

                <h3 className="mt-3 font-semibold">{post.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{post.body}</p>

                {post.mediaUrls.length > 0 && (
                  <div className="mt-4">
                    <PostMediaGallery urls={post.mediaUrls} />
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <Link
                    href={`/listings/${post.businessId}`}
                    className="font-medium text-accent hover:underline"
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
            </Card>
          );
        })}
      </div>
    </section>
  );
}
