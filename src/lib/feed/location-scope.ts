import { haversineMiles } from "@/lib/geo/geocode";
import type { AreaScope, DiscoveryRadius, MileRadius, UserProfile } from "@/lib/types";

/** @deprecated Use DiscoveryRadius */
export type FeedScope = DiscoveryRadius;

export type LocationProfile = Pick<
  UserProfile,
  "city" | "state" | "county" | "zipCode" | "latitude" | "longitude"
>;

export type DiscoveryViewer = Pick<
  UserProfile,
  "city" | "state" | "county" | "zipCode" | "latitude" | "longitude" | "industryInterests"
>;

export const MILE_RADIUS_OPTIONS: MileRadius[] = ["5", "10", "25", "50"];

export const MILE_RADIUS_LABELS: Record<MileRadius, string> = {
  "5": "Within 5 miles",
  "10": "Within 10 miles",
  "25": "Within 25 miles",
  "50": "Within 50 miles",
};

export const AREA_SCOPE_OPTIONS: AreaScope[] = ["city", "county", "state", "nation"];

export const AREA_SCOPE_LABELS: Record<AreaScope, string> = {
  city: "My city",
  county: "My county",
  state: "My state",
  nation: "Nationwide",
};

export const DISCOVERY_RADIUS_LABELS: Record<DiscoveryRadius, string> = {
  ...MILE_RADIUS_LABELS,
  ...AREA_SCOPE_LABELS,
};

export const FEED_SCOPE_LABELS = DISCOVERY_RADIUS_LABELS;

export const DEFAULT_DISCOVERY_RADIUS: AreaScope = "city";
export const DEFAULT_MILE_RADIUS: MileRadius = "25";

const MILE_VALUES = new Set<string>(MILE_RADIUS_OPTIONS);
const AREA_VALUES = new Set<string>(AREA_SCOPE_OPTIONS);

const LEGACY_SCOPE_MAP: Record<string, DiscoveryRadius> = {
  "5": "5",
  "10": "10",
  "25": "25",
  "50": "50",
  local: "city",
  city: "city",
  county: "county",
  state: "state",
  nation: "nation",
  nationwide: "nation",
};

export function normalizeDiscoveryRadius(value: string | undefined): DiscoveryRadius | undefined {
  if (!value) return undefined;
  return LEGACY_SCOPE_MAP[value.trim().toLowerCase()];
}

export function resolveAreaScope(
  urlScope: string | undefined,
  profileScope?: DiscoveryRadius | string,
): AreaScope {
  const fromUrl = normalizeDiscoveryRadius(urlScope);
  if (fromUrl && AREA_VALUES.has(fromUrl)) return fromUrl as AreaScope;

  const fromProfile = normalizeDiscoveryRadius(profileScope);
  if (fromProfile && AREA_VALUES.has(fromProfile)) return fromProfile as AreaScope;

  return DEFAULT_DISCOVERY_RADIUS;
}

export function resolveMileRadius(miles: string | undefined): MileRadius | undefined {
  if (!miles) return undefined;
  const normalized = miles.trim();
  return MILE_VALUES.has(normalized) ? (normalized as MileRadius) : undefined;
}

/** @deprecated Use resolveAreaScope */
export function resolveDiscoveryRadius(
  urlRadius: string | undefined,
  profileRadius?: DiscoveryRadius | string,
): DiscoveryRadius {
  const mile = resolveMileRadius(urlRadius);
  if (mile) return mile;
  return resolveAreaScope(urlRadius, profileRadius);
}

export const resolveFeedScope = resolveDiscoveryRadius;

function hasCoordinates(
  profile: Pick<UserProfile, "latitude" | "longitude">,
): profile is { latitude: number; longitude: number } {
  return (
    typeof profile.latitude === "number" &&
    typeof profile.longitude === "number" &&
    Number.isFinite(profile.latitude) &&
    Number.isFinite(profile.longitude)
  );
}

