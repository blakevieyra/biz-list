"use client";

import type { BusinessService } from "@/lib/types";
import {
  contentLikeKey,
  isContentLiked,
  type ContentLikeState,
} from "@/lib/content-likes-types";
import { Card } from "@/components/ui";
import { ServiceListing } from "@/components/service-listing";

export function ShopOfferingsSection({
  businessId,
  services,
  businessWebsite,
  currentUserId,
  isOwner,
  contentLikes,
}: {
  businessId: string;
  services: BusinessService[];
  businessWebsite?: string;
  currentUserId: string | null;
  isOwner: boolean;
  contentLikes: ContentLikeState;
}) {
  if (services.length === 0) return null;

  return (
    <Card id="shop">
      <h2 className="text-sm font-semibold">Offerings</h2>
      <ul className="mt-3 divide-y divide-border">
        {services.map((service) => {
          const likeKey = contentLikeKey("service", service.name);
          return (
            <li key={service.name} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              {service.imageUrl ? (
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={service.imageUrl} alt="" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-blue-50 to-slate-50 text-sm font-bold text-accent/40">
                  {service.name.charAt(0) || "?"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-tight">{service.name}</p>
                {service.price && (
                  <p className="text-xs font-medium text-accent">{service.price}</p>
                )}
                {service.description && (
                  <p className="line-clamp-1 text-xs text-muted">{service.description}</p>
                )}
              </div>
              <ServiceListing
                service={service}
                businessId={businessId}
                businessWebsite={businessWebsite}
                currentUserId={currentUserId}
                isOwner={isOwner}
                likeCount={contentLikes.counts[likeKey] ?? 0}
                liked={isContentLiked(contentLikes, "service", service.name)}
                compact
              />
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
