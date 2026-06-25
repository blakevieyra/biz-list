"use client";

import { useState, useTransition } from "react";
import { submitServiceOrder } from "@/lib/actions/business";
import { trackOfferingClick } from "@/lib/actions/analytics";
import {
  offeringActionLabel,
  offeringFormTitle,
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
      businessId={businessId}
      businessName={businessName}
      serviceName={service.name}
      servicePrice={service.price}
      serviceType={service.serviceType}
      buttonLabel={offeringActionLabel(service.serviceType, compact)}
      currentUserId={currentUserId}
      compact={compact}
    />
  );
}

function ServiceOrderForm({
  businessId,
  businessName,
  serviceName,
  servicePrice,
  serviceType,
  buttonLabel,
  currentUserId,
  compact = false,
}: {
  businessId: string;
  businessName?: string;
  serviceName: string;
  servicePrice?: string;
  serviceType?: string;
  buttonLabel: string;
  currentUserId: string | null;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

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
        serviceName,
        message,
        quantity,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      setOpen(false);
      setMessage("");
      setQuantity("");
    });
  }

  if (success) {
    return (
      <p className={compact ? "text-[11px] font-medium text-emerald-700" : "text-sm font-medium text-emerald-700"}>
        Order sent — check your email.
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          trackOfferingClick(businessId, serviceName, buttonLabel.toLowerCase()).catch(() => {});
        }}
        className={
          compact
            ? "shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
            : "min-h-10 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
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
            aria-label="Close order form"
            className="absolute inset-0"
            onClick={() => setOpen(false)}
          />
          <form
            onSubmit={handleSubmit}
            className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
          >
            <h3 id="order-form-title" className="text-lg font-semibold">
              {offeringFormTitle(serviceType, serviceName)}
            </h3>
            {businessName && (
              <p className="mt-1 text-sm text-muted">at {businessName}</p>
            )}
            {servicePrice && (
              <p className="mt-1 text-sm font-medium text-accent">{servicePrice}</p>
            )}
            <p className="mt-3 text-sm text-muted">
              Your request goes straight to the business inbox. You&apos;ll get an email confirmation.
            </p>

            <label className="mt-4 block text-sm">
              <span className="font-medium">Quantity or size</span>
              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Optional — e.g. 2 loaves, size M"
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm"
              />
            </label>

            <label className="mt-3 block text-sm">
              <span className="font-medium">Details</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={4}
                placeholder="Share what you need, timing, pickup or delivery notes, etc."
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm"
              />
            </label>

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-10 rounded-full border border-border px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending || !message.trim()}
                className="min-h-10 rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {pending ? "Sending…" : offeringSubmitLabel(serviceType)}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
