import { haversineMiles } from "@/lib/geo/geocode";
import type { UserProfile } from "@/lib/types";

export type DiscoveryRadius = "city" | "county" | "state" | "nation";

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

export const DISCOVERY_RADIUS_LABELS: Record<DiscoveryRadius, string> = {
  city: "My city",
  county: "My county",
  state: "My state",
  nation: "Nationwide",
};

export const FEED_SCOPE_LABELS = DISCOVERY_RADIUS_LABELS;

export const DEFAULT_DISCOVERY_RADIUS: DiscoveryRadius = "city";

const LEGACY_SCOPE_MAP: Record<string, DiscoveryRadius> = {
  "5": "city",
  "10": "city",
  "25": "city",
  "50": "city",
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

export function resolveDiscoveryRadius(
  urlRadius: string | undefined,
  profileRadius?: DiscoveryRadius | string,
): DiscoveryRadius {
  const fromUrl = normalizeDiscoveryRadius(urlRadius);
  if (fromUrl) return fromUrl;

  const fromProfile = normalizeDiscoveryRadius(profileRadius);
  if (fromProfile) return fromProfile;

  return DEFAULT_DISCOVERY_RADIUS;
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

export function matchesDiscoveryRadius(
  viewer: LocationProfile,
  target: LocationProfile,
  radius: DiscoveryRadius,
): boolean {
  if (radius === "nation") return true;

  const viewerState = normalizeLocation(viewer.state);
  const targetState = normalizeLocation(target.state);
  if (!viewerState || !targetState) return true;

  if (radius === "state") {
    return viewerState === targetState;
  }

  if (radius === "county") {
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
  radius?: DiscoveryRadius,
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
