"use client";

import { Card } from "@/components/ui";

export function ListingPhotosCard({ urls }: { urls: string[] }) {
  const photos = urls.slice(1, 5);
  if (photos.length === 0) return null;

  async function handleDownload(url: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = url.split("/").pop() ?? "photo.jpg";
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, "_blank");
    }
  }

  return (
    <Card>
      <h2 className="font-semibold">Photos</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {photos.map((url, i) => (
          <div key={`${url}-${i}`} className="group relative overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              loading="lazy"
              className="aspect-square w-full object-cover"
            />
            <button
              type="button"
              onClick={() => handleDownload(url)}
              title="Save photo"
              className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      {urls.length > 5 && (
        <p className="mt-2 text-xs text-muted">+{urls.length - 5} more photos</p>
      )}
    </Card>
  );
}
