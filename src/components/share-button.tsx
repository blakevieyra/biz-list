"use client";

export function ShareButton({ title, url }: { title: string; url: string }) {
  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* user cancelled */
      }
    }
    await navigator.clipboard.writeText(url);
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-accent/40"
    >
      Share
    </button>
  );
}
