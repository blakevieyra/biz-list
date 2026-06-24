import { haversineMiles } from "@/lib/geo/geocode";
import type { UserProfile } from "@/lib/types";

export type DiscoveryRadius = "5" | "10" | "25" | "50" | "state" | "nationwide";

/** @deprecated Use DiscoveryRadius */
export type FeedScope = DiscoveryRadius;

export type LocationProfile = Pick<
  UserProfile,
  "city" | "state" | "zipCode" | "latitude" | "longitude"
>;

export type DiscoveryViewer = Pick<
  UserProfile,
  "city" | "state" | "zipCode" | "latitude" | "longitude" | "industryInterests"
>;

export const DISCOVERY_RADIUS_LABELS: Record<DiscoveryRadius, string> = {
  "5": "Within 5 miles",
  "10": "Within 10 miles",
  "25": "Within 25 miles",
  "50": "Within 50 miles",
  state: "My state",
  nationwide: "Nationwide",
};

export const FEED_SCOPE_LABELS = DISCOVERY_RADIUS_LABELS;

export const DEFAULT_DISCOVERY_RADIUS: DiscoveryRadius = "25";

export function normalizeZipCode(zip: string): string {
  return zip.replace(/\D/g, "").slice(0, 5);
}

export function resolveDiscoveryRadius(
  urlRadius: string | undefined,
  profileRadius?: DiscoveryRadius,
): DiscoveryRadius {
  const allowed: DiscoveryRadius[] = ["5", "10", "25", "50", "state", "nationwide"];
  if (urlRadius && allowed.includes(urlRadius as DiscoveryRadius)) {
    return urlRadius as DiscoveryRadius;
  }
  if (profileRadius && allowed.includes(profileRadius)) {
    return profileRadius;
  }
  return "25";
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

export function matchesDiscoveryRadius(
  viewer: LocationProfile,
  target: LocationProfile,
  radius: DiscoveryRadius,
): boolean {
  if (radius === "nationwide") return true;

  const viewerState = viewer.state.trim().toLowerCase();
  const targetState = target.state.trim().toLowerCase();
  if (!viewerState || !targetState) return true;

  if (radius === "state") {
    return viewerState === targetState;
  }

  const miles = Number(radius);
  if (hasCoordinates(viewer) && hasCoordinates(target)) {
    return haversineMiles(viewer, target) <= miles;
  }

  const viewerZip = normalizeZipCode(viewer.zipCode ?? "");
  const targetZip = normalizeZipCode(target.zipCode ?? "");
  if (viewerZip && targetZip && viewerZip === targetZip) return true;

  const viewerCity = viewer.city.trim().toLowerCase();
  const targetCity = target.city.trim().toLowerCase();
  if (viewerCity && targetCity) {
    return viewerCity === targetCity && viewerState === targetState;
  }

  return viewerState === targetState;
}

export const matchesFeedScope = matchesDiscoveryRadius;

export function businessDiscoveryScore(
  input: {
    likeCount: number;
    ratingAvg: number;
    ratingCount: number;
    isHiring?: boolean;
    category?: string;
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
    if (viewer.industryInterests.includes(input.category)) {
      score += 25;
    }
  }

  if (viewer && radius && radius !== "nationwide" && radius !== "state") {
    const miles = Number(radius);
    if (
      hasCoordinates(viewer) &&
      typeof input.latitude === "number" &&
      typeof input.longitude === "number"
    ) {
      const distance = haversineMiles(viewer, {
        latitude: input.latitude,
        longitude: input.longitude,
      });
      if (distance <= miles) score += Math.max(0, 20 - Math.floor(distance / 2));
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
