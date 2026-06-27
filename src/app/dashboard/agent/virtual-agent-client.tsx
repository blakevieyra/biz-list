"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, useRef, useEffect } from "react";
import { toggleVirtualAgent, virtualAgentReply, saveAgentInstructions } from "@/lib/actions/pro";
import { Card, PageHeader } from "@/components/ui";

type Tab = "setup" | "preview" | "activity";
type TopicRule = { topic: string; response: string };

// ─── Template packs ──────────────────────────────────────────────────────────

const TEMPLATE_PACKS: {
  id: string;
  label: string;
  emoji: string;
  description: string;
  instructions: string;
  rules: TopicRule[];
}[] = [
  {
    id: "general",
    label: "General Local Business",
    emoji: "🏢",
    description: "Great starting point for any local business",
    instructions:
      "Be friendly, professional, and concise — keep replies under 3 sentences. We're locally owned and love our community. Never make up pricing, hours, or availability — if you don't know, invite them to call or message us directly. End every reply with a clear next step (call, book, follow our listing).",
    rules: [
      { topic: "pricing", response: "We offer competitive local pricing tailored to each customer's needs. For an exact quote, reply here with what you need or give us a call and we'll get back to you quickly." },
      { topic: "booking", response: "We'd love to help! The easiest way to book is to message us here or call during business hours — we confirm appointments quickly." },
      { topic: "payment", response: "We accept cash, major credit cards, and most digital payments. Let us know if you have a specific question about payment options." },
      { topic: "promotions", response: "We regularly run deals and specials on our BizList listing! Follow us there to be the first to know about promotions." },
    ],
  },
  {
    id: "restaurant",
    label: "Restaurant / Food & Beverage",
    emoji: "🍽️",
    description: "Reservations, menu, delivery, dietary questions",
    instructions:
      "Be warm, welcoming, and mouth-watering in your descriptions. Keep replies short and inviting. Always mention that customers can view the full menu or call to make a reservation. Never guess at ingredients or allergens — direct those questions to the team directly.",
    rules: [
      { topic: "reservations", response: "We'd love to have you! Call us to reserve a table or message us here with your party size and preferred time — we'll confirm availability right away." },
      { topic: "delivery", response: "We offer delivery and pickup options — message us here or check our listing for current delivery details and hours." },
      { topic: "menu", response: "Our menu changes with the season and local availability. For today's full menu and specials, visit our BizList listing or give us a call." },
      { topic: "allergies", response: "Guest safety is our priority. Please call us directly to discuss specific dietary needs or allergen concerns so our team can assist you personally." },
    ],
  },
  {
    id: "professional",
    label: "Professional Services",
    emoji: "💼",
    description: "Consulting, legal, accounting, healthcare",
    instructions:
      "Be professional, calm, and reassuring. Never give specific advice in chat — always invite them to book a consultation. Emphasize confidentiality and expertise. Keep replies concise and direct them to the next step.",
    rules: [
      { topic: "consultation", response: "We offer initial consultations to understand your needs. Reply here or call us to schedule — availability is limited, so reaching out early is recommended." },
      { topic: "pricing", response: "Our fees depend on the scope and complexity of your situation. We'll discuss all costs transparently during your consultation before any commitment." },
      { topic: "confidentiality", response: "Client confidentiality is a cornerstone of our practice. All communications and engagements are fully confidential." },
      { topic: "timeline", response: "Timelines vary by engagement. During your consultation we'll give you a realistic timeline based on your specific needs." },
    ],
  },
  {
    id: "retail",
    label: "Retail / Shop",
    emoji: "🛍️",
    description: "Products, returns, inventory, in-store experience",
    instructions:
      "Be enthusiastic and helpful. Always highlight that we're local and love serving our community. For specific inventory questions, invite them to call or stop by — stock changes daily. Mention any loyalty or repeat-customer programs.",
    rules: [
      { topic: "returns", response: "We have a straightforward return policy — bring your item and receipt within 30 days and we'll make it right. Questions? Call us or message here." },
      { topic: "inventory", response: "Our inventory updates frequently! For the most current stock on a specific item, give us a call or stop by — we're happy to hold items too." },
      { topic: "gift cards", response: "Yes, we offer gift cards — great for any occasion! Stop by the store or ask us here for details on amounts and how to purchase." },
      { topic: "custom orders", response: "We love custom requests! Share what you have in mind and our team will let you know what's possible and estimated turnaround." },
    ],
  },
];

