/** Resolve US zip codes to lat/lng via Zippopotam (no API key). */
const KNOWN_US_ZIP_COORDS: Record<string, { latitude: number; longitude: number }> = {
  "78701": { latitude: 30.2711, longitude: -97.7437 },
  "78704": { latitude: 30.2433, longitude: -97.7698 },
  "78613": { latitude: 30.5217, longitude: -97.8278 },
  "78664": { latitude: 30.5083, longitude: -97.6789 },
};

export async function geocodeUsZipCode(
  zip: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const normalized = zip.replace(/\D/g, "").slice(0, 5);
  if (normalized.length !== 5) return null;

  const known = KNOWN_US_ZIP_COORDS[normalized];
  if (known) return known;

  try {
    const response = await fetch(`https://api.zippopotam.us/us/${normalized}`, {
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      places?: { latitude: string; longitude: string }[];
    };
    const place = data.places?.[0];
    if (!place) return null;

    const latitude = Number(place.latitude);
    const longitude = Number(place.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    return { latitude, longitude };
  } catch {
    return null;
  }
}

export function haversineMiles(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
