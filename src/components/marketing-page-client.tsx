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

const TOPIC_OPTIONS = [
  { value: "social", label: "Social post" },
  { value: "product", label: "Product spotlight" },
  { value: "service", label: "Service highlight" },
  { value: "deal", label: "Deal / offer" },
  { value: "event", label: "Event promotion" },
  { value: "update", label: "Business update" },
  { value: "hiring", label: "Hiring post" },
  { value: "email", label: "Email campaign" },
  { value: "local", label: "Local promotion" },
  { value: "seasonal", label: "Seasonal content" },
];

type CalendarSlot = {
  id: string;
  date: string;
  topic: string;
  content: string;
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

function newSlot(): CalendarSlot {
  return { id: Math.random().toString(36).slice(2), date: "", topic: "social", content: "" };
}

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
  const [calendarPending, startCalendarTransition] = useTransition();
  const [publishMsg, setPublishMsg] = useState<string | null>(null);
  const [draftMsg, setDraftMsg] = useState<string | null>(null);
  const [calendarMsg, setCalendarMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Monthly content calendar
  const [calendarTitle, setCalendarTitle] = useState("");
  const [slots, setSlots] = useState<CalendarSlot[]>([newSlot()]);

  function updateSlot(id: string, field: keyof CalendarSlot, value: string) {
    setSlots((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s));
  }

  function removeSlot(id: string) {
    setSlots((prev) => prev.length > 1 ? prev.filter((s) => s.id !== id) : prev);
  }

  function saveCalendar(e: React.FormEvent) {
    e.preventDefault();
    if (!calendarTitle.trim()) return;
    const filled = slots.filter((s) => s.content.trim());
    if (!filled.length) return;
    setError(null);
    setCalendarMsg(null);
    startCalendarTransition(async () => {
      for (const slot of filled) {
        const result = await createMarketingCampaign({
          title: `${calendarTitle} — ${TOPIC_OPTIONS.find((t) => t.value === slot.topic)?.label ?? slot.topic}`,
          channel: slot.topic,
          content: slot.content,
          scheduledFor: slot.date || undefined,
        });
        if (result.error) { setError(result.error); return; }
      }
      setCalendarTitle("");
      setSlots([newSlot()]);
      setCalendarMsg(`${filled.length} post${filled.length > 1 ? "s" : ""} saved to calendar.`);
      router.refresh();
    });
  }

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

      {/* ── Monthly Content Calendar ──────────────────────────── */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Campaigns & content calendar</h2>
            <p className="mt-0.5 text-xs text-muted">Plan multiple posts throughout the month — different dates, topics, and content in one go.</p>
          </div>
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

        <Card>
          <h3 className="font-medium">Monthly content planner</h3>
          <p className="mt-1 text-xs text-muted">Add as many scheduled posts as you want — product info, offers, events, services — all in one campaign.</p>

          <form onSubmit={saveCalendar} className="mt-4 space-y-4">
            <input
              required
              value={calendarTitle}
              onChange={(e) => setCalendarTitle(e.target.value)}
              placeholder="Campaign name (e.g. July Promotions)"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />

            {/* Slot list */}
            <div className="space-y-3">
              {slots.map((slot, i) => (
                <div key={slot.id} className="rounded-xl border border-border bg-slate-50/60 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-muted uppercase tracking-wide">Post {i + 1}</span>
                    {slots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSlot(slot.id)}
                        className="text-xs text-muted hover:text-red-500"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Scheduled date (optional)</label>
                      <input
                        type="datetime-local"
                        value={slot.date}
                        onChange={(e) => updateSlot(slot.id, "date", e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Topic / type</label>
                      <select
                        value={slot.topic}
                        onChange={(e) => updateSlot(slot.id, "topic", e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                      >
                        {TOPIC_OPTIONS.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    value={slot.content}
                    onChange={(e) => updateSlot(slot.id, "content", e.target.value)}
                    placeholder={
                      slot.topic === "product" ? "Highlight a specific product — what it is, who it's for, and why they should try it…"
                      : slot.topic === "service" ? "Describe a service offering — what's included, pricing, availability…"
                      : slot.topic === "deal" ? "Describe your deal or offer — discount, limited time, promo code…"
                      : slot.topic === "event" ? "Share event details — name, date, location, what to expect…"
                      : slot.topic === "email" ? "Write your email campaign message…"
                      : "Write your post content…"
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSlots((prev) => [...prev, newSlot()])}
              className="w-full rounded-xl border border-dashed border-border py-2 text-sm text-muted hover:border-accent hover:text-accent transition-colors"
            >
              + Add another post
            </button>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {calendarMsg && <p className="text-sm text-emerald-700">{calendarMsg}</p>}

            <button
              type="submit"
              disabled={calendarPending}
              className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {calendarPending ? "Saving…" : `Save ${slots.filter((s) => s.content.trim()).length || ""} post${slots.filter((s) => s.content.trim()).length !== 1 ? "s" : ""} to calendar`}
            </button>
          </form>
        </Card>

        {/* Existing campaigns */}
        {campaigns.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-muted">Saved campaigns</h3>
            <div className="space-y-3">
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
                          {TOPIC_OPTIONS.find((t) => t.value === c.channel)?.label ?? c.channel}
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
          </div>
        )}

        {campaigns.length === 0 && (
          <Card className="mt-3">
            <p className="text-sm text-muted">No campaigns yet — add posts above or use the AI generate button.</p>
          </Card>
        )}
      </section>

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
    </div>
  );
}
