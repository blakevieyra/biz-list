"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { saveProfile } from "@/lib/actions/social";
import { Card, PageHeader } from "@/components/ui";
import type { BusinessIntent, ForumCategory, UserRole } from "@/lib/types";
import {
  FORUM_CATEGORY_LABELS,
  INTENT_LABELS,
  ROLE_LABELS,
} from "@/lib/types";

type Step = 1 | 2 | 3 | 4 | 5;

const steps: { num: Step; label: string }[] = [
  { num: 1, label: "Account" },
  { num: 2, label: "Profile" },
  { num: 3, label: "Business" },
  { num: 4, label: "Goals" },
  { num: 5, label: "Review" },
];

export default function CreateProfilePage() {
  const [step, setStep] = useState<Step>(1);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    role: "business" as UserRole,
    bio: "",
    city: "",
    state: "",
    interestTags: [] as string[],
    businessName: "",
    tagline: "",
    description: "",
    category: "",
    intents: [] as BusinessIntent[],
    forumInterests: [] as ForumCategory[],
  });

  function toggleIntent(intent: BusinessIntent) {
    setForm((prev) => ({
      ...prev,
      intents: prev.intents.includes(intent)
        ? prev.intents.filter((i) => i !== intent)
        : [...prev.intents, intent],
    }));
  }

  function toggleForumInterest(category: ForumCategory) {
    setForm((prev) => ({
      ...prev,
      forumInterests: prev.forumInterests.includes(category)
        ? prev.forumInterests.filter((c) => c !== category)
        : [...prev.forumInterests, category],
    }));
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Card className="text-center">
          <h1 className="text-2xl font-bold">Welcome to AllConnect!</h1>
          <p className="mt-2 text-sm text-muted">
            Your profile has been created. You can now list in the directory,
            follow businesses, post in the forum, and propose collaborations.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/directory"
              className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Browse directory
            </Link>
            <Link
              href="/forum"
              className="rounded-full border border-border px-5 py-2 text-sm font-medium hover:border-accent/40"
            >
              Visit forum
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const isBusiness = form.role === "business" || form.role === "organization";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Create your profile"
        description="Build your AllConnect profile from scratch — whether you're a business, organization, or customer looking to connect locally."
      />

      <div className="mb-8 flex gap-2">
        {steps.map((s) => (
          <div
            key={s.num}
            className={`flex-1 rounded-lg px-2 py-2 text-center text-xs font-medium ${
              step === s.num
                ? "bg-accent text-white"
                : step > s.num
                  ? "bg-teal-100 text-teal-800"
                  : "bg-slate-100 text-muted"
            }`}
          >
            {s.label}
          </div>
        ))}
      </div>

      <Card>
        {step === 1 && (
          <StepFields title="Start with the basics">
            <Input
              label="Display name"
              value={form.displayName}
              onChange={(v) => setForm({ ...form, displayName: v })}
              placeholder="Your name or business contact"
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
              placeholder="you@example.com"
            />
            <fieldset>
              <legend className="text-sm font-medium">I am a...</legend>
              <div className="mt-2 space-y-2">
                {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
                  <label key={role} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="role"
                      checked={form.role === role}
                      onChange={() => setForm({ ...form, role })}
                    />
                    {ROLE_LABELS[role]}
                  </label>
                ))}
              </div>
            </fieldset>
          </StepFields>
        )}

        {step === 2 && (
          <StepFields title="Tell the community about you">
            <Textarea
              label="Bio"
              value={form.bio}
              onChange={(v) => setForm({ ...form, bio: v })}
              placeholder="A short intro — what you do and what you're looking for"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="City"
                value={form.city}
                onChange={(v) => setForm({ ...form, city: v })}
                placeholder="Austin"
              />
              <Input
                label="State"
                value={form.state}
                onChange={(v) => setForm({ ...form, state: v })}
                placeholder="TX"
              />
            </div>
          </StepFields>
        )}

        {step === 3 && isBusiness && (
          <StepFields title="Business or organization details">
            <Input
              label="Business name"
              value={form.businessName}
              onChange={(v) => setForm({ ...form, businessName: v })}
              placeholder="Riverbend Bakery"
            />
            <Input
              label="Tagline"
              value={form.tagline}
              onChange={(v) => setForm({ ...form, tagline: v })}
              placeholder="One line that describes you"
            />
            <Input
              label="Category"
              value={form.category}
              onChange={(v) => setForm({ ...form, category: v })}
              placeholder="Food & Beverage, Legal, Retail..."
            />
            <Textarea
              label="Description"
              value={form.description}
              onChange={(v) => setForm({ ...form, description: v })}
              placeholder="What you offer and who you serve"
            />
          </StepFields>
        )}

        {step === 3 && !isBusiness && (
          <StepFields title="You're joining as a community member">
            <p className="text-sm text-muted">
              Customers and community members can discover businesses, follow
              organizations, and participate in forum discussions. You can skip
              business details and continue.
            </p>
          </StepFields>
        )}

        {step === 4 && (
          <StepFields title="What are you looking for?">
            {isBusiness && (
              <fieldset>
                <legend className="text-sm font-medium">
                  Directory listing goals (select all that apply)
                </legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(Object.keys(INTENT_LABELS) as BusinessIntent[]).map((intent) => (
                    <button
                      key={intent}
                      type="button"
                      onClick={() => toggleIntent(intent)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                        form.intents.includes(intent)
                          ? "bg-accent text-white"
                          : "border border-border bg-background text-muted"
                      }`}
                    >
                      {INTENT_LABELS[intent]}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            <fieldset className="mt-4">
              <legend className="text-sm font-medium">
                Local interests (helps businesses find you as a lead)
              </legend>
              <input
                value={form.interestTags.join(", ")}
                onChange={(e) =>
                  setForm({
                    ...form,
                    interestTags: e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="e.g. bakery, catering, local food"
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent"
              />
            </fieldset>
            <fieldset className="mt-4">
              <legend className="text-sm font-medium">
                Forum interests (including legal lessons & local topics)
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {(Object.keys(FORUM_CATEGORY_LABELS) as ForumCategory[]).map(
                  (category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleForumInterest(category)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                        form.forumInterests.includes(category)
                          ? "bg-accent text-white"
                          : "border border-border bg-background text-muted"
                      }`}
                    >
                      {FORUM_CATEGORY_LABELS[category]}
                    </button>
                  ),
                )}
              </div>
            </fieldset>
          </StepFields>
        )}

        {step === 5 && (
          <StepFields title="Review your profile">
            <dl className="space-y-3 text-sm">
              <ReviewRow label="Name" value={form.displayName} />
              <ReviewRow label="Email" value={form.email} />
              <ReviewRow label="Role" value={ROLE_LABELS[form.role]} />
              <ReviewRow label="Location" value={`${form.city}, ${form.state}`} />
              {isBusiness && (
                <>
                  <ReviewRow label="Business" value={form.businessName} />
                  <ReviewRow label="Category" value={form.category} />
                  <ReviewRow
                    label="Goals"
                    value={form.intents.map((i) => INTENT_LABELS[i]).join(", ") || "—"}
                  />
                </>
              )}
              <ReviewRow
                label="Forum interests"
                value={
                  form.forumInterests
                    .map((c) => FORUM_CATEGORY_LABELS[c])
                    .join(", ") || "—"
                }
              />
            </dl>
          </StepFields>
        )}

        <div className="mt-8 flex justify-between">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium disabled:opacity-40"
          >
            Back
          </button>
          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s < 5 ? ((s + 1) as Step) : s))}
              className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  setError(null);
                  const result = await saveProfile({
                    displayName: form.displayName,
                    role: form.role,
                    bio: form.bio,
                    city: form.city,
                    state: form.state,
                    forumInterests: form.forumInterests,
                    interestTags: form.interestTags,
                    businessName: form.businessName,
                    tagline: form.tagline,
                    description: form.description,
                    category: form.category,
                    intents: form.intents,
                  });
                  if (result.error) {
                    setError(result.error);
                    return;
                  }
                  setSubmitted(true);
                });
              }}
              className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {pending ? "Saving..." : "Create profile"}
            </button>
          )}
        </div>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <p className="mt-4 text-xs text-muted">
          Need an account first?{" "}
          <Link href="/auth/signup" className="text-accent hover:underline">
            Sign up
          </Link>
        </p>
      </Card>
    </div>
  );
}

function StepFields({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

function Textarea({
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
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}
