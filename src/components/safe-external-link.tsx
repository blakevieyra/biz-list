import { getSafeExternalUrl } from "@/lib/security/safe-url";

export function SafeExternalLink({
  url,
  label = "View media",
  className = "inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-sm text-accent transition hover:border-accent/40 hover:bg-blue-50",
}: {
  url: string;
  label?: string;
  className?: string;
}) {
  const safe = getSafeExternalUrl(url);
  if (!safe) return null;

  return (
    <a href={safe} target="_blank" rel="noopener noreferrer" className={className}>
      {label}
    </a>
  );
}
