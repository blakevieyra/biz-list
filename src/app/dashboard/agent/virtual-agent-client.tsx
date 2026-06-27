"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleVirtualAgent, virtualAgentReply, saveAgentInstructions } from "@/lib/actions/pro";
import { Card, PageHeader } from "@/components/ui";

type Tab = "setup" | "preview" | "activity";

type TopicRule = { topic: string; response: string };

function ProfileField({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 text-sm">
      <span className="w-28 shrink-0 font-medium text-foreground/70">{label}</span>
      <span className="text-muted">{value}</span>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-2xl font-bold text-accent">{value}</p>
      <p className="mt-0.5 text-sm font-medium">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

function profileCompleteness(fields: Record<string, string | boolean>): number {
  const checks = [
    !!fields.businessName && (fields.businessName as string) !== "Your business",
    !!fields.tagline,
    !!fields.description,
    !!fields.city,
    !!fields.hours,
    !!fields.phone,
    !!fields.services && (fields.services as string) !== "our services",
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default function VirtualAgentClient({
  businessName = "Your business",
  category = "local services",
  services = "our services",
  serviceObjects = [],
  tagline = "",
  description = "",
  city = "",
  state = "",
  phone = "",
  hours = "",
  website = "",
  importantInfo = "",
  isHiring = false,
  agentEnabled = false,
  agentInstructions: initialInstructions = "",
  agentTopicRules: initialRules = [],
  totalConversations = 0,
  recentQuestions = [],
}: {
  businessName?: string;
  category?: string;
  services?: string;
  serviceObjects?: { name: string; description?: string; price?: string }[];
  tagline?: string;
  description?: string;
  city?: string;
  state?: string;
  phone?: string;
  hours?: string;
  website?: string;
  importantInfo?: string;
  isHiring?: boolean;
  agentEnabled?: boolean;
  agentInstructions?: string;
  agentTopicRules?: TopicRule[];
  totalConversations?: number;
  recentQuestions?: { customerName: string; question: string; createdAt: string }[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("setup");
  const [enabled, setEnabled] = useState(agentEnabled);
  const [togglePending, startToggleTransition] = useTransition();
  const [chatPending, startChatTransition] = useTransition();
  const [savePending, startSaveTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "agent"; text: string }[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [instructions, setInstructions] = useState(initialInstructions);
  const [topicRules, setTopicRules] = useState<TopicRule[]>(initialRules);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [newResponse, setNewResponse] = useState("");

  const completeness = profileCompleteness({ businessName, tagline, description, city, hours, phone, services });

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setMessage("");
    startChatTransition(async () => {
      setChatError(null);
      const result = await virtualAgentReply({
        businessName,
        category,
        services,
        serviceObjects: serviceObjects.length ? serviceObjects : undefined,
        message: text,
        tagline,
        description,
        city,
        state,
        phone,
        hours,
        website,
        importantInfo,
        isHiring,
        agentInstructions: instructions,
        agentTopicRules: topicRules,
      });
      if (result.error) { setChatError(result.error); return; }
      if (result.reply) {
        setMessages((prev) => [...prev, { role: "agent", text: result.reply! }]);
      }
    });
  }

  function handleToggle() {
    startToggleTransition(async () => {
      setToggleError(null);
      const result = await toggleVirtualAgent(!enabled);
      if (result.error) { setToggleError(result.error); return; }
      setEnabled(!enabled);
      router.refresh();
    });
  }

  function addTopicRule() {
    if (!newTopic.trim() || !newResponse.trim()) return;
    setTopicRules((prev) => [...prev, { topic: newTopic.trim(), response: newResponse.trim() }]);
    setNewTopic("");
    setNewResponse("");
  }

  function removeTopicRule(index: number) {
    setTopicRules((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    startSaveTransition(async () => {
      setSaveError(null);
      setSaveSuccess(false);
      const result = await saveAgentInstructions({ instructions, topicRules });
      if (result.error) { setSaveError(result.error); return; }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    });
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "setup", label: "Training & Setup" },
    { id: "preview", label: "Chat Preview" },
    { id: "activity", label: "Activity" },
  ];

  return (
    <>
      <PageHeader
        title="Virtual Agent"
        description="Customize how your AI agent responds to customers, preview it live, and track its activity."
      />

      {/* Toggle card */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Listing chat assistant</p>
            <p className="mt-1 text-sm text-muted">
              {enabled
                ? "Active on your public listing and in message auto-replies."
                : "Off — customers won't see the chat widget on your listing."}
            </p>
          </div>
          <button
            type="button"
            disabled={togglePending}
            onClick={handleToggle}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              enabled
                ? "border border-emerald-300 bg-emerald-50 text-emerald-800"
                : "bg-accent text-white hover:bg-accent-hover"
            }`}
          >
            {togglePending ? "Saving..." : enabled ? "Agent on" : "Turn agent on"}
          </button>
        </div>
        {toggleError && <p className="mt-2 text-sm text-red-600">{toggleError}</p>}
      </Card>

      {/* Tab nav */}
      <div className="mb-4 flex gap-1 rounded-xl border border-border bg-card p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "bg-accent text-white shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Training & Setup ── */}
      {tab === "setup" && (
        <div className="space-y-4">
          {/* Profile knowledge */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold">What your agent knows</p>
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${completeness}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-muted">{completeness}% complete</span>
              </div>
            </div>
            <p className="mb-3 text-xs text-muted">
              This profile data is automatically used to train your agent. Keep it up to date in your{" "}
              <Link href="/dashboard/profile" className="text-accent hover:underline">
                business profile
              </Link>
              .
            </p>
            <div className="space-y-2 rounded-xl bg-slate-50 p-4">
              <ProfileField label="Business" value={businessName} />
              <ProfileField label="Category" value={category} />
              <ProfileField label="Location" value={[city, state].filter(Boolean).join(", ")} />
              <ProfileField label="Tagline" value={tagline} />
              <ProfileField label="About" value={description.slice(0, 120) + (description.length > 120 ? "…" : "")} />
              <ProfileField label="Hours" value={hours} />
              <ProfileField label="Phone" value={phone} />
              <ProfileField label="Website" value={website} />
              <ProfileField label="Services" value={services} />
              <ProfileField label="Hiring" value={isHiring ? "Yes — actively hiring" : ""} />
              <ProfileField label="Important info" value={importantInfo} />
            </div>
          </Card>

          {/* Custom instructions */}
          <Card>
            <p className="mb-1 font-semibold">Custom agent instructions</p>
            <p className="mb-3 text-xs text-muted">
              Write free-form guidance for how the agent should handle customers — tone, promotions,
              what to avoid, how to close a sale, etc.
            </p>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={5}
              placeholder={`Examples:\n• Always mention our Monday discount when asked about pricing.\n• Keep replies under 3 sentences.\n• If someone asks about competitors, redirect to our strengths.\n• End every reply with an invitation to call or visit.`}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring"
            />
          </Card>

          {/* Per-topic response rules */}
          <Card>
            <p className="mb-1 font-semibold">Desired response actions</p>
            <p className="mb-3 text-xs text-muted">
              Set specific replies for common topics. When a customer asks about a topic, the agent
              uses your script as the core of its reply.
            </p>
            <div className="space-y-2">
              {topicRules.map((rule, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-border bg-slate-50/80 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-accent">{rule.topic}</p>
                    <p className="mt-0.5 text-xs text-muted">{rule.response}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTopicRule(i)}
                    className="shrink-0 text-xs text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 space-y-2 rounded-xl border border-dashed border-border p-3">
              <p className="text-xs font-medium text-muted">Add a topic rule</p>
              <input
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder='Topic (e.g. "pricing", "delivery", "booking")'
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <textarea
                value={newResponse}
                onChange={(e) => setNewResponse(e.target.value)}
                rows={2}
                placeholder="What the agent should say when this topic comes up…"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={addTopicRule}
                disabled={!newTopic.trim() || !newResponse.trim()}
                className="rounded-full border border-accent px-4 py-1.5 text-sm font-medium text-accent hover:bg-accent/10 disabled:opacity-40"
              >
                + Add rule
              </button>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                disabled={savePending}
                onClick={handleSave}
                className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {savePending ? "Saving…" : "Save instructions"}
              </button>
              {saveSuccess && <p className="text-sm text-emerald-600">Saved!</p>}
              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            </div>
          </Card>
        </div>
      )}

      {/* ── Tab: Chat Preview ── */}
      {tab === "preview" && (
        <Card>
          <div className="mb-4 rounded-xl bg-teal-50 p-4 text-sm">
            Preview for <strong>{businessName}</strong> — same logic used on your listing
            {enabled ? " (live now)" : ""}. Test how customers experience your agent.
          </div>

          <div className="max-h-96 space-y-3 overflow-y-auto rounded-xl border border-border p-4">
            {messages.length === 0 && (
              <p className="text-sm text-muted">
                Try: &quot;What are your hours?&quot; · &quot;Are you hiring?&quot; · &quot;How do I
                book?&quot;
              </p>
            )}
            {messages.map((entry, index) => (
              <div
                key={index}
                className={`rounded-lg px-3 py-2 text-sm ${
                  entry.role === "user" ? "ml-8 bg-accent text-white" : "mr-8 bg-slate-100"
                }`}
              >
                {entry.text}
              </div>
            ))}
          </div>

          <form onSubmit={sendMessage} className="mt-4 flex gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask as a customer would…"
              className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={chatPending}
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              Send
            </button>
          </form>
          {chatError && <p className="mt-2 text-sm text-red-600">{chatError}</p>}
        </Card>
      )}

      {/* ── Tab: Activity ── */}
      {tab === "activity" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard
              label="Auto-replies sent"
              value={totalConversations}
              sub="via message inbox"
            />
            <StatCard
              label="Agent status"
              value={enabled ? "Live" : "Off"}
              sub={enabled ? "Active on listing" : "Not visible to customers"}
            />
            <StatCard
              label="Profile completeness"
              value={`${completeness}%`}
              sub="Higher = better replies"
            />
          </div>

          <Card>
            <p className="mb-3 font-semibold">Recent customer questions</p>
            {recentQuestions.length === 0 ? (
              <div className="rounded-xl bg-slate-50 px-4 py-8 text-center">
                <p className="text-sm text-muted">No conversations yet.</p>
                <p className="mt-1 text-xs text-muted">
                  Turn on the agent and share your listing to start getting questions.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {recentQuestions.map((q, i) => (
                  <li key={i} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold">{q.customerName}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted">{q.question}</p>
                      </div>
                      <p className="shrink-0 text-[11px] text-muted">
                        {new Date(q.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <p className="mb-3 font-semibold">Tips to improve agent performance</p>
            <ul className="space-y-2 text-sm text-muted">
              {completeness < 80 && (
                <li className="flex gap-2">
                  <span className="text-amber-500">●</span>
                  <Link href="/dashboard/profile" className="text-accent hover:underline">
                    Complete your business profile
                  </Link>{" "}
                  — currently {completeness}% filled in.
                </li>
              )}
              {!hours && (
                <li className="flex gap-2">
                  <span className="text-amber-500">●</span>
                  Add your business hours so the agent can answer hours questions accurately.
                </li>
              )}
              {topicRules.length === 0 && (
                <li className="flex gap-2">
                  <span className="text-amber-500">●</span>
                  Add{" "}
                  <button
                    type="button"
                    onClick={() => setTab("setup")}
                    className="text-accent hover:underline"
                  >
                    topic response rules
                  </button>{" "}
                  to control what the agent says about pricing, booking, or delivery.
                </li>
              )}
              {!instructions && (
                <li className="flex gap-2">
                  <span className="text-amber-500">●</span>
                  Write{" "}
                  <button
                    type="button"
                    onClick={() => setTab("setup")}
                    className="text-accent hover:underline"
                  >
                    custom instructions
                  </button>{" "}
                  to give your agent a specific tone and sales approach.
                </li>
              )}
              {completeness >= 80 && hours && topicRules.length > 0 && instructions && (
                <li className="flex gap-2">
                  <span className="text-emerald-500">✓</span>
                  Your agent is well-configured and ready to handle customer questions.
                </li>
              )}
            </ul>
          </Card>
        </div>
      )}

      <Link href="/dashboard" className="mt-6 inline-block text-sm text-accent hover:underline">
        ← Back to dashboard
      </Link>
    </>
  );
}
