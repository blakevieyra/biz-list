import Link from "next/link";
import { Card } from "@/components/ui";
import type { FollowedBusiness } from "@/lib/types";
import { displayCategoryLabel } from "@/lib/industries";

export function FavoriteBusinessCard({ business }: { business: FollowedBusiness }) {
  const category = displayCategoryLabel(business.category, business.subcategory);

  return (
    <Card className="h-full overflow-hidden p-0">
      <Link href={`/listings/${business.id}`} className="flex h-full flex-col">
        {business.mediaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.mediaUrl}
            alt=""
            className="h-40 w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-40 items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 text-3xl font-bold text-accent/30">
            {business.name.charAt(0)}
          </div>
        )}
        <div className="flex flex-1 flex-col p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-accent">{category}</p>
          <h3 className="mt-1 font-semibold leading-snug">{business.name}</h3>
          <p className="mt-2 text-sm text-muted">
            {business.city}, {business.state}
          </p>
          {business.isHiring ? (
            <span className="mt-3 inline-flex w-fit rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
              Hiring
            </span>
          ) : null}
        </div>
      </Link>
    </Card>
  );
}
