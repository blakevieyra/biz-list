import { createClient } from "@/lib/supabase/server";
import { SEED_BUSINESS_EVENTS, SEED_EVENT_COMMENTS } from "@/lib/mock-data";
import {
  type DiscoveryViewer,
} from "@/lib/feed/location-scope";
import type { AreaScope, BusinessEvent, DiscoveryRadius, MileRadius } from "@/lib/types";
import { filterByDiscoveryRadius } from "@/lib/geo/location-coords";
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
  country?: string;
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
  extras: { goingCount?: number; interestedCount?: number; userRsvp?: "going" | "interested" | null } = {},
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
    country: row.country ?? "US",
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    category: row.category,
    imageUrl: row.image_url,
    startsAt: row.starts_at,
    endsAt: row.ends_at ?? undefined,
    capacity: row.capacity ?? undefined,
    status: row.status as BusinessEvent["status"],
    goingCount: extras.goingCount ?? 0,
    interestedCount: extras.interestedCount ?? 0,
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
  const interestedByEvent = new Map<string, number>();
  const userRsvpByEvent = new Map<string, "going" | "interested">();

  for (const r of rsvps ?? []) {
    if (r.status === "going") {
      goingByEvent.set(r.event_id, (goingByEvent.get(r.event_id) ?? 0) + 1);
    } else if (r.status === "interested") {
      interestedByEvent.set(r.event_id, (interestedByEvent.get(r.event_id) ?? 0) + 1);
    }
    if (userId && r.user_id === userId) {
      userRsvpByEvent.set(r.event_id, r.status as "going" | "interested");
    }
  }

  return events.map((event) => ({
    ...event,
    goingCount: goingByEvent.get(event.id) ?? 0,
    interestedCount: interestedByEvent.get(event.id) ?? 0,
    userRsvp: userRsvpByEvent.get(event.id) ?? null,
  }));
}

async function filterEventsByDiscovery(
  events: BusinessEvent[],
  viewer: DiscoveryViewer | null | undefined,
  discoveryRadius: DiscoveryRadius,
): Promise<BusinessEvent[]> {
  if (!viewer) return events;

  const filtered: BusinessEvent[] = [];
  for (const event of events) {
    const location = {
      city: event.city,
      state: event.state,
      county: event.county,
      zipCode: event.zipCode,
      country: event.country ?? "US",
      latitude: event.latitude,
      longitude: event.longitude,
    };
    const [match] = await filterByDiscoveryRadius([location], viewer, discoveryRadius);
    if (match) filtered.push(event);
  }
  return filtered;
}

function matchesEventFilters(
  event: BusinessEvent,
  filters: {
    query?: string;
    category?: string;
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

  return true;
}

async function filterSeedEvents(filters?: {
  query?: string;
  category?: string;
  discoveryRadius?: DiscoveryRadius;
  viewer?: DiscoveryViewer | null;
  businessId?: string;
  upcomingOnly?: boolean;
  limit?: number;
}): Promise<BusinessEvent[]> {
  let events = SEED_BUSINESS_EVENTS.filter((e) => e.status === "published");

  if (filters?.businessId) {
    events = events.filter((e) => e.businessId === filters.businessId);
  }

  if (filters?.upcomingOnly !== false) {
    const now = Date.now();
    events = events.filter((e) => new Date(e.startsAt).getTime() >= now);
  }

  events = events.filter((event) =>
    matchesEventFilters(event, {
      query: filters?.query,
      category: filters?.category,
    }),
  );

  if (filters?.discoveryRadius && filters.viewer) {
    events = await filterEventsByDiscovery(events, filters.viewer, filters.discoveryRadius);
  }

  events.sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  if (filters?.limit) {
    events = events.slice(0, filters.limit);
  }

  return events;
}

export async function getBusinessEvents(filters?: {
  query?: string;
  category?: string;
  areaScope?: AreaScope;
  mileRadius?: MileRadius;
  discoveryRadius?: DiscoveryRadius;
  viewer?: DiscoveryViewer | null;
  businessId?: string;
  upcomingOnly?: boolean;
  limit?: number;
  userId?: string | null;
}): Promise<BusinessEvent[]> {
  const discoveryRadius =
    filters?.discoveryRadius ?? filters?.mileRadius ?? filters?.areaScope ?? "city";
  const supabase = await createClient();
  if (!supabase) return filterSeedEvents({ ...filters, discoveryRadius });

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
    }),
  );

  if (filters?.viewer) {
    events = await filterEventsByDiscovery(events, filters.viewer, discoveryRadius);
  }

  if (filters?.limit) {
    events = events.slice(0, filters.limit);
  }

  return attachRsvpCounts(events, filters?.userId);
}

