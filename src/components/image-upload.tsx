"use client";

import { useRef, useState, useTransition } from "react";
import { uploadBusinessImage, uploadBusinessMedia } from "@/lib/actions/upload";
import { isDirectVideoUrl } from "@/lib/media/post-media";

export function ImageUpload({
  label,
  hint,
  onUploaded,
  existingUrls = [],
  acceptVideo = false,
}: {
  label: string;
  hint?: string;
  onUploaded: (urls: string[]) => void;
  existingUrls?: string[];
  acceptVideo?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [urls, setUrls] = useState(existingUrls);

  function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);

    startTransition(async () => {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.set("file", file);
        const result = acceptVideo
          ? await uploadBusinessMedia(formData)
          : await uploadBusinessImage(formData);
        if (result.error) {
          setError(result.error);
          return;
        }
        if (result.url) uploaded.push(result.url);
      }
      const next = [...urls, ...uploaded];
      setUrls(next);
      onUploaded(next);
    });
  }

  function removeUrl(url: string) {
    const next = urls.filter((u) => u !== url);
    setUrls(next);
    onUploaded(next);
  }

  const accept = acceptVideo
    ? "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
    : "image/jpeg,image/png,image/webp,image/gif";

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </div>

      {urls.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {urls.map((url) => (
            <div key={url} className="relative overflow-hidden rounded-xl border border-border bg-slate-100">
              {isDirectVideoUrl(url) ? (
                <div className="flex aspect-square w-full flex-col items-center justify-center gap-1 bg-slate-800 text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 opacity-80" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span className="px-2 text-center text-xs opacity-70">Video uploaded</span>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="aspect-square w-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => removeUrl(url)}
                className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <button
        type="button"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        className="min-h-11 rounded-full border border-dashed border-border px-4 py-2 text-sm font-medium hover:border-accent/40 disabled:opacity-50"
      >
        {pending
          ? "Uploading..."
          : urls.length
            ? acceptVideo ? "Add more photos or video" : "Add more photos"
            : acceptVideo ? "Upload photo or video" : "Upload photos"}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
