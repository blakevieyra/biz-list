"use client";

import { useState } from "react";
import Link from "next/link";
import { updateBusinessEvent, deleteBusinessEvent } from "@/lib/actions/events";
import { INDUSTRY_OPTIONS } from "@/lib/industries";
import { EVENT_PURPOSE_OPTIONS } from "@/lib/event-purposes";
import { Card, formatPostDateTime } from "@/components/ui";
import type { BusinessEvent } from "@/lib/types";

function toLocalDatetimeValue(iso: string): string {
  if (!iso) return "";
  // datetime-local wants "YYYY-MM-DDTHH:MM"
  return iso.slice(0, 16);
}

function EventEditForm({
  event,
  onDone,
}: {
  event: BusinessEvent;
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mt-4 space-y-4 border-t border-border pt-4"
      action={async (formData) => {
        setPending(true);
        setError(null);
        const result = await updateBusinessEvent({
          eventId: event.id,
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
          capacity: formData.get("capacity") ? Number(formData.get("capacity")) : undefined,
        });
        setPending(false);
        if (result.error) {
          setError(result.error);
        } else {
          onDone();
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">Event title</span>
          <input
            name="title"
            required
            defaultValue={event.title}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">Description</span>
          <textarea
            name="description"
            rows={3}
            defaultValue={event.description}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">Venue / location name</span>
          <input
            name="location"
            required
            defaultValue={event.location}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">Street address</span>
          <input
            name="address"
            defaultValue={event.address}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">City</span>
          <input
            name="city"
            defaultValue={event.city}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">State</span>
          <input
            name="state"
            defaultValue={event.state}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">ZIP</span>
          <input
            name="zipCode"
            defaultValue={event.zipCode}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Category</span>
          <select
            name="category"
            defaultValue={event.category}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="">Select industry</option>
            {INDUSTRY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Purpose</span>
          <select
            name="purpose"
            defaultValue={event.purpose ?? ""}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="">Select purpose</option>
            {EVENT_PURPOSE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Starts</span>
          <input
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={toLocalDatetimeValue(event.startsAt)}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Ends (optional)</span>
          <input
            name="endsAt"
            type="datetime-local"
            defaultValue={toLocalDatetimeValue(event.endsAt ?? "")}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Capacity (optional)</span>
          <input
            name="capacity"
            type="number"
            min={1}
            defaultValue={event.capacity ?? ""}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">Cover image URL (optional)</span>
          <input
            name="imageUrl"
            type="url"
            defaultValue={event.imageUrl}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-full border border-border px-5 py-2 text-sm font-medium hover:border-accent/40"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function EventsListClient({ events }: { events: BusinessEvent[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (events.length === 0) {
    return (
      <Card>
        <p className="text-sm text-muted">No events published yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
      {events.map((event) => (
        <Card key={event.id}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <Link href={`/events/${event.id}`} className="font-medium hover:text-accent">
                {event.title}
              </Link>
              <p className="text-sm text-muted">{formatPostDateTime(event.startsAt)}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="text-xs text-muted">{event.goingCount} going</p>
                {event.purpose && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-accent">
                    {event.purpose}
                  </span>
                )}
                {!event.purpose && (
                  <span className="rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted">
                    No purpose set
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-xs uppercase tracking-wide text-muted">{event.status}</span>
              <button
                type="button"
                onClick={() => setEditingId(editingId === event.id ? null : event.id)}
                className="text-xs font-medium text-accent hover:underline"
              >
                {editingId === event.id ? "Cancel" : "Edit"}
              </button>
              <button
                type="button"
                disabled={deletingId === event.id}
                onClick={async () => {
                  if (!confirm(`Delete "${event.title}"? This cannot be undone.`)) return;
                  setDeletingId(event.id);
                  setDeleteError(null);
                  const result = await deleteBusinessEvent(event.id);
                  setDeletingId(null);
                  if (result.error) setDeleteError(result.error);
                }}
                className="text-xs font-medium text-red-500 hover:underline disabled:opacity-50"
              >
                {deletingId === event.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>

          {editingId === event.id && (
            <EventEditForm event={event} onDone={() => setEditingId(null)} />
          )}
        </Card>
      ))}
    </div>
  );
}