export async function getUserSavedEvents(
  userId: string,
  limit = 6,
): Promise<BusinessEvent[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data: rsvps } = await supabase
    .from("event_rsvps")
    .select("event_id")
    .eq("user_id", userId)
    .in("status", ["going", "interested"]);

  if (!rsvps?.length) return [];

  const eventIds = [...new Set(rsvps.map((row) => row.event_id))];

  const { data: rows } = await supabase
    .from("business_events")
    .select("*, businesses(name, media_urls)")
    .in("id", eventIds)
    .eq("status", "published")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (!rows?.length) return [];

  const events = (rows as EventRow[]).map((row) => mapEventRow(row));
  return attachRsvpCounts(events, userId);
}

export async function getBusinessEventById(
  id: string,
  userId?: string | null,
): Promise<BusinessEvent | null> {
  const supabase = await createClient();
  if (!supabase) {
    return SEED_BUSINESS_EVENTS.find((e) => e.id === id && e.status === "published") ?? null;
  }

  const { data: row } = await supabase
    .from("business_events")
    .select("*, businesses(name, media_urls)")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (!row) {
    return SEED_BUSINESS_EVENTS.find((e) => e.id === id && e.status === "published") ?? null;
  }

  const [event] = await attachRsvpCounts([mapEventRow(row as EventRow)], userId);
  return event ?? null;
}

type EventCommentRow = {
  id: string;
  event_id: string;
  author_id: string;
  body: string;
  created_at: string;
  profiles?: { display_name: string } | { display_name: string }[] | null;
};

function commentAuthorName(
  profiles: EventCommentRow["profiles"],
): string {
  if (!profiles) return "Member";
  if (Array.isArray(profiles)) return profiles[0]?.display_name ?? "Member";
  return profiles.display_name;
}

export async function getEventComments(eventId: string): Promise<import("@/lib/types").EventComment[]> {
  const supabase = await createClient();
  if (!supabase) {
    return SEED_EVENT_COMMENTS.filter((comment) => comment.eventId === eventId);
  }

  const { data: rows } = await supabase
    .from("event_comments")
    .select("*, profiles(display_name)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  return ((rows ?? []) as EventCommentRow[]).map((row) => ({
    id: row.id,
    eventId: row.event_id,
    authorId: row.author_id,
    authorName: commentAuthorName(row.profiles),
    body: row.body,
    createdAt: row.created_at,
  }));
}

export async function getEventsForBusinessOwner(
  ownerId: string,
): Promise<BusinessEvent[]> {
  const supabase = await createClient();
  if (!supabase) {
    const { SEED_BUSINESSES } = await import("@/lib/mock-data");
    const business = SEED_BUSINESSES.find((b) => b.ownerId === ownerId);
    if (!business) return [];
    return SEED_BUSINESS_EVENTS.filter((e) => e.businessId === business.id).sort(
      (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
    );
  }

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

export async function getBusinessIdsWithEvents(businessIds: string[]): Promise<Set<string>> {
  if (!businessIds.length) return new Set();
  // Guard against enormous IN clauses on very large result sets
  const ids = businessIds.slice(0, 500);
  const supabase = await createClient();
  if (!supabase) return new Set();

  const { data, error } = await supabase
    .from("business_events")
    .select("business_id")
    .in("business_id", ids)
    .eq("status", "published")
    .gte("starts_at", new Date().toISOString())
    .limit(500);

  if (error) {
    console.error("[getBusinessIdsWithEvents]", error.message);
    return new Set();
  }

  return new Set((data ?? []).map((r: { business_id: string }) => r.business_id));
}
