import { createClient } from "@/lib/supabase/server";
import {
  matchesAreaScope,
  matchesMileRadius,
  type DiscoveryViewer,
} from "@/lib/feed/location-scope";
import type { AreaScope, BusinessEvent, MileRadius } from "@/lib/types";
import { isIndustryOption } from "@/lib/industries";

type EventRow = {
  id: string;
  business_id: string;
  author_id: string;
  title: string;
  description: string;
  location: string;
  address: string;
  city: string;
  state: string;
  county?: string;
  zip_code: string;
  latitude?: number | null;
  longitude?: number | null;
  category: string;
  image_url: string;
  starts_at: string;
  ends_at?: string | null;
  capacity?: number | null;
  status: string;
  created_at: string;
  businesses?: {
    name: string;
    media_urls?: string[];
  } | {
    name: string;
    media_urls?: string[];
  }[] | null;
};

function businessName(
  businesses: EventRow["businesses"],
): string | undefined {
  if (!businesses) return undefined;
  if (Array.isArray(businesses)) return businesses[0]?.name;
  return businesses.name;
}

function businessMedia(
  businesses: EventRow["businesses"],
): string | undefined {
  if (!businesses) return undefined;
  const urls = Array.isArray(businesses)
    ? businesses[0]?.media_urls
    : businesses.media_urls;
  return urls?.[0];
}

export function mapEventRow(
  row: EventRow,
  extras: { goingCount?: number; userRsvp?: "going" | "interested" | null } = {},
): BusinessEvent {
  return {
    id: row.id,
    businessId: row.business_id,
    businessName: businessName(row.businesses),
    businessMediaUrl: businessMedia(row.businesses),
    authorId: row.author_id,
    title: row.title,
    description: row.description,
    location: row.location,
    address: row.address,
    city: row.city,
    state: row.state,
    county: row.county,
    zipCode: row.zip_code,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    category: row.category,
    imageUrl: row.image_url,
    startsAt: row.starts_at,
    endsAt: row.ends_at ?? undefined,
    capacity: row.capacity ?? undefined,
    status: row.status as BusinessEvent["status"],
    goingCount: extras.goingCount ?? 0,
    userRsvp: extras.userRsvp ?? null,
    createdAt: row.created_at,
  };
}

async function attachRsvpCounts(
  events: BusinessEvent[],
  userId?: string | null,
): Promise<BusinessEvent[]> {
  if (!events.length) return events;
  const supabase = await createClient();
  if (!supabase) return events;

  const eventIds = events.map((e) => e.id);

  const { data: rsvps } = await supabase
    .from("event_rsvps")
    .select("event_id, user_id, status")
    .in("event_id", eventIds);

  const goingByEvent = new Map<string, number>();
  const userRsvpByEvent = new Map<string, "going" | "interested">();

  for (const r of rsvps ?? []) {
    if (r.status === "going") {
      goingByEvent.set(r.event_id, (goingByEvent.get(r.event_id) ?? 0) + 1);
    }
    if (userId && r.user_id === userId) {
      userRsvpByEvent.set(r.event_id, r.status as "going" | "interested");
    }
  }

  return events.map((event) => ({
    ...event,
    goingCount: goingByEvent.get(event.id) ?? 0,
    userRsvp: userRsvpByEvent.get(event.id) ?? null,
  }));
}

function matchesEventFilters(
  event: BusinessEvent,
  filters: {
    query?: string;
    category?: string;
    areaScope?: AreaScope;
    mileRadius?: MileRadius;
    viewer?: DiscoveryViewer | null;
  },
): boolean {
  if (filters.query) {
    const q = filters.query.toLowerCase();
    const haystack = [
      event.title,
      event.description,
      event.location,
      event.businessName ?? "",
      event.city,
      event.state,
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  if (filters.category && event.category !== filters.category) return false;

  const locationProfile = {
    city: event.city,
    state: event.state,
    county: event.county,
    zipCode: event.zipCode,
    latitude: event.latitude,
    longitude: event.longitude,
  };

  if (filters.mileRadius && filters.viewer) {
    if (!matchesMileRadius(locationProfile, filters.viewer, filters.mileRadius)) {
      return false;
    }
  } else if (filters.areaScope && filters.viewer) {
    if (!matchesAreaScope(locationProfile, filters.viewer, filters.areaScope)) {
      return false;
    }
  }

  return true;
}

export async function getBusinessEvents(filters?: {
  query?: string;
  category?: string;
  areaScope?: AreaScope;
  mileRadius?: MileRadius;
  viewer?: DiscoveryViewer | null;
  businessId?: string;
  upcomingOnly?: boolean;
  limit?: number;
  userId?: string | null;
}): Promise<BusinessEvent[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  let query = supabase
    .from("business_events")
    .select("*, businesses(name, media_urls)")
    .eq("status", "published")
    .order("starts_at", { ascending: true });

  if (filters?.businessId) {
    query = query.eq("business_id", filters.businessId);
  }

  if (filters?.upcomingOnly !== false) {
    query = query.gte("starts_at", new Date().toISOString());
  }

  if (filters?.limit) {
    query = query.limit(filters.limit * 3);
  }

  const { data: rows } = await query;
  if (!rows?.length) return [];

  let events = (rows as EventRow[]).map((row) => mapEventRow(row));

  if (filters?.category && isIndustryOption(filters.category)) {
    events = events.filter((e) => e.category === filters.category);
  }

  events = events.filter((event) =>
    matchesEventFilters(event, {
      query: filters?.query,
      category: filters?.category,
      areaScope: filters?.areaScope,
      mileRadius: filters?.mileRadius,
      viewer: filters?.viewer,
    }),
  );

  if (filters?.limit) {
    events = events.slice(0, filters.limit);
  }

  return attachRsvpCounts(events, filters?.userId);
}

export async function getBusinessEventById(
  id: string,
  userId?: string | null,
): Promise<BusinessEvent | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: row } = await supabase
    .from("business_events")
    .select("*, businesses(name, media_urls)")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (!row) return null;

  const [event] = await attachRsvpCounts([mapEventRow(row as EventRow)], userId);
  return event ?? null;
}

export async function getEventsForBusinessOwner(
  ownerId: string,
): Promise<BusinessEvent[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (!business) return [];

  const { data: rows } = await supabase
    .from("business_events")
    .select("*, businesses(name, media_urls)")
    .eq("business_id", business.id)
    .order("starts_at", { ascending: false });

  const events = (rows as EventRow[] | null)?.map((row) => mapEventRow(row)) ?? [];
  return attachRsvpCounts(events);
}
