"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { saveProfile } from "@/lib/actions/social";
import { ImageUpload } from "@/components/image-upload";
import { SocialLinksEditor } from "@/components/social-links-editor";
import { ServicesEditor } from "@/components/services-editor";
import { CategoryPicker, IndustryPicker } from "@/components/industry-picker";
import { Card, PageHeader } from "@/components/ui";
import type { BusinessIntent, BusinessService, BusinessSocialLinks, DiscoveryRadius, ForumCategory, UserRole } from "@/lib/types";
import { FEED_SCOPE_LABELS } from "@/lib/feed/location-scope";
import {
  FORUM_CATEGORY_LABELS,
  INTENT_LABELS,
  ROLE_LABELS,
} from "@/lib/types";

type StepId = "welcome" | "about" | "role" | "offerings" | "community" | "review";

const BUSINESS_STEPS: { id: StepId; label: string }[] = [
  { id: "welcome", label: "Welcome" },
  { id: "about", label: "About you" },
  { id: "role", label: "Business" },
  { id: "offerings", label: "Offerings" },
  { id: "community", label: "Community" },
  { id: "review", label: "Launch" },
];

const CUSTOMER_STEPS: { id: StepId; label: string }[] = [
  { id: "welcome", label: "Welcome" },
  { id: "about", label: "About you" },
  { id: "role", label: "Profile" },
  { id: "community", label: "Community" },
  { id: "review", label: "Launch" },
];

type FormState = {
  displayName: string;
  avatarUrl: string;
  role: UserRole;
  bio: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  headline: string;
  skills: string[];
  isSeekingWork: boolean;
  discoveryRadius: DiscoveryRadius;
  businessName: string;
  tagline: string;
  description: string;
  category: string;
  subcategory: string;
  website: string;
  socialLinks: BusinessSocialLinks;
  phone: string;
  hours: string;
  isHiring: boolean;
  services: BusinessService[];
  mediaUrls: string[];
  introPostTitle: string;
  introPostBody: string;
  interestTags: string[];
  industryInterests: string[];
  intents: BusinessIntent[];
  forumInterests: ForumCategory[];
};

const emptyService = (): BusinessService => ({ name: "", description: "", price: "" });

