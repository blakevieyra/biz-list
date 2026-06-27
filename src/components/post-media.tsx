"use client";

import { useState } from "react";
import { SafeExternalLink } from "@/components/safe-external-link";
import {
  BUSINESS_POST_TYPE_LABELS,
  isDirectVideoUrl,
  isImageUrl,
  isVideoUrl,
  youtubeEmbedUrl,
  type BusinessPostType,
} from "@/lib/media/post-media";

export function PostTypeBadge({ type }: { type: BusinessPostType }) {
  const styles: Record<BusinessPostType, string> = {
    update: "bg-slate-100 text-slate-700",
    job: "bg-emerald-100 text-emerald-800",
    deal: "bg-amber-100 text-amber-800",
    video: "bg-violet-100 text-violet-800",
    help_needed: "bg-rose-100 text-rose-800",
    free: "bg-sky-100 text-sky-800",
    discussion: "bg-indigo-100 text-indigo-800",
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[type]}`}>
      {BUSINESS_POST_TYPE_LABELS[type]}
    </span>
  );
}

function DirectVideo({ url }: { url: string }) {
  const [errored, setErrored] = useState(false);
  const filename = url.split("/").pop()?.split("?")[0] ?? "video";
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  // Only declare MIME for formats Chrome natively supports.
  // For .mov / .avi / .mkv, omit type so the browser attempts playback
  // from the actual bytes rather than rejecting on the declared MIME.
  const safeMimeMap: Record<string, string> = {
    mp4: "video/mp4",
    m4v: "video/mp4",
    webm: "video/webm",
    ogv: "video/ogg",
  };
  const mimeType = safeMimeMap[ext];

  if (errored) {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-slate-50 p-4 text-sm text-muted">
        <p className="font-medium text-foreground/80">Video can&apos;t play in this browser</p>
        <div className="mt-2 flex flex-wrap gap-3 text-xs">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent hover:underline"
          >
            Open in new tab →
          </a>
          <a href={url} download={filename} className="font-medium text-accent hover:underline">
            Download video
          </a>
        </div>
        <p className="mt-2 text-xs text-muted">
          If the link shows a 403 error, the storage bucket needs to be public (Storage →
          business-media → Make public). If it opens but won&apos;t play, the video codec (e.g.
          H.265/HEVC) isn&apos;t supported in Chrome — re-export or convert it to H.264 MP4.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-black">
      <video
        controls
        playsInline
        preload="metadata"
        className="aspect-video w-full"
        onError={() => setErrored(true)}
      >
        {mimeType ? (
          <source src={url} type={mimeType} />
        ) : (
          /* No type declared — lets browser probe the actual codec */
          <source src={url} />
        )}
      </video>
    </div>
  );
}

export function PostMediaGallery({ urls }: { urls: string[] }) {
  if (!urls.length) return null;

  const images = urls.filter(isImageUrl);
  const videos = urls.filter(isVideoUrl);
  const other = urls.filter((url) => !isImageUrl(url) && !isVideoUrl(url));

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className={`grid gap-2 ${images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {images.map((url) => (
            <div key={url} className="overflow-hidden rounded-xl border border-border bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="max-h-80 w-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {videos.map((url) => {
        const embed = youtubeEmbedUrl(url);
        if (embed) {
          const autoEmbed = embed.includes("?")
            ? `${embed}&autoplay=1&mute=1`
            : `${embed}?autoplay=1&mute=1`;
          return (
            <div key={url} className="overflow-hidden rounded-xl border border-border">
              <iframe
                title="Business video"
                src={autoEmbed}
                className="aspect-video w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          );
        }

        if (isDirectVideoUrl(url)) {
          return <DirectVideo key={url} url={url} />;
        }

        return null;
      })}

      {other.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {other.map((url) => (
            <SafeExternalLink key={url} url={url} />
          ))}
        </div>
      )}
    </div>
  );
}
