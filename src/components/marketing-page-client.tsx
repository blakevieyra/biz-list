"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, formatDate } from "@/components/ui";
import {
  saveWeeklyPostSchedule,
  publishFeedPostNow,
  generatePlatinumMarketingDraft,
  createMarketingCampaign,
} from "@/lib/actions/pro";

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const POST_TYPE_LABELS: Record<string, string> = {
  update: "Business Update",
  deal: "Deal / Offer",
  job: "Hiring Post",
  video: "Video",
  help_needed: "Help Needed",
  free: "Free Offer",
  discussion: "Discussion",
};

type Schedule = {
  enabled: boolean;
  dayOfWeek: number;
  timeUtc: string;
  lastPostedAt?: string;
};

type Campaign = {
  id: string;
  title: string;
  channel: string;
  content: string;
  status: string;
  scheduled_for?: string | null;
  created_at?: string;
};

type PostHistory = {
  id: string;
  title: string;
  body: string;
  postType: string;
  createdAt: string;
};

export function MarketingPageClient({
  initialSchedule,
  campaigns,
  postHistory,
}: {
  initialSchedule: Schedule;
  campaigns: Campaign[];
  postHistory: PostHistory[];
}) {
  const router = useRouter();
  const [schedule, setSchedule] = useState<Schedule>(initialSchedule);
  const [scheduleSaved, setScheduleSaved] = useState(false);
  const [schedPending, startScheduleTransition] = useTransition();
  const [publishPending, startPublishTransition] = useTransition();
  const [draftPending, startDraftTransition] = useTransition();
  const [campaignPending, startCampaignTransition] = useTransition();
  const [publishMsg, setPublishMsg] = useState<string | null>(null);
  const [draftMsg, setDraftMsg] = useState<string | null>(null);
  const [campaignMsg, setCampaignMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Campaign form
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState("social");
  const [content, setContent] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");

  function saveSchedule() {
    setError(null);
    setScheduleSaved(false);
    startScheduleTransition(async () => {
      const result = await saveWeeklyPostSchedule({
        enabled: schedule.enabled,
        dayOfWeek: schedule.dayOfWeek,
        timeUtc: schedule.timeUtc,
      });
      if (result.error) { setError(result.error); return; }
      setScheduleSaved(true);
      router.refresh();
    });
  }

  function publishNow() {
    setError(null);
    setPublishMsg(null);
    startPublishTransition(async () => {
      const result = await publishFeedPostNow();
      if (result.error) { setError(result.error); return; }
      setPublishMsg(result.message ?? "Post published!");
      router.refresh();
    });
  }

  function generateDraft() {
    setError(null);
    setDraftMsg(null);
    startDraftTransition(async () => {
      const result = await generatePlatinumMarketingDraft("email");
      if (result.error) { setError(result.error); return; }
      setDraftMsg(result.message ?? "Draft created!");
      router.refresh();
    });
  }

  function saveCampaign(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCampaignMsg(null);
    startCampaignTransition(async () => {
      const result = await createMarketingCampaign({
        title,
        channel,
        content,
        scheduledFor: scheduledFor || undefined,
      });
      if (result.error) { setError(result.error); return; }
      setTitle(""); setContent(""); setScheduledFor("");
      setCampaignMsg("Campaign saved.");
      router.refresh();
    });
  }

  const nextRunLabel = (() => {
    if (!schedule.enabled) return null;
    const dayName = DAYS.find((d) => d.value === schedule.dayOfWeek)?.label ?? "Monday";
    const [h, m] = schedule.timeUtc.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = ((h % 12) || 12);
    return `Every ${dayName} at ${h12}:${String(m).padStart(2, "0")} ${ampm} UTC`;
  })();

  return (
    <div className="space-y-8">

      {/* ── Weekly Feed Post Automation ───────────────────────── */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Weekly Feed Posts</h2>
            <p className="mt-1 text-sm text-muted">
              AI generates a fresh post every week about your services, deals, or updates — and publishes it
              directly to your BizList feed so customers always see new content.
            </p>
          </div>
          {/* Enable/disable toggle */}
          <button
            type="button"
            onClick={() => setSchedule((s) => ({ ...s, enabled: !s.enabled }))}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${schedule.enabled ? "bg-accent" : "bg-slate-200"}`}
            role="switch"
            aria-checked={schedule.enabled}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${schedule.enabled ? "translate-x-5" : "translate-x-0"}`}
            />
          </button>
        </div>

        {/* What gets posted */}
        <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">What the AI generates each week:</p>
          <ul className="mt-2 space-y-1 text-muted">
            <li>• <strong>Week 1:</strong> Service spotlight — highlights one offering with a call to action</li>
            <li>• <strong>Week 2:</strong> Deal or seasonal offer — tailored to your category</li>
            <li>• <strong>Week 3:</strong> Business update or tip — builds trust with your audience</li>
            <li>• <strong>Week 4:</strong> Hiring post (if active) or community post</li>
          </ul>
          <p className="mt-2 text-xs text-muted">Posts rotate through types automatically. You can also publish manually anytime below.</p>
        </div>

        {/* Schedule picker */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium">Day of week</span>
            <select
              value={schedule.dayOfWeek}
              onChange={(e) => setSchedule((s) => ({ ...s, dayOfWeek: Number(e.target.value) }))}
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
            >
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Time (UTC)</span>
            <input
              type="time"
              value={schedule.timeUtc}
              onChange={(e) => setSchedule((s) => ({ ...s, timeUtc: e.target.value }))}
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </label>
        </div>

        {nextRunLabel && (
          <p className="mt-3 text-xs font-medium text-emerald-700">
            ✓ Scheduled: {nextRunLabel}
          </p>
        )}
        {schedule.lastPostedAt && (
          <p className="mt-1 text-xs text-muted">
            Last auto-post: {formatDate(schedule.lastPostedAt)}
          </p>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {scheduleSaved && <p className="mt-2 text-sm text-emerald-700">Schedule saved!</p>}

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={schedPending}
            onClick={saveSchedule}
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {schedPending ? "Saving…" : "Save schedule"}
          </button>
          <button
            type="button"
            disabled={publishPending}
            onClick={publishNow}
            className="rounded-full border border-border px-5 py-2 text-sm font-medium hover:border-accent/40 disabled:opacity-50"
          >
            {publishPending ? "Publishing…" : "Publish a post now"}
          </button>
        </div>
        {publishMsg && (
          <p className="mt-2 text-sm font-medium text-emerald-700">{publishMsg}</p>
        )}
      </Card>

      {/* ── Recent auto-published posts ───────────────────────── */}
      {postHistory.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">Recent feed posts</h2>
          <div className="space-y-3">
            {postHistory.map((post) => (
              <Card key={post.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{post.title}</p>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-accent">
                        {POST_TYPE_LABELS[post.postType] ?? post.postType}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{post.body}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted">{formatDate(post.createdAt)}</span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ── Campaign drafts ───────────────────────────────────── */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Campaigns & drafts</h2>
          <button
            type="button"
            disabled={draftPending}
            onClick={generateDraft}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:border-accent/40 disabled:opacity-50"
          >
            {draftPending ? "Generating…" : "AI-generate email draft"}
          </button>
        </div>
        {draftMsg && <p className="mb-3 text-sm text-emerald-700">{draftMsg}</p>}

        {/* Campaign creator */}
        <Card>
          <h3 className="font-medium">Create campaign</h3>
          <form onSubmit={saveCampaign} className="mt-3 space-y-3">
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Campaign title"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="social">Social post</option>
              <option value="email">Email</option>
              <option value="local">Local promotion</option>
            </select>
            <textarea
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="Write your campaign message — or use the AI button above to generate one."
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Schedule for (optional)</label>
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            {campaignMsg && <p className="text-sm text-emerald-700">{campaignMsg}</p>}
            <button
              type="submit"
              disabled={campaignPending}
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {campaignPending ? "Saving…" : "Save campaign"}
            </button>
          </form>
        </Card>

        {/* Existing campaigns */}
        {campaigns.length > 0 && (
          <div className="mt-4 space-y-3">
            {campaigns.map((c) => (
              <Card key={c.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{c.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.status === "sent"
                          ? "bg-emerald-100 text-emerald-800"
                          : c.status === "scheduled"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-600"
                      }`}>
                        {c.status}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-muted capitalize">
                        {c.channel}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{c.content}</p>
                    {c.scheduled_for && (
                      <p className="mt-1 text-xs text-muted">Scheduled: {formatDate(c.scheduled_for)}</p>
                    )}
                  </div>
                  {c.created_at && (
                    <span className="shrink-0 text-xs text-muted">{formatDate(c.created_at)}</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {campaigns.length === 0 && (
          <Card className="mt-3">
            <p className="text-sm text-muted">No campaigns yet — save one above or use the AI generate button.</p>
          </Card>
        )}
      </section>
    </div>
  );
}