// ─── Smoke test questions ─────────────────────────────────────────────────────

const SMOKE_QUESTIONS = [
  { label: "Services", q: "What services do you offer?" },
  { label: "Hours", q: "What are your hours of operation?" },
  { label: "Pricing", q: "How much does it cost?" },
  { label: "Location", q: "Where are you located?" },
  { label: "Booking", q: "How do I book an appointment?" },
  { label: "Hiring", q: "Are you currently hiring?" },
];

type SmokeResult = {
  label: string;
  q: string;
  reply: string;
  pass: boolean;
  reason: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ProfileField({ label, value, missing }: { label: string; value: string; missing?: boolean }) {
  if (!value && !missing) return null;
  return (
    <div className="flex gap-3 text-sm">
      <span className="w-28 shrink-0 font-medium text-foreground/70">{label}</span>
      {value ? (
        <span className="text-muted">{value}</span>
      ) : (
        <Link href="/dashboard/profile" className="text-amber-600 hover:underline text-xs">
          Not set — add in profile →
        </Link>
      )}
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
    !!fields.website,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function SetupChecklistItem({ done, label, sub }: { done: boolean; label: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-0.5 h-5 w-5 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
        {done ? "✓" : "○"}
      </span>
      <div>
        <p className={`text-sm font-medium ${done ? "text-foreground" : "text-muted"}`}>{label}</p>
        {sub && <p className="text-xs text-muted">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

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
  const chatEndRef = useRef<HTMLDivElement>(null);

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
  const [smokeResults, setSmokeResults] = useState<SmokeResult[] | null>(null);
  const [smokePending, setSmokePending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templateApplied, setTemplateApplied] = useState(false);

  const completeness = profileCompleteness({ businessName, tagline, description, city, hours, phone, services, website });
  const hasInstructions = instructions.trim().length > 0;
  const hasRules = topicRules.length > 0;
  const profileComplete = completeness >= 60;
  const fullyConfigured = profileComplete && hasInstructions && hasRules;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function callAgent(text: string): Promise<string> {
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
    if (result.error) throw new Error(result.error);
    return result.reply ?? "";
  }

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = message.trim();
    if (!text || chatPending) return;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setMessage("");
    startChatTransition(async () => {
      setChatError(null);
      try {
        const reply = await callAgent(text);
        setMessages((prev) => [...prev, { role: "agent", text: reply }]);
      } catch (e) {
        setChatError(e instanceof Error ? e.message : "Agent error");
      }
    });
  }

  async function runSmokeTest() {
    setSmokePending(true);
    setSmokeResults(null);
    const results: SmokeResult[] = [];
    for (const sq of SMOKE_QUESTIONS) {
      try {
        const reply = await virtualAgentReply({
          businessName, category, services,
          serviceObjects: serviceObjects.length ? serviceObjects : undefined,
          message: sq.q, tagline, description, city, state, phone, hours,
          website, importantInfo, isHiring,
          agentInstructions: instructions,
          agentTopicRules: topicRules,
        });
        const text = reply.reply ?? "";
        const isGeneric = text.includes("our services") && services === "our services";
        const tooShort = text.trim().length < 20;
        const pass = !!text && !reply.error && !tooShort;
        results.push({
          label: sq.label,
          q: sq.q,
          reply: text || reply.error || "No response",
          pass,
          reason: reply.error
            ? `Error: ${reply.error}`
            : tooShort
            ? "Response too short"
            : isGeneric
            ? "Generic fallback — fill in your services in your profile"
            : "OK",
        });
      } catch (e) {
        results.push({ label: sq.label, q: sq.q, reply: "", pass: false, reason: e instanceof Error ? e.message : "Failed" });
      }
    }
    setSmokeResults(results);
    setSmokePending(false);
  }

  function applyTemplate(packId: string) {
    const pack = TEMPLATE_PACKS.find((p) => p.id === packId);
    if (!pack) return;
    setInstructions(pack.instructions);
    const existing = new Set(topicRules.map((r) => r.topic.toLowerCase()));
    const newRules = pack.rules.filter((r) => !existing.has(r.topic.toLowerCase()));
    setTopicRules((prev) => [...prev, ...newRules]);
    setSelectedTemplate(packId);
    setTemplateApplied(true);
    setTimeout(() => setTemplateApplied(false), 3000);
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
    setNewTopic(""); setNewResponse("");
  }

  function removeTopicRule(i: number) {
    setTopicRules((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleSave() {
    startSaveTransition(async () => {
      setSaveError(null); setSaveSuccess(false);
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
        description="Configure your AI assistant, preview how it responds, and track customer conversations."
      />

      {/* Status + toggle */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Listing chat assistant</p>
            <p className="mt-1 text-sm text-muted">
              {enabled
                ? "Active — customers see the chat widget on your listing."
                : "Off — customers won't see the chat widget on your listing."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!fullyConfigured && !enabled && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                Finish setup before going live
              </span>
            )}
            <button
              type="button"
              disabled={togglePending}
              onClick={handleToggle}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                enabled
                  ? "border border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "bg-accent text-white hover:bg-accent-hover"
              } disabled:opacity-50`}
            >
              {togglePending ? "Saving..." : enabled ? "✓ Agent on" : "Turn agent on"}
            </button>
          </div>
        </div>
        {toggleError && <p className="mt-2 text-sm text-red-600">{toggleError}</p>}
      </Card>

      {/* Setup checklist — shown until fully configured */}
      {!fullyConfigured && (
        <Card className="mb-4 border-amber-200 bg-amber-50/60">
          <p className="mb-3 font-semibold text-amber-800">Setup checklist</p>
          <div className="space-y-2.5">
            <SetupChecklistItem
              done={profileComplete}
              label={`Business profile (${completeness}% complete)`}
              sub={profileComplete ? "Good — agent has enough to work with" : "Fill in hours, services, and phone for accurate replies"}
            />
            <SetupChecklistItem
              done={hasInstructions}
              label="Custom agent instructions"
              sub={hasInstructions ? "Instructions saved" : "Tell the agent your tone, promotions, and what to avoid"}
            />
            <SetupChecklistItem
              done={hasRules}
              label={`Topic response rules (${topicRules.length} rules)`}
              sub={hasRules ? "Rules active" : "Set scripted responses for pricing, booking, delivery, etc."}
            />
            <SetupChecklistItem
              done={enabled}
              label="Agent activated"
              sub={enabled ? "Live on your listing" : "Turn it on once the above steps are complete"}
            />
          </div>
          {!hasInstructions && (
            <p className="mt-3 text-xs text-amber-700">
              → Use a <strong>Quick Start template</strong> below to fill in instructions and topic rules in one click.
            </p>
          )}
        </Card>
      )}

      {/* Tab nav */}
      <div className="mb-4 flex gap-1 rounded-xl border border-border bg-card p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === t.id ? "bg-accent text-white shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Training & Setup ── */}
      {tab === "setup" && (
        <div className="space-y-4">

          {/* Quick Start Templates */}
          <Card>
            <div className="mb-1 flex items-center justify-between">
              <p className="font-semibold">Quick Start — pick your business type</p>
              {templateApplied && <span className="text-xs text-emerald-600 font-medium">Template applied ✓</span>}
            </div>
            <p className="mb-4 text-xs text-muted">
              Instantly fill in your agent instructions and topic rules. You can edit anything after.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {TEMPLATE_PACKS.map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => applyTemplate(pack.id)}
                  className={`rounded-xl border p-4 text-left transition hover:border-accent/60 hover:bg-accent/5 ${
                    selectedTemplate === pack.id ? "border-accent bg-accent/5" : "border-border"
                  }`}
                >
                  <p className="mb-1 text-xl">{pack.emoji}</p>
                  <p className="font-semibold text-sm">{pack.label}</p>
                  <p className="mt-0.5 text-xs text-muted">{pack.description}</p>
                  <p className="mt-2 text-xs text-accent">{pack.rules.length} topic rules included</p>
                </button>
              ))}
            </div>
          </Card>

          {/* Profile knowledge */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold">What your agent knows</p>
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${completeness}%` }} />
                </div>
                <span className={`text-xs font-medium ${completeness >= 80 ? "text-emerald-600" : "text-amber-600"}`}>
                  {completeness}% complete
                </span>
              </div>
            </div>
            <p className="mb-3 text-xs text-muted">
              Pulled directly from your{" "}
              <Link href="/dashboard/profile" className="text-accent hover:underline">business profile</Link>.
              The more you fill in, the better the agent answers.
            </p>
            <div className="space-y-2 rounded-xl bg-slate-50 p-4">
              <ProfileField label="Business" value={businessName !== "Your business" ? businessName : ""} missing />
              <ProfileField label="Category" value={category !== "local services" ? category : ""} missing />
              <ProfileField label="Location" value={[city, state].filter(Boolean).join(", ")} missing />
              <ProfileField label="Hours" value={hours} missing />
              <ProfileField label="Phone" value={phone} missing />
              <ProfileField label="Tagline" value={tagline} />
              <ProfileField label="About" value={description.slice(0, 120) + (description.length > 120 ? "…" : "")} />
              <ProfileField label="Website" value={website ?? ""} missing />
              <ProfileField
                label="Services"
                value={
                  serviceObjects.length
                    ? serviceObjects.map((s) => s.name + (s.price ? ` (${s.price})` : "")).join(", ")
                    : services !== "our services"
                    ? services
                    : ""
                }
                missing
              />
              {importantInfo && <ProfileField label="Important info" value={importantInfo} />}
              {isHiring && <ProfileField label="Hiring" value="Yes — actively hiring" />}
            </div>
            {completeness < 60 && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <strong>Profile is {completeness}% complete.</strong> The agent will give generic responses until you add hours, services, and a phone number.{" "}
                <Link href="/dashboard/profile" className="font-semibold underline">Complete your profile →</Link>
              </div>
            )}
          </Card>

          {/* Custom instructions */}
          <Card>
            <p className="mb-1 font-semibold">Custom agent instructions</p>
            <p className="mb-3 text-xs text-muted">
              Free-form guidance for tone, promotions, what to avoid, how to close a sale. The agent follows this on every reply.
            </p>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={5}
              placeholder={`Example:\n• Be warm and professional. Keep replies under 3 sentences.\n• Always mention we're locally owned.\n• If asked about pricing, give a range and invite them to call for a quote.\n• End every reply with a clear next step.`}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent"
            />
          </Card>

          {/* Topic rules */}
          <Card>
            <p className="mb-1 font-semibold">Topic response rules</p>
            <p className="mb-3 text-xs text-muted">
              Scripted answers for common customer topics. When someone asks about a topic, the agent uses your script as the foundation of its reply.
            </p>

            {topicRules.length > 0 && (
              <div className="mb-4 space-y-2">
                {topicRules.map((rule, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-border bg-slate-50/80 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-accent capitalize">{rule.topic}</p>
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
            )}

            <div className="space-y-2 rounded-xl border border-dashed border-border p-3">
              <p className="text-xs font-medium text-muted">Add a custom rule</p>
              <input
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                placeholder='Topic (e.g. "pricing", "delivery", "returns", "booking")'
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

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={savePending}
                onClick={handleSave}
                className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {savePending ? "Saving…" : "Save instructions & rules"}
              </button>
              {saveSuccess && <p className="text-sm font-medium text-emerald-600">✓ Saved successfully</p>}
              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            </div>
          </Card>
        </div>
      )}

      {/* ── Chat Preview ── */}
      {tab === "preview" && (
        <div className="space-y-4">
          <Card>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="rounded-xl bg-teal-50 px-4 py-3 text-sm flex-1">
                Preview for <strong>{businessName}</strong> — same logic used on your listing
                {enabled ? " · live now" : ""}. Test how customers experience your agent.
              </div>
              <button
                type="button"
                disabled={smokePending}
                onClick={runSmokeTest}
                className="rounded-full border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-accent/10 disabled:opacity-50 shrink-0"
              >
                {smokePending ? "Running tests…" : "▶ Run smoke test"}
              </button>
            </div>

            <div className="max-h-96 space-y-3 overflow-y-auto rounded-xl border border-border p-4">
              {messages.length === 0 && (
                <p className="text-sm text-muted">
                  Ask a question as a customer would, or click <strong>Run smoke test</strong> to automatically test 6 common questions.
                </p>
              )}
              {messages.map((entry, i) => (
                <div
                  key={i}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    entry.role === "user" ? "ml-8 bg-accent text-white" : "mr-8 bg-slate-100 text-foreground"
                  }`}
                >
                  {entry.text}
                </div>
              ))}
              {chatPending && (
                <div className="mr-8 rounded-lg bg-slate-100 px-3 py-2 text-sm text-muted animate-pulse">
                  Agent is typing…
                </div>
              )}
              <div ref={chatEndRef} />
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

          {/* Smoke test results */}
          {smokeResults && (
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <p className="font-semibold">Smoke test results</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">
                    {smokeResults.filter((r) => r.pass).length} passed
                  </span>
                  {smokeResults.some((r) => !r.pass) && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700">
                      {smokeResults.filter((r) => !r.pass).length} failed
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                {smokeResults.map((r, i) => (
                  <div key={i} className={`rounded-xl border p-3 ${r.pass ? "border-emerald-200 bg-emerald-50/40" : "border-red-200 bg-red-50/40"}`}>
                    <div className="flex items-start gap-2">
                      <span className={`shrink-0 text-base ${r.pass ? "text-emerald-600" : "text-red-500"}`}>
                        {r.pass ? "✅" : "❌"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold">{r.label} — <span className="font-normal text-muted italic">{r.q}</span></p>
                        <p className="mt-1 text-xs text-foreground/80 line-clamp-3">{r.reply}</p>
                        {!r.pass && <p className="mt-1 text-xs font-medium text-red-600">{r.reason}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {smokeResults.some((r) => !r.pass) && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <strong>Fix failing tests:</strong> Fill in missing profile fields (hours, services, phone) in your{" "}
                  <Link href="/dashboard/profile" className="font-semibold underline">business profile</Link>, then re-run the test.
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ── Activity ── */}
      {tab === "activity" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Auto-replies sent" value={totalConversations} sub="via message inbox" />
            <StatCard label="Agent status" value={enabled ? "Live" : "Off"} sub={enabled ? "Active on listing" : "Not visible to customers"} />
            <StatCard label="Profile completeness" value={`${completeness}%`} sub="Higher = better replies" />
          </div>

          <Card>
            <p className="mb-3 font-semibold">Recent customer questions</p>
            {recentQuestions.length === 0 ? (
              <div className="rounded-xl bg-slate-50 px-4 py-8 text-center">
                <p className="text-sm text-muted">No conversations yet.</p>
                <p className="mt-1 text-xs text-muted">Turn on the agent and share your listing to start getting questions.</p>
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
                      <p className="shrink-0 text-[11px] text-muted">{new Date(q.createdAt).toLocaleDateString()}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <p className="mb-3 font-semibold">Performance tips</p>
            <ul className="space-y-2 text-sm">
              {completeness < 80 && (
                <li className="flex gap-2">
                  <span className="text-amber-500 shrink-0">●</span>
                  <span className="text-muted">
                    <Link href="/dashboard/profile" className="text-accent hover:underline">Complete your business profile</Link>
                    {" "}— currently {completeness}% filled in. Hours, phone, and services make the biggest difference.
                  </span>
                </li>
              )}
              {!hasRules && (
                <li className="flex gap-2">
                  <span className="text-amber-500 shrink-0">●</span>
                  <span className="text-muted">
                    <button type="button" onClick={() => setTab("setup")} className="text-accent hover:underline">Add topic rules</button>
                    {" "}to control what the agent says about pricing, booking, or delivery.
                  </span>
                </li>
              )}
              {!hasInstructions && (
                <li className="flex gap-2">
                  <span className="text-amber-500 shrink-0">●</span>
                  <span className="text-muted">
                    <button type="button" onClick={() => setTab("setup")} className="text-accent hover:underline">Write custom instructions</button>
                    {" "}to give your agent a specific tone and closing style.
                  </span>
                </li>
              )}
              {fullyConfigured && enabled && (
                <li className="flex gap-2">
                  <span className="text-emerald-500 shrink-0">✓</span>
                  <span className="text-muted">Your agent is fully configured and live. Run a <button type="button" onClick={() => setTab("preview")} className="text-accent hover:underline">smoke test</button> anytime to confirm quality.</span>
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
