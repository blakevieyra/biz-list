export function getPublicErrorMessage(
  error: Error & { digest?: string },
  fallback: string,
): string {
  if (process.env.NODE_ENV !== "production") {
    return error.message || fallback;
  }
  return fallback;
}

export function getErrorReference(error: Error & { digest?: string }): string | null {
  if (process.env.NODE_ENV === "production" && error.digest) {
    return error.digest;
  }
  return null;
}
