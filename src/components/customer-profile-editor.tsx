"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateUserProfile } from "@/lib/actions/social";
import { IndustryPicker } from "@/components/industry-picker";
import { Card } from "@/components/ui";
import type { FeedScope, ForumCategory, UserProfile } from "@/lib/types";
import { FEED_SCOPE_LABELS } from "@/lib/feed/location-scope";
import { FORUM_CATEGORY_LABELS } from "@/lib/types";

const forumCategories: ForumCategory[] = [
  "general",
  "legal_lessons",
  "local",
  "hiring",
  "partnerships",
];

export function CustomerProfileEditor({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    displayName: profile.displayName,
    bio: profile.bio,
    city: profile.city,
    state: profile.state,
    zipCode: profile.zipCode,
    headline: profile.headline,
    skills: profile.skills.join(", "),
    isSeekingWork: profile.isSeekingWork,
    interestTags: profile.interestTags.join(", "),
    industryInterests: profile.industryInterests,
    forumInterests: profile.forumInterests,
    feedScope: profile.discoveryRadius ?? profile.feedScope,
  });

  function handleSave() {
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await updateUserProfile({
        displayName: form.displayName.trim(),
        bio: form.bio.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zipCode: form.zipCode.trim(),
        headline: form.headline.trim(),
        skills: form.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        isSeekingWork: form.isSeekingWork,
        interestTags: form.interestTags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        industryInterests: form.industryInterests,
        forumInterests: form.forumInterests,
        discoveryRadius: form.feedScope,
        feedScope: form.feedScope,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setSaved(true);
      router.refresh();
    });
  }

  function toggleForumInterest(category: ForumCategory) {
    setForm((prev) => ({
      ...prev,
      forumInterests: prev.forumInterests.includes(category)
        ? prev.forumInterests.filter((c) => c !== category)
        : [...prev.forumInterests, category],
    }));
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-semibold">About you</h2>
        <p className="mt-1 text-sm text-muted">
          Your profile appears in the directory so local businesses can discover and message you.
        </p>
        <div className="mt-4 space-y-3">
          <Field
            label="Display name"
            value={form.displayName}
            onChange={(v) => setForm({ ...form, displayName: v })}
          />
          <label className="block text-sm">
            <span className="font-medium">Bio</span>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={4}
              placeholder="Tell the community about yourself and what you're interested in locally."
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
            <Field label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
            <Field label="Zip code" value={form.zipCode} onChange={(v) => setForm({ ...form, zipCode: v })} placeholder="78701" />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">Work & skills</h2>
        <div className="mt-4 space-y-3">
          <Field
            label="Headline"
            value={form.headline}
            onChange={(v) => setForm({ ...form, headline: v })}
            placeholder="e.g. Open to local marketing projects"
          />
          <Field
            label="Skills"
            value={form.skills}
            onChange={(v) => setForm({ ...form, skills: v })}
            placeholder="Comma-separated, e.g. Social media, Events, Sales"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isSeekingWork}
              onChange={(e) => setForm({ ...form, isSeekingWork: e.target.checked })}
            />
            <span>Open to work / local opportunities</span>
          </label>
          <IndustryPicker
            selected={form.industryInterests}
            onChange={(industryInterests) => setForm({ ...form, industryInterests })}
            label="Interests"
            hint="Select all industries you care about. Matching businesses appear first in your feed."
          />
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">Forum interests</h2>
        <p className="mt-1 text-sm text-muted">Topics you want to follow in the community forum.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {forumCategories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => toggleForumInterest(category)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                form.forumInterests.includes(category)
                  ? "bg-accent text-white"
                  : "border border-border bg-card text-muted hover:text-foreground"
              }`}
            >
              {FORUM_CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">Discovery radius</h2>
        <p className="mt-1 text-sm text-muted">How far from your location BizList shows listings and feed content.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(FEED_SCOPE_LABELS) as FeedScope[]).map((scope) => (
            <button
              key={scope}
              type="button"
              onClick={() => setForm({ ...form, feedScope: scope })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                form.feedScope === scope
                  ? "bg-accent text-white"
                  : "border border-border bg-card text-muted hover:text-foreground"
              }`}
            >
              {FEED_SCOPE_LABELS[scope]}
            </button>
          ))}
        </div>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && (
        <p className="text-sm text-emerald-700">
          Profile saved.{" "}
          <Link href={`/listings/people/${profile.id}`} className="font-medium underline">
            View public profile
          </Link>
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={handleSave}
          className="min-h-11 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save changes"}
        </button>
        <Link
          href={`/listings/people/${profile.id}`}
          className="inline-flex min-h-11 items-center rounded-full border border-border px-6 py-2.5 text-sm font-medium hover:border-accent/40"
        >
          Preview profile
        </Link>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
      />
    </label>
  );
}