function normalizeLocation(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function matchesMileRadius(
  viewer: LocationProfile,
  target: LocationProfile,
  miles: MileRadius,
): boolean {
  const limit = Number(miles);
  if (hasCoordinates(viewer) && hasCoordinates(target)) {
    return haversineMiles(viewer, target) <= limit;
  }

  const viewerZip = normalizeZipCode(viewer.zipCode ?? "");
  const targetZip = normalizeZipCode(target.zipCode ?? "");
  if (viewerZip && targetZip && viewerZip === targetZip) return true;

  const viewerCity = normalizeLocation(viewer.city);
  const targetCity = normalizeLocation(target.city);
  const viewerState = normalizeLocation(viewer.state);
  const targetState = normalizeLocation(target.state);
  if (viewerCity && targetCity && viewerCity === targetCity && viewerState === targetState) {
    return miles === "5" || miles === "10";
  }

  return viewerState === targetState && (miles === "25" || miles === "50");
}

export function matchesAreaScope(
  viewer: LocationProfile,
  target: LocationProfile,
  scope: AreaScope,
): boolean {
  if (scope === "nation") return true;

  const viewerState = normalizeLocation(viewer.state);
  const targetState = normalizeLocation(target.state);
  if (!viewerState || !targetState) return true;

  if (scope === "state") {
    return viewerState === targetState;
  }

  if (scope === "county") {
    const viewerCounty = normalizeLocation(viewer.county);
    const targetCounty = normalizeLocation(target.county);
    if (viewerCounty && targetCounty) {
      return viewerCounty === targetCounty && viewerState === targetState;
    }
    return viewerState === targetState;
  }

  const viewerCity = normalizeLocation(viewer.city);
  const targetCity = normalizeLocation(target.city);
  if (viewerCity && targetCity) {
    return viewerCity === targetCity && viewerState === targetState;
  }

  if (hasCoordinates(viewer) && hasCoordinates(target)) {
    return haversineMiles(viewer, target) <= 25;
  }

  const viewerZip = normalizeZipCode(viewer.zipCode ?? "");
  const targetZip = normalizeZipCode(target.zipCode ?? "");
  if (viewerZip && targetZip && viewerZip === targetZip) return true;

  return viewerState === targetState;
}

export function matchesDiscoveryRadius(
  viewer: LocationProfile,
  target: LocationProfile,
  radius: DiscoveryRadius,
): boolean {
  if (MILE_VALUES.has(radius)) {
    return matchesMileRadius(viewer, target, radius as MileRadius);
  }
  return matchesAreaScope(viewer, target, radius as AreaScope);
}

export const matchesFeedScope = matchesDiscoveryRadius;

export function normalizeZipCode(zip: string): string {
  return zip.replace(/\D/g, "").slice(0, 5);
}

export function businessDiscoveryScore(
  input: {
    likeCount: number;
    ratingAvg: number;
    ratingCount: number;
    isHiring?: boolean;
    category?: string;
    subcategory?: string;
    zipCode?: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
  },
  viewer?: DiscoveryViewer | null,
  radius?: DiscoveryRadius | MileRadius,
): number {
  let score =
    input.likeCount * 2 +
    input.ratingAvg * Math.min(input.ratingCount, 20) +
    (input.isHiring ? 3 : 0);

  if (viewer?.industryInterests?.length && input.category) {
    const fullTag = input.subcategory
      ? `${input.category} › ${input.subcategory}`
      : input.category;
    if (
      viewer.industryInterests.includes(fullTag) ||
      viewer.industryInterests.includes(input.category)
    ) {
      score += 25;
    }
  }

  if (viewer && radius && radius !== "nation") {
    if (
      hasCoordinates(viewer) &&
      typeof input.latitude === "number" &&
      typeof input.longitude === "number"
    ) {
      const distance = haversineMiles(viewer, {
        latitude: input.latitude,
        longitude: input.longitude,
      });
      score += Math.max(0, 20 - Math.floor(distance / 2));
    } else {
      const viewerZip = normalizeZipCode(viewer.zipCode ?? "");
      const targetZip = normalizeZipCode(input.zipCode ?? "");
      if (viewerZip && targetZip && viewerZip === targetZip) score += 15;
    }
  }

  return score;
}

export function profileFeedScore(profile: UserProfile): number {
  return (
    (profile.isSeekingWork ? 10 : 0) +
    profile.skills.length * 2 +
    (profile.headline ? 3 : 0) +
    (profile.bio ? 1 : 0)
  );
}
