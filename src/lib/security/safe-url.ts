export function isSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "https:" && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export function getSafeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  return isSafeExternalUrl(trimmed) ? trimmed : null;
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
