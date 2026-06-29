"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateProfilePreferences } from "@/lib/actions/social";
import { uploadResumeFile } from "@/lib/actions/upload";
import { IndustryPicker } from "@/components/industry-picker";
import { JobTitlePicker } from "@/components/job-title-picker";
import { Card } from "@/components/ui";
import type { DiscoveryRadius, FollowDigestFrequency, UserProfile } from "@/lib/types";
import { BIZLIST_PLUS_LABEL } from "@/lib/plans";
import { buildResumeSnapshot } from "@/lib/resume";
import {
  AREA_SCOPE_LABELS,
  AREA_SCOPE_OPTIONS,
  MILE_RADIUS_LABELS,
  MILE_RADIUS_OPTIONS,
} from "@/lib/feed/location-scope";

const digestOptions: { value: FollowDigestFrequency; label: string }[] = [
  { value: "none", label: "Off" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const CUSTOMER_TABS = [
  { id: "general", label: "General" },
  { id: "jobs", label: "Jobs" },
] as const;

type CustomerTab = (typeof CUSTOMER_TABS)[number]["id"];

export function ProfilePreferencesPanel({
  profile,
  variant = "full",
}: {
  profile: UserProfile;
  /** Lighter layout for business Pro/Platinum — alerts and matching without resume builder. */
  variant?: "full" | "BizList-plus";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<CustomerTab>("general");
  const [form, setForm] = useState({
    followDigestFrequency: profile.followDigestFrequency,
    jobAlertOptIn: profile.jobAlertOptIn,
    isSeekingWork: profile.isSeekingWork,
    experienceText: profile.experienceText,
    resumeText: profile.resumeText,
    targetJobTitles: profile.targetJobTitles,
    industryInterests: profile.industryInterests,
    headline: profile.headline,
    skills: profile.skills.join(", "),
    resumeUrl: profile.resumeUrl ?? "",
    zipCode: profile.zipCode ?? "",
    discoveryRadius: (profile.discoveryRadius ?? "nation") as DiscoveryRadius,
  });

  const previewResume = buildResumeSnapshot({
    ...profile,
    ...form,
    skills: form.skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  });

  const isBizListPlusVariant = variant === "BizList-plus";

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateProfilePreferences({
        followDigestFrequency: form.followDigestFrequency,
        jobAlertOptIn: form.jobAlertOptIn,
        isSeekingWork: form.isSeekingWork,
        experienceText: form.experienceText,
        resumeText: form.resumeText,
        resumeUrl: form.resumeUrl || undefined,
        targetJobTitles: form.targetJobTitles,
        industryInterests: form.industryInterests,
        headline: form.headline,
        skills: form.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        zipCode: form.zipCode || undefined,
        discoveryRadius: form.discoveryRadius,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  // Business / org variant — simple single-card layout
  if (isBizListPlusVariant) {
    return (
      <div className="space-y-6">
        <Card>
          <h2 className="font-semibold">{BIZLIST_PLUS_LABEL} alert preferences</h2>
          <p className="mt-1 text-sm text-muted">
            Included with your Pro or Platinum plan. Choose what you want notified about from
            businesses you follow and local matches.
          </p>
        </Card>

        <Card>
          <h2 className="font-semibold">Discovery defaults</h2>
          <p className="mt-1 text-sm text-muted">
            Sets the default location and radius used on Feed, Listings, Events, and all discovery pages.
          </p>
          <div className="mt-4 space-y-4">
            <label className="block text-sm">
              <span className="font-medium">Your zip code</span>
              <input
                value={form.zipCode}
                onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                placeholder="e.g. 78701"
                maxLength={10}
                className="mt-1 w-48 rounded-lg border border-border px-3 py-2 text-sm"
              />
            </label>
            <div>
              <p className="text-sm font-medium">Default radius</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="self-center text-xs font-semibold uppercase tracking-wide text-muted">Distance</span>
                {MILE_RADIUS_OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForm({ ...form, discoveryRadius: m })}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                      form.discoveryRadius === m
                        ? "bg-accent text-white"
                        : "border border-border bg-card text-muted hover:text-foreground"
                    }`}
                  >
                    {MILE_RADIUS_LABELS[m]}
                  </button>
                ))}
                <span className="self-center text-xs text-border">|</span>
                <span className="self-center text-xs font-semibold uppercase tracking-wide text-muted">Area</span>
                {AREA_SCOPE_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, discoveryRadius: s })}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                      form.discoveryRadius === s
                        ? "bg-accent text-white"
                        : "border border-border bg-card text-muted hover:text-foreground"
                    }`}
                  >
                    {AREA_SCOPE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">Follow digest emails</h2>
          <p className="mt-1 text-sm text-muted">
            Get an email summary of new posts from businesses you follow.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {digestOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setForm({ ...form, followDigestFrequency: option.value })}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  form.followDigestFrequency === option.value
                    ? "bg-accent text-white"
                    : "border border-border bg-card text-muted hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-emerald-700">Preferences saved.</p>}

        <button
          type="button"
          disabled={pending}
          onClick={handleSave}
          className="min-h-11 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save preferences"}
        </button>
      </div>
    );
  }

  // Customer profile — tabbed layout
  return (
    <div className="space-y-6">
      {/* Tab nav */}
      <div className="flex gap-1 rounded-xl border border-border bg-slate-50 p-1">
        {CUSTOMER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "general" && (
        <>
          <Card>
            <h2 className="font-semibold">Discovery defaults</h2>
            <p className="mt-1 text-sm text-muted">
              Sets the default location and radius used on Feed, Listings, Events, and all discovery pages.
            </p>
            <div className="mt-4 space-y-4">
              <label className="block text-sm">
                <span className="font-medium">Your zip code</span>
                <input
                  value={form.zipCode}
                  onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                  placeholder="e.g. 78701"
                  maxLength={10}
                  className="mt-1 w-48 rounded-lg border border-border px-3 py-2 text-sm"
                />
              </label>
              <div>
                <p className="text-sm font-medium">Default radius</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="self-center text-xs font-semibold uppercase tracking-wide text-muted">Distance</span>
                  {MILE_RADIUS_OPTIONS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setForm({ ...form, discoveryRadius: m })}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                        form.discoveryRadius === m
                          ? "bg-accent text-white"
                          : "border border-border bg-card text-muted hover:text-foreground"
                      }`}
                    >
                      {MILE_RADIUS_LABELS[m]}
                    </button>
                  ))}
                  <span className="self-center text-xs text-border">|</span>
                  <span className="self-center text-xs font-semibold uppercase tracking-wide text-muted">Area</span>
                  {AREA_SCOPE_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm({ ...form, discoveryRadius: s })}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                        form.discoveryRadius === s
                          ? "bg-accent text-white"
                          : "border border-border bg-card text-muted hover:text-foreground"
                      }`}
                    >
                      {AREA_SCOPE_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="font-semibold">Follow digest emails</h2>
            <p className="mt-1 text-sm text-muted">
              Get an email summary of new posts from businesses you follow. Available for customers
              and business accounts.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {digestOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setForm({ ...form, followDigestFrequency: option.value })}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    form.followDigestFrequency === option.value
                      ? "bg-accent text-white"
                      : "border border-border bg-card text-muted hover:text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </Card>
        </>
      )}

      {activeTab === "jobs" && (
        <Card>
          <h2 className="font-semibold">Job seeker profile</h2>
          <p className="mt-1 text-sm text-muted">
            Build a reusable resume and opt into job alerts by industry and role.
          </p>
          <div className="mt-4 space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isSeekingWork}
                onChange={(e) => setForm({ ...form, isSeekingWork: e.target.checked })}
              />
              <span>I&apos;m looking for local work</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.jobAlertOptIn}
                onChange={(e) => setForm({ ...form, jobAlertOptIn: e.target.checked })}
              />
              <span>Email me when followed businesses post jobs in my industries</span>
            </label>
            <label className="block text-sm">
              <span className="font-medium">Headline</span>
              <input
                value={form.headline}
                onChange={(e) => setForm({ ...form, headline: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                placeholder="e.g. Open to part-time bakery roles"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Skills</span>
              <input
                value={form.skills}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                placeholder="Comma-separated skills"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Experience</span>
              <textarea
                value={form.experienceText}
                onChange={(e) => setForm({ ...form, experienceText: e.target.value })}
                rows={4}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                placeholder="Summarize your work history and availability."
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Resume (optional override)</span>
              <textarea
                value={form.resumeText}
                onChange={(e) => setForm({ ...form, resumeText: e.target.value })}
                rows={6}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                placeholder="Leave blank to auto-build from the fields above."
              />
            </label>
            <div className="text-sm">
              <span className="font-medium">Attach resume file</span>
              <p className="mt-0.5 text-xs text-muted">PDF, Word (.docx), or plain text · max 10 MB</p>
              {form.resumeUrl && (
                <div className="mt-2 flex items-center gap-3">
                  <a
                    href={form.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    View attached resume →
                  </a>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, resumeUrl: "" })}
                    className="text-xs text-muted hover:text-red-500"
                  >
                    Remove
                  </button>
                </div>
              )}
              <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-medium hover:border-accent/40">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  className="sr-only"
                  disabled={resumeUploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setResumeError(null);
                    setResumeUploading(true);
                    const fd = new FormData();
                    fd.append("file", file);
                    const result = await uploadResumeFile(fd);
                    setResumeUploading(false);
                    if (result.error) {
                      setResumeError(result.error);
                    } else if (result.url) {
                      setForm((f) => ({ ...f, resumeUrl: result.url! }));
                    }
                  }}
                />
                {resumeUploading ? "Uploading…" : form.resumeUrl ? "Replace file" : "Choose file"}
              </label>
              {resumeError && <p className="mt-1 text-xs text-red-600">{resumeError}</p>}
            </div>
            <JobTitlePicker
              selected={form.targetJobTitles}
              onChange={(targetJobTitles) => setForm({ ...form, targetJobTitles })}
              hint="Pick up to 8 roles you want to be considered for."
            />
            <IndustryPicker
              selected={form.industryInterests}
              onChange={(industryInterests) => setForm({ ...form, industryInterests })}
              label="Target industries"
              hint="Used for job alerts, deal alerts, and discovery."
            />
            <div>
              <p className="text-sm font-medium">Resume preview (sent with applications)</p>
              <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-border bg-slate-50 p-3 text-xs leading-relaxed text-muted">
                {previewResume}
              </pre>
            </div>
          </div>
        </Card>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-emerald-700">Preferences saved.</p>}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={handleSave}
          className="min-h-11 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save preferences"}
        </button>
        <Link
          href="/profile/edit"
          className="inline-flex min-h-11 items-center rounded-full border border-border px-6 py-2.5 text-sm font-medium hover:border-accent/40"
        >
          Edit public profile
        </Link>
      </div>
    </div>
  );
}