export function ProfileCreateWizard({
  initialDisplayName = "",
}: {
  initialDisplayName?: string;
}) {
  const searchParams = useSearchParams();
  const isWelcome = searchParams.get("welcome") === "1";
  const [stepIndex, setStepIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>({
    displayName: initialDisplayName,
    avatarUrl: "",
    role: "business",
    bio: "",
    city: "",
    state: "",
    zipCode: "",
    country: "US",
    headline: "",
    skills: [],
    isSeekingWork: false,
    discoveryRadius: "city",
    businessName: "",
    tagline: "",
    description: "",
    category: "",
    subcategory: "",
    website: "",
    socialLinks: {},
    phone: "",
    hours: "",
    isHiring: false,
    services: [emptyService()],
    mediaUrls: [],
    introPostTitle: "",
    introPostBody: "",
    interestTags: [],
    industryInterests: [],
    intents: [],
    forumInterests: [],
  });

  const isBusiness = form.role === "business" || form.role === "organization";
  const steps = isBusiness ? BUSINESS_STEPS : CUSTOMER_STEPS;
  const step = steps[stepIndex]?.id ?? "welcome";
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);

  const guideItems = useMemo(
    () =>
      isBusiness
        ? [
            { title: "Listings listing", body: "Your business appears in search with photos, services, and goals." },
            { title: "Post updates", body: "Share news on your profile and in the directory feed for others to follow." },
            { title: "Connect locally", body: "Follow businesses, message owners, join forums, and propose collaborations." },
          ]
        : [
            { title: "Discover businesses", body: "Browse the directory, follow organizations, and message them directly." },
            { title: "Join the community", body: "Post in forums, comment on local topics, and explore joint ventures." },
            { title: "Get discovered", body: "Businesses with Pro plans can find you as a lead when your interests match." },
          ],
    [isBusiness],
  );

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

  function validateStep(): string | null {
    if (step === "about") {
      if (!form.displayName.trim()) return "Display name is required.";
      if (!form.city.trim() || !form.state.trim()) return "City and state help locals find you.";
      if (!form.zipCode.trim()) return "Add your zip code so we can show nearby businesses first.";
      if (!form.bio.trim()) return "Add a short bio so people know who you are.";
    }
    if (step === "role" && isBusiness) {
      if (!form.businessName.trim()) return "Business name is required.";
      if (!form.category.trim() || !form.subcategory.trim()) {
        return "Pick your industry and specific business type.";
      }
      if (!form.description.trim()) return "Describe what your business offers.";
    }
    if (step === "role" && !isBusiness) {
      if (form.industryInterests.length === 0) {
        return "Pick at least one industry you're interested in.";
      }
      if (!form.headline.trim() && form.isSeekingWork) {
        return "Add a headline like “Open to local opportunities”.";
      }
    }
    if (step === "review" && isBusiness && !form.businessName.trim()) {
      return "Business name is required.";
    }
    return null;
  }

  function goNext() {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function goBack() {
    setError(null);
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function submitProfile() {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }

    startTransition(async () => {
      setError(null);
      const services = form.services.filter((s) => s.name.trim());
      const result = await saveProfile({
        displayName: form.displayName.trim(),
        avatarUrl: form.avatarUrl || undefined,
        role: form.role,
        bio: form.bio.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zipCode: form.zipCode.trim(),
        country: form.country.trim() || "US",
        forumInterests: form.forumInterests,
        interestTags: form.interestTags,
        industryInterests: form.industryInterests,
        headline: form.headline.trim(),
        skills: form.skills,
        isSeekingWork: form.isSeekingWork,
        discoveryRadius: form.discoveryRadius,
        businessName: isBusiness ? form.businessName.trim() : undefined,
        tagline: isBusiness ? form.tagline.trim() : undefined,
        description: isBusiness ? form.description.trim() : undefined,
        category: isBusiness ? form.category.trim() : undefined,
        subcategory: isBusiness ? form.subcategory.trim() : undefined,
        website: isBusiness ? form.website.trim() : undefined,
        socialLinks: isBusiness ? form.socialLinks : undefined,
        phone: isBusiness ? form.phone.trim() : undefined,
        hours: isBusiness ? form.hours.trim() : undefined,
        isHiring: isBusiness ? form.isHiring : undefined,
        services: isBusiness ? services : undefined,
        mediaUrls: isBusiness ? form.mediaUrls : undefined,
        intents: isBusiness ? form.intents : undefined,
        introPost:
          isBusiness && form.introPostTitle.trim() && form.introPostBody.trim()
            ? {
                title: form.introPostTitle.trim(),
                body: form.introPostBody.trim(),
                mediaUrls: form.mediaUrls,
              }
            : undefined,
      });

      if (result.error) {
        setError(result.error);
        return;
      }
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12 sm:px-6">
        <Card>
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">You&apos;re in</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Welcome to BizList</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
            Your profile is live. Here&apos;s what you can do next on BizList:
          </p>

          <ul className="mt-6 space-y-3">
            {guideItems.map((item) => (
              <li key={item.title} className="rounded-xl border border-border p-4">
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-muted">{item.body}</p>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={isBusiness ? "/dashboard" : "/listings"}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
            >
              {isBusiness ? "Open dashboard" : "Browse directory"}
            </Link>
            <Link
              href="/forum"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:border-accent/40"
            >
              Explore forum
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12 sm:px-6">
      <PageHeader
        title={isWelcome ? "Let's set up your profile" : "Create your profile"}
        description={
          isBusiness
            ? "Build your business listing with products, photos, and your first local post."
            : "Tell the community who you are — discover businesses, join forums, and connect locally."
        }
      />

      <div className="mb-6">
        <div className="mb-2 flex justify-between text-xs font-medium text-muted">
          <span>
            Step {stepIndex + 1} of {steps.length}: {steps[stepIndex]?.label}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <Card>
        {step === "welcome" && (
          <StepBlock title="How will you use BizList?">
            <div className="grid gap-3 sm:grid-cols-2">
              {(["business", "organization", "customer"] as UserRole[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, role }));
                    if (role === "customer") {
                      setStepIndex(0);
                    }
                  }}
                  className={`rounded-2xl border p-4 text-left transition ${
                    form.role === role
                      ? "border-accent bg-blue-50 ring-1 ring-accent/30"
                      : "border-border hover:border-accent/40"
                  }`}
                >
                  <p className="font-semibold">{ROLE_LABELS[role]}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    {role === "customer"
                      ? "Discover local businesses, follow updates, join forums, and connect as a customer or job seeker."
                      : "List products & services, upload photos, post updates, and grow in the local directory."}
                  </p>
                </button>
              ))}
            </div>
          </StepBlock>
        )}

        {step === "about" && (
          <StepBlock title="About you">
            <Field label="Display name" value={form.displayName} onChange={(v) => setForm({ ...form, displayName: v })} />
            <ImageUpload
              label="Profile photo (optional)"
              hint="Shown next to your name in comments, the directory, and on your profile."
              existingUrls={form.avatarUrl ? [form.avatarUrl] : []}
              onUploaded={(urls) => setForm({ ...form, avatarUrl: urls[0] ?? "" })}
            />
            <TextArea label="Bio" value={form.bio} onChange={(v) => setForm({ ...form, bio: v })} placeholder="What should locals know about you?" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
              <Field label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} placeholder="TX" />
              <Field label="Zip code" value={form.zipCode} onChange={(v) => setForm({ ...form, zipCode: v })} placeholder="78701" />
              <Field label="Country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} placeholder="US" />
            </div>
          </StepBlock>
        )}

        {step === "role" && isBusiness && (
          <StepBlock title="Business details">
            <Field label="Business name" value={form.businessName} onChange={(v) => setForm({ ...form, businessName: v })} />
            <Field label="Tagline" value={form.tagline} onChange={(v) => setForm({ ...form, tagline: v })} placeholder="One line that describes you" />
            <CategoryPicker
              category={form.category}
              subcategory={form.subcategory}
              onChange={({ category, subcategory }) => setForm({ ...form, category, subcategory })}
              label="Business category"
              hint="Select the industry that best describes your products or services."
            />
            <TextArea label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <Field label="Hours" value={form.hours} onChange={(v) => setForm({ ...form, hours: v })} placeholder="Mon–Fri 9–5" />
            </div>
            <Field label="Website" value={form.website} onChange={(v) => setForm({ ...form, website: v })} placeholder="https://..." />
            <SocialLinksEditor
              links={form.socialLinks}
              onChange={(socialLinks) => setForm({ ...form, socialLinks })}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isHiring}
                onChange={(e) => setForm({ ...form, isHiring: e.target.checked })}
              />
              We&apos;re hiring locally
            </label>
          </StepBlock>
        )}

        {step === "role" && !isBusiness && (
          <StepBlock title="Your community profile">
            <Field label="Headline" value={form.headline} onChange={(v) => setForm({ ...form, headline: v })} placeholder="e.g. Local marketing professional open to projects" />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isSeekingWork}
                onChange={(e) => setForm({ ...form, isSeekingWork: e.target.checked })}
              />
              I&apos;m looking for work or local opportunities
            </label>
            <Field
              label="Skills"
              value={form.skills.join(", ")}
              onChange={(v) =>
                setForm({
                  ...form,
                  skills: v.split(",").map((s) => s.trim()).filter(Boolean),
                })
              }
              placeholder="design, catering, customer service"
            />
            <IndustryPicker
              selected={form.industryInterests}
              onChange={(industryInterests) => setForm({ ...form, industryInterests })}
              label="Interests"
              hint="Select all industries you care about. Matching businesses appear first in your feed."
            />
            <div>
              <p className="text-sm font-medium">Community feed range</p>
              <p className="mt-1 text-xs text-muted">Choose how far you want to discover people and businesses.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(Object.keys(FEED_SCOPE_LABELS) as DiscoveryRadius[]).map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => setForm({ ...form, discoveryRadius: scope })}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                      form.discoveryRadius === scope
                        ? "bg-accent text-white"
                        : "border border-border bg-card text-muted"
                    }`}
                  >
                    {FEED_SCOPE_LABELS[scope]}
                  </button>
                ))}
              </div>
            </div>
          </StepBlock>
        )}

        {step === "offerings" && isBusiness && (
          <StepBlock title="Products, photos & first post">
            <ServicesEditor
              services={form.services}
              onChange={(services) => setForm({ ...form, services })}
            />
            <ImageUpload
              label="Business photos"
              hint="Upload photos of your products, storefront, or team. These appear on your directory listing."
              existingUrls={form.mediaUrls}
              onUploaded={(mediaUrls) => setForm({ ...form, mediaUrls })}
            />
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-sm font-medium">Introduce yourself with a first post</p>
              <p className="text-xs text-muted">
                This appears on your business profile so followers can see your latest news.
              </p>
              <Field label="Post title" value={form.introPostTitle} onChange={(v) => setForm({ ...form, introPostTitle: v })} placeholder="We're now open on Main Street!" />
              <TextArea label="Post body" value={form.introPostBody} onChange={(v) => setForm({ ...form, introPostBody: v })} placeholder="Share news, a special offer, or what makes your business local." />
            </div>
          </StepBlock>
        )}

        {step === "community" && (
          <StepBlock title="Community & goals">
            {isBusiness && (
              <fieldset>
                <legend className="text-sm font-medium">Listings goals</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(Object.keys(INTENT_LABELS) as BusinessIntent[]).map((intent) => (
                    <ChipButton key={intent} active={form.intents.includes(intent)} onClick={() => toggleIntent(intent)}>
                      {INTENT_LABELS[intent]}
                    </ChipButton>
                  ))}
                </div>
              </fieldset>
            )}
            <fieldset className={isBusiness ? "mt-4" : ""}>
              <legend className="text-sm font-medium">Forum interests</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {(Object.keys(FORUM_CATEGORY_LABELS) as ForumCategory[]).map((category) => (
                  <ChipButton key={category} active={form.forumInterests.includes(category)} onClick={() => toggleForumInterest(category)}>
                    {FORUM_CATEGORY_LABELS[category]}
                  </ChipButton>
                ))}
              </div>
            </fieldset>
          </StepBlock>
        )}

        {step === "review" && (
          <StepBlock title="Review & launch">
            <dl className="space-y-3 text-sm">
              <ReviewRow label="Name" value={form.displayName} />
              <ReviewRow label="Role" value={ROLE_LABELS[form.role]} />
              <ReviewRow label="Location" value={`${form.city}, ${form.state} ${form.zipCode}, ${form.country}`} />
              {isBusiness ? (
                <>
                  <ReviewRow label="Business" value={form.businessName} />
                  <ReviewRow
                    label="Category"
                    value={form.subcategory ? `${form.category} › ${form.subcategory}` : form.category}
                  />
                  <ReviewRow label="Services" value={`${form.services.filter((s) => s.name.trim()).length} listed`} />
                  <ReviewRow label="Photos" value={`${form.mediaUrls.length} uploaded`} />
                  <ReviewRow label="Intro post" value={form.introPostTitle || "Skipped"} />
                </>
              ) : (
                <>
                  <ReviewRow label="Headline" value={form.headline} />
                  <ReviewRow label="Interests" value={form.industryInterests.join(", ")} />
                  <ReviewRow label="Seeking work" value={form.isSeekingWork ? "Yes" : "No"} />
                </>
              )}
            </dl>
          </StepBlock>
        )}

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            disabled={stepIndex === 0 || pending}
            onClick={goBack}
            className="min-h-11 rounded-full border border-border px-4 py-2 text-sm font-medium disabled:opacity-40"
          >
            Back
          </button>
          {step !== "review" ? (
            <button
              type="button"
              onClick={goNext}
              className="min-h-11 rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={submitProfile}
              className="min-h-11 rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {pending ? "Launching..." : "Launch my profile"}
            </button>
          )}
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}
      </Card>
    </div>
  );
}

function StepBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
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
        className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

function TextArea({
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

function ChipButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium ${
        active ? "bg-accent text-white" : "border border-border bg-background text-muted"
      }`}
    >
      {children}
    </button>
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
