import Link from "next/link";
import type { BusinessIntent, BusinessProfile } from "@/lib/types";
import { Card, IntentBadge } from "./ui";

function displayIntents(business: BusinessProfile): BusinessIntent[] {
  const intents = [...business.intents];
  if (business.isHiring && !intents.includes("hiring")) {
    intents.unshift("hiring");
  }
  return intents;
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  if (count === 0) {
    return <p className="text-xs text-muted">No reviews yet</p>;
  }

  const fullStars = Math.round(rating);
  const stars = "★".repeat(fullStars) + "☆".repeat(Math.max(0, 5 - fullStars));

  return (
    <p className="text-sm">
      <span className="font-semibold text-amber-700">{rating.toFixed(1)}</span>
      <span className="ml-1 text-amber-500" aria-hidden="true">
        {stars}
      </span>
      <span className="ml-1.5 text-xs text-muted">
        ({count} review{count === 1 ? "" : "s"})
      </span>
    </p>
  );
}

export function BusinessCard({ business }: { business: BusinessProfile }) {
  const cover = business.mediaUrls[0];
  const intents = displayIntents(business);

  return (
    <Link href={`/listings/${business.id}`} className="block h-full">
      <Card className="flex h-full min-h-[420px] flex-col overflow-hidden p-0 transition hover:border-accent/40 hover:shadow-md">
        {cover ? (
          <div className="h-[33%] min-h-[140px] shrink-0 overflow-hidden border-b border-border bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-[33%] min-h-[140px] shrink-0 items-center justify-center border-b border-border bg-gradient-to-br from-blue-50 to-slate-50">
            <span className="text-4xl font-bold text-accent/30">{business.name.charAt(0)}</span>
          </div>
        )}

        <div className="flex flex-1 flex-col p-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {business.category}
            </p>
            <h3 className="mt-1 text-lg font-semibold leading-snug">{business.name}</h3>
            {business.tagline && (
              <p className="mt-1 line-clamp-1 text-sm text-muted">{business.tagline}</p>
            )}
          </div>

          <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed">
            {business.description}
          </p>

          <div className="mt-auto space-y-3 pt-4">
            <StarRating rating={business.ratingAvg} count={business.ratingCount} />

            {intents.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {intents.slice(0, 3).map((intent) => (
                  <IntentBadge key={intent} intent={intent} />
                ))}
              </div>
            )}
          </div>

          <p className="mt-4 border-t border-border pt-3 text-xs text-muted">
            {business.city}, {business.state}
            {business.zipCode ? ` ${business.zipCode}` : ""}
            {business.likeCount > 0 ? ` · ${business.likeCount} likes` : ""}
          </p>
        </div>
      </Card>
    </Link>
  );
}
