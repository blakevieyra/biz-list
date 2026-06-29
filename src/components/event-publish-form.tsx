"use client";

import { useState } from "react";
import { createBusinessEvent } from "@/lib/actions/events";
import { INDUSTRY_OPTIONS } from "@/lib/industries";
import { EVENT_PURPOSE_OPTIONS } from "@/lib/event-purposes";

export function EventPublishForm({ businessId }: { businessId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  return (
    <form
      className="space-y-4"
      action={async (formData) => {
        setPending(true);
        setError(null);
        setSuccess(false);

        const result = await createBusinessEvent({
          businessId,
          title: String(formData.get("title") ?? ""),
          description: String(formData.get("description") ?? ""),
          location: String(formData.get("location") ?? ""),
          address: String(formData.get("address") ?? ""),
          city: String(formData.get("city") ?? ""),
          state: String(formData.get("state") ?? ""),
          zipCode: String(formData.get("zipCode") ?? ""),
          category: String(formData.get("category") ?? ""),
          purpose: String(formData.get("purpose") ?? "") || undefined,
          imageUrl: String(formData.get("imageUrl") ?? ""),
          startsAt: String(formData.get("startsAt") ?? ""),
          endsAt: String(formData.get("endsAt") ?? "") || undefined,
          capacity: formData.get("capacity")
            ? Number(formData.get("capacity"))
            : undefined,
        });

        if (result.error) {
          setError(result.error);
        } else {
          setSuccess(true);
        }
        setPending(false);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">Event title</span>
          <input
            name="title"
            required
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">Description</span>
          <textarea
            name="description"
            rows={4}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">Venue / location name</span>
          <input
            name="location"
            required
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">Street address</span>
          <input name="address" className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">City</span>
          <input name="city" className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">State</span>
          <input name="state" className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">ZIP</span>
          <input name="zipCode" className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Category</span>
          <select name="category" className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm">
            <option value="">Select industry</option>
            {INDUSTRY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Purpose</span>
          <select name="purpose" className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm">
            <option value="">Select purpose</option>
            {EVENT_PURPOSE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Starts</span>
          <input
            name="startsAt"
            type="datetime-local"
            required
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Ends (optional)</span>
          <input
            name="endsAt"
            type="datetime-local"
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Capacity (optional)</span>
          <input
            name="capacity"
            type="number"
            min={1}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">Cover image URL (optional)</span>
          <input name="imageUrl" type="url" className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm" />
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && (
        <p className="text-sm text-green-700">Event published. BizList Plus subscribers were notified.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Publishing..." : "Publish event"}
      </button>
    </form>
  );
}
