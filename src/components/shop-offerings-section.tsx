"use client";

import type { BusinessService } from "@/lib/types";
import { Card } from "@/components/ui";
import { ServiceListing } from "@/components/service-listing";

export function ShopOfferingsSection({
  businessId,
  businessName,
  services,
  currentUserId,
  isOwner,
}: {
  businessId: string;
  businessName: string;
  services: BusinessService[];
  currentUserId: string | null;
  isOwner: boolean;
}) {
  if (services.length === 0) return null;

  return (
    <Card id="shop">
      <h2 className="text-sm font-semibold">Offerings</h2>
      <ul className="mt-3 divide-y divide-border">
        {services.map((service) => (
          <li key={service.name} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            {service.imageUrl ? (
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:h-16 sm:w-16">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={service.imageUrl} alt="" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-slate-50 text-sm font-bold text-accent/40 sm:h-16 sm:w-16">
                {service.name.charAt(0) || "?"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">{service.name}</p>
              {service.price && (
                <p className="mt-0.5 text-xs font-medium text-accent">{service.price}</p>
              )}
              {service.description && (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted">{service.description}</p>
              )}
            </div>
            <ServiceListing
              service={service}
              businessId={businessId}
              businessName={businessName}
              currentUserId={currentUserId}
              isOwner={isOwner}
              compact
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}
