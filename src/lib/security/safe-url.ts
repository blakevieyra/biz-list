export function isSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "https:" && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export function normalizeExternalUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("http://")) return trimmed.replace("http://", "https://");
  if (!trimmed.startsWith("https://")) return `https://${trimmed}`;
  return trimmed;
}

export function getSafeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const normalized = normalizeExternalUrl(url.trim());
  return isSafeExternalUrl(normalized) ? normalized : null;
}

export function sanitizeMediaUrls(urls: string[] | undefined, max = 10): string[] {
  if (!urls?.length) return [];
  const seen = new Set<string>();
  const safe: string[] = [];

  for (const raw of urls) {
    const url = getSafeExternalUrl(raw);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    safe.push(url);
    if (safe.length >= max) break;
  }

  return safe;
}
