"use client";

import { useState, useTransition } from "react";
import { submitServiceOrder } from "@/lib/actions/business";
import { trackOfferingClick } from "@/lib/actions/analytics";
import {
  offeringActionLabel,
  offeringSubmitLabel,
} from "@/lib/service-types";
import type { BusinessService } from "@/lib/types";

export function ServiceListing({
  service,
  businessId,
  businessName,
  currentUserId,
  isOwner,
  compact = false,
}: {
  service: BusinessService;
  businessId: string;
  businessName?: string;
  currentUserId: string | null;
  isOwner: boolean;
  compact?: boolean;
}) {
  if (isOwner) return null;

  return (
    <ServiceOrderForm
      service={service}
      businessId={businessId}
      businessName={businessName}
      currentUserId={currentUserId}
      compact={compact}
    />
  );
}

function fulfillmentOptions(serviceType?: string): string[] | null {
  const t = serviceType?.toLowerCase() ?? "";
  if (t === "food & drink" || t === "product" || t === "retail") {
    return ["Pickup", "Delivery"];
  }
  if (t === "service") {
    return ["At your location", "At business"];
  }
  if (t === "event / experience") {
    return ["In-person", "Virtual"];
  }
  return null;
}

function quantityLabel(serviceType?: string): string {
  const t = serviceType?.toLowerCase() ?? "";
  if (t === "food & drink") return "How many / amount";
  if (t === "service") return "Sessions or scope";
  if (t === "event / experience") return "Number of attendees";
  if (t === "retail" || t === "product") return "Quantity";
  return "Quantity or size";
}

function ServiceOrderForm({
  service,
  businessId,
  businessName,
  currentUserId,
  compact = false,
}: {
  service: BusinessService;
  businessId: string;
  businessName?: string;
  currentUserId: string | null;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [dateNeeded, setDateNeeded] = useState("");
  const [fulfillment, setFulfillment] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const buttonLabel = offeringActionLabel(service.serviceType, compact);
  const fulfillOpts = fulfillmentOptions(service.serviceType);

  function handleOpen() {
    setOpen(true);
    if (fulfillOpts?.length) setFulfillment(fulfillOpts[0]);
    trackOfferingClick(businessId, service.name, buttonLabel.toLowerCase()).catch(() => {});
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUserId) {
      window.location.href = "/auth/login";
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await submitServiceOrder({
        businessId,
        serviceName: service.name,
        quantity,
        dateNeeded,
        fulfillment,
        notes,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      setOpen(false);
      setQuantity("");
      setDateNeeded("");
      setFulfillment("");
      setNotes("");
    });
  }

  if (success) {
    return (
      <p className={compact ? "text-[11px] font-medium text-emerald-700" : "text-sm font-medium text-emerald-700"}>
        Request sent — check your email for confirmation.
      </p>
    );
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={
          compact
            ? "shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
            : "w-full rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
        }
      >
        {buttonLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-form-title"
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0"
            onClick={() => setOpen(false)}
          />

          <form
            onSubmit={handleSubmit}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
          >
            {/* Service summary header */}
            <div className="flex gap-3 border-b border-border bg-slate-50/80 p-4">
              {service.imageUrl && (
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={service.imageUrl} alt="" className="h-full w-full object-cover" />
                </div>
              )}
              <div className="min-w-0">
                <h3 id="order-form-title" className="font-semibold leading-tight">
                  {service.name}
                </h3>
                {businessName && (
                  <p className="mt-0.5 text-xs text-muted">at {businessName}</p>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                  {service.price && (
                    <span className="text-sm font-bold text-accent">{service.price}</span>
                  )}
                  {service.quantity && (
                    <span className="text-xs text-muted">{service.quantity}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5">
              {/* Quantity */}
              <label className="block text-sm">
                <span className="font-medium">{quantityLabel(service.serviceType)}</span>
                <input
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder={service.quantity ?? "e.g. 2 trays, 15 people"}
                  className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm"
                />
              </label>

              {/* Date */}
              <label className="block text-sm">
                <span className="font-medium">
                  {service.serviceType === "Event / experience" ? "Event date" : "Date needed"}
                  <span className="ml-1 font-normal text-muted">(optional)</span>
                </span>
                <input
                  type="date"
                  value={dateNeeded}
                  min={today}
                  onChange={(e) => setDateNeeded(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm"
                />
              </label>

              {/* Fulfillment method */}
              {fulfillOpts && (
                <fieldset>
                  <legend className="text-sm font-medium">
                    {fulfillOpts[0] === "Pickup" ? "Pickup or delivery" : "Location preference"}
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {fulfillOpts.map((opt) => (
                      <label
                        key={opt}
                        className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                          fulfillment === opt
                            ? "border-accent bg-blue-50 text-accent"
                            : "border-border bg-white text-muted"
                        }`}
                      >
                        <input
                          type="radio"
                          name="fulfillment"
                          value={opt}
                          checked={fulfillment === opt}
                          onChange={() => setFulfillment(opt)}
                          className="sr-only"
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              {/* Notes */}
              <label className="block text-sm">
                <span className="font-medium">
                  Additional notes
                  <span className="ml-1 font-normal text-muted">(optional)</span>
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Allergies, special requests, delivery address, timing details…"
                  className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm"
                />
              </label>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="min-h-10 rounded-full border border-border px-4 py-2 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="min-h-10 rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
                >
                  {pending ? "Sending…" : offeringSubmitLabel(service.serviceType)}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
