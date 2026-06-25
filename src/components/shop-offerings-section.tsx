"use client";

import type { BusinessService } from "@/lib/types";
import { Card } from "@/components/ui";
import { ServiceListing } from "@/components/service-listing";

const SERVICE_TYPE_LABELS: Record<string, string> = {
  order: "Order",
  booking: "Book",
  quote: "Get a quote",
  inquiry: "Inquire",
  download: "Download",
  application: "Apply",
  rsvp: "RSVP",
  subscription: "Subscribe",
  form: "Request",
  link: "Visit",
};

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
      <h2 className="font-semibold">Offerings</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {services.map((service) => (
          <div
            key={service.name}
            className="flex flex-col overflow-hidden rounded-xl border border-border bg-white"
          >
            {/* Image */}
            <div className="aspect-[3/2] w-full overflow-hidden bg-slate-100">
              {service.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={service.imageUrl}
                  alt={service.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-accent/15">
                  {service.name.charAt(0)}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-semibold leading-tight">{service.name}</h3>
                {service.serviceType && SERVICE_TYPE_LABELS[service.serviceType] && (
                  <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-accent">
                    {SERVICE_TYPE_LABELS[service.serviceType]}
                  </span>
                )}
              </div>

              {service.price && (
                <p className="mt-1.5 text-lg font-bold text-accent">{service.price}</p>
              )}

              {service.description && (
                <p className="mt-2 text-sm leading-relaxed text-muted">{service.description}</p>
              )}

              {service.quantity && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                  <svg
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="h-3.5 w-3.5 shrink-0 text-accent/60"
                  >
                    <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM7 9V5h2v4H7zm0 2v-1.5h2V11H7z" />
                  </svg>
                  {service.quantity}
                </p>
              )}

              {service.actionUrl && (
                <a
                  href={service.actionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 text-xs text-accent hover:underline"
                >
                  {service.actionLabel ?? "Learn more"} →
                </a>
              )}

              <div className="mt-auto pt-4">
                <ServiceListing
                  service={service}
                  businessId={businessId}
                  businessName={businessName}
                  currentUserId={currentUserId}
                  isOwner={isOwner}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
