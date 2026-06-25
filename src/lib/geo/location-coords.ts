import {
  matchesDiscoveryRadius,
  normalizeZipCode,
  type DiscoveryViewer,
  type LocationProfile,
} from "@/lib/feed/location-scope";
import type { DiscoveryRadius } from "@/lib/types";
import { geocodeUsZipCode } from "@/lib/geo/geocode";

export type LocatableProfile = {
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  country?: string;
};

function hasCoordinates(
  profile: LocatableProfile,
): profile is LocatableProfile & { latitude: number; longitude: number } {
  return (
    typeof profile.latitude === "number" &&
    typeof profile.longitude === "number" &&
    Number.isFinite(profile.latitude) &&
    Number.isFinite(profile.longitude)
  );
}

function isUsCountry(country: string | undefined): boolean {
  const value = (country ?? "US").trim().toUpperCase();
  return value === "US" || value === "USA" || value === "UNITED STATES";
}

async function coordsForZip(
  zip: string,
  cache: Map<string, { latitude: number; longitude: number } | null>,
): Promise<{ latitude: number; longitude: number } | null> {
  const key = normalizeZipCode(zip);
  if (key.length !== 5) return null;
  if (cache.has(key)) return cache.get(key)!;

  const geo = await geocodeUsZipCode(key);
  cache.set(key, geo);
  return geo;
}

export async function enrichLocationCoordinates<T extends LocatableProfile>(
  profile: T,
  cache = new Map<string, { latitude: number; longitude: number } | null>(),
): Promise<T> {
  if (hasCoordinates(profile)) return profile;
  if (!isUsCountry(profile.country)) return profile;

  const geo = await coordsForZip(profile.zipCode ?? "", cache);
  if (!geo) return profile;

  return { ...profile, latitude: geo.latitude, longitude: geo.longitude };
}

export async function enrichManyLocationCoordinates<T extends LocatableProfile>(
  profiles: T[],
): Promise<T[]> {
  const cache = new Map<string, { latitude: number; longitude: number } | null>();
  return Promise.all(profiles.map((profile) => enrichLocationCoordinates(profile, cache)));
}

export async function filterByDiscoveryRadius<T extends LocationProfile>(
  items: T[],
  viewer: DiscoveryViewer | null | undefined,
  radius: DiscoveryRadius,
): Promise<T[]> {
  if (!viewer) return items;

  const cache = new Map<string, { latitude: number; longitude: number } | null>();
  const enrichedViewer = await enrichLocationCoordinates(viewer, cache);

  const results: T[] = [];
  for (const item of items) {
    const enrichedItem = await enrichLocationCoordinates(item, cache);
    if (matchesDiscoveryRadius(enrichedViewer, enrichedItem, radius)) {
      results.push(item);
    }
  }

  return results;
}
