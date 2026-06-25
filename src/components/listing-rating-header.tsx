"use client";

import Link from "next/link";
import { StarRating } from "@/components/ui";

export function ListingRatingHeader({
  ratingAvg,
  ratingCount,
  showLeaveReview,
}: {
  ratingAvg: number;
  ratingCount: number;
  showLeaveReview: boolean;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
      {ratingCount > 0 ? (
        <>
          <StarRating rating={ratingAvg} count={ratingCount} size="md" />
          <span className="text-sm text-muted">
            {ratingCount} review{ratingCount === 1 ? "" : "s"}
          </span>
        </>
      ) : (
        <span className="text-sm text-muted">No reviews yet</span>
      )}
      {showLeaveReview && (
        <Link href="#reviews" className="text-sm font-medium text-accent hover:underline">
          Leave a review
        </Link>
      )}
    </div>
  );
}
