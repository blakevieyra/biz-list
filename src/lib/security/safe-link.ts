import { getSafeRedirectPath } from "./safe-redirect";

export function getSafeAppLink(link: string | null | undefined): string | null {
  if (!link) return null;
  const safe = getSafeRedirectPath(link, "");
  return safe || null;
}
