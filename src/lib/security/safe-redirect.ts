const ALLOWED_NEXT_PATHS = [
  "/listings",
  "/forum",
  "/dashboard",
  "/profile/create",
  "/pricing",
  "/messages",
  "/notifications",
  "/partnerships",
  "/groups",
  "/auth/check-email",
];

export function getSafeRedirectPath(next: string | null, fallback = "/listings"): string {
  if (!next) return fallback;

  const path = next.trim();

  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    return fallback;
  }

  if (path.includes("://") || path.includes("@")) {
    return fallback;
  }

  const basePath = path.split("?")[0].split("#")[0];
  const allowed = ALLOWED_NEXT_PATHS.some(
    (p) => basePath === p || basePath.startsWith(`${p}/`),
  );

  return allowed ? path : fallback;
}
