"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createBusinessPost } from "@/lib/actions/business";
import { ImageUpload } from "@/components/image-upload";
import {
  BUSINESS_POST_TYPE_HINTS,
  BUSINESS_POST_TYPE_LABELS,
} from "@/lib/media/post-media";
import type { BusinessPostType } from "@/lib/types";

const postTypes: BusinessPostType[] = ["update", "job", "deal", "video"];

export function BusinessPostComposer({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [postType, setPostType] = useState<BusinessPostType>("update");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();

    const urls = [...mediaUrls];
    if (postType === "video" && videoUrl.trim()) {
      urls.unshift(videoUrl.trim());
    }

    startTransition(async () => {
      const result = await createBusinessPost({
        businessId,
        postType,
        title,
        body,
        mediaUrls: urls,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      form.reset();
      setMediaUrls([]);
      setVideoUrl("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-sm font-medium">Post type</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {postTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setPostType(type)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                postType === type
                  ? "bg-accent text-white"
                  : "border border-border bg-card text-muted hover:text-foreground"
              }`}
            >
              {BUSINESS_POST_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted">{BUSINESS_POST_TYPE_HINTS[postType]}</p>
      </div>

      <input type="hidden" name="postType" value={postType} />

      <label className="block text-sm">
        Headline
        <input
          name="title"
          required
          maxLength={200}
          placeholder={
            postType === "job"
              ? "e.g. Now hiring barista — part time"
              : postType === "deal"
                ? "e.g. 20% off all services this week"
                : postType === "video"
                  ? "e.g. Tour our new storefront"
                  : "What's new at your business?"
          }
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm">
        Details
        <textarea
          name="body"
          required
          rows={5}
          maxLength={5000}
          placeholder="Tell customers what you're offering, when it runs, and how to respond."
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
        />
      </label>

      {postType === "video" ? (
        <label className="block text-sm">
          Video link
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="YouTube, Vimeo, or direct .mp4 link"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-xs text-muted">
            Paste a YouTube/Vimeo URL or upload a video file below.
          </span>
        </label>
      ) : null}

      <ImageUpload
        label={postType === "video" ? "Upload video or thumbnail" : "Photos"}
        hint={
          postType === "video"
            ? "Upload MP4/WebM clips or a cover image for your video post."
            : "Add product shots, flyers, or team photos. Images appear in the feed."
        }
        existingUrls={mediaUrls}
        onUploaded={setMediaUrls}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
      >
        {pending ? "Publishing…" : "Publish to feed"}
      </button>
    </form>
  );
}
