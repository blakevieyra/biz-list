"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveBusinessDashboardProfile } from "@/lib/actions/business";
import { CategoryPicker, parseStoredCategory } from "@/components/industry-picker";
import { ImageUpload } from "@/components/image-upload";
import { SocialLinksEditor } from "@/components/social-links-editor";
import { ServicesEditor } from "@/components/services-editor";
import { Card } from "@/components/ui";
import type { BusinessIntent, BusinessProfile, BusinessService, BusinessSocialLinks } from "@/lib/types";
import { INTENT_LABELS } from "@/lib/types";

const intents: BusinessIntent[] = [
  "hiring",
  "seeking_customers",
  "seeking_advice",
  "open_to_partnerships",
];

export function BusinessProfileEditor({
  business,
  displayName,
}: {
  business: BusinessProfile;
  displayName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const parsedCategory = parseStoredCategory(business.category, business.subcategory);
  const [form, setForm] = useState({
    displayName,
    name: business.name,
    tagline: business.tagline,
    description: business.description,
    category: parsedCategory.category,
    subcategory: parsedCategory.subcategory,
    city: business.city,
    state: business.state,
    zipCode: business.zipCode,
    website: business.website ?? "",
    socialLinks: business.socialLinks ?? {},
    phone: business.phone,
    hours: business.hours,
    importantInfo: business.importantInfo,
    isHiring: business.isHiring,
    services: business.services.length ? business.services : [{ name: "", description: "", price: "" }],
    mediaUrls: business.mediaUrls,
    intents: business.intents,
  });

  function toggleIntent(intent: BusinessIntent) {
    setForm((prev) => ({
      ...prev,
      intents: prev.intents.includes(intent)
        ? prev.intents.filter((i) => i !== intent)
        : [...prev.intents, intent],
    }));
  }

  function handleSave() {
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const services = form.services.filter((s) => s.name.trim()) as BusinessService[];
      const result = await saveBusinessDashboardProfile({
        businessId: business.id,
        displayName: form.displayName,
        name: form.name,
        tagline: form.tagline,
        description: form.description,
        category: form.category,
        subcategory: form.subcategory,
        city: form.city,
        state: form.state,
        zipCode: form.zipCode,
        website: form.website,
        socialLinks: form.socialLinks,
        phone: form.phone,
        hours: form.hours,
        importantInfo: form.importantInfo,
        isHiring: form.isHiring,
        services,
        mediaUrls: form.mediaUrls,
        intents: form.intents,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-semibold">Listing details</h2>
        <p className="mt-1 text-sm text-muted">
          Update how your business appears in the directory and on your public profile.
        </p>
        <div className="mt-4 space-y-3">
          <Field
            label="Your display name"
            value={form.displayName}
            onChange={(v) => setForm({ ...form, displayName: v })}
          />
          <Field
            label="Business name"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
          />
          <Field
            label="Tagline"
            value={form.tagline}
            onChange={(v) => setForm({ ...form, tagline: v })}
            placeholder="One-line summary"
          />
          <CategoryPicker
            category={form.category}
            subcategory={form.subcategory}
            onChange={({ category, subcategory }) => setForm({ ...form, category, subcategory })}
            label="Business category"
            hint="Choose your industry and the specific type of business you run."
          />
          <label className="block text-sm">
            <span className="font-medium">Description</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
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
        <SocialLinksEditor
          links={form.socialLinks}
          onChange={(socialLinks: BusinessSocialLinks) => setForm({ ...form, socialLinks })}
        />
      </Card>

      <Card>
        <ServicesEditor
          services={form.services}
          onChange={(services) => setForm({ ...form, services })}
        />
      </Card>

      <Card>
        <ImageUpload
          label="Business photos"
          hint="Upload product shots, storefront photos, or team images. The first photo is your directory cover."
          existingUrls={form.mediaUrls}
          onUploaded={(mediaUrls) => setForm({ ...form, mediaUrls })}
        />
      </Card>

      <Card>
        <h2 className="font-semibold">Contact & hours</h2>
        <div className="mt-4 space-y-3">
          <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Field label="Hours" value={form.hours} onChange={(v) => setForm({ ...form, hours: v })} placeholder="Mon–Fri 9–5" />
          <Field label="Website" value={form.website} onChange={(v) => setForm({ ...form, website: v })} placeholder="https://" />
          <label className="block text-sm">
            <span className="font-medium">Important information</span>
            <textarea
              value={form.importantInfo}
              onChange={(e) => setForm({ ...form, importantInfo: e.target.value })}
              rows={3}
              placeholder="Parking, accessibility, seasonal hours, etc."
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isHiring}
              onChange={(e) => setForm({ ...form, isHiring: e.target.checked })}
            />
            <span>We&apos;re hiring</span>
          </label>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">What you&apos;re looking for</h2>
        <p className="mt-1 text-sm text-muted">Help others understand how to connect with you.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {intents.map((intent) => (
            <button
              key={intent}
              type="button"
              onClick={() => toggleIntent(intent)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                form.intents.includes(intent)
                  ? "bg-accent text-white"
                  : "border border-border bg-card text-muted hover:text-foreground"
              }`}
            >
              {INTENT_LABELS[intent]}
            </button>
          ))}
        </div>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && (
        <p className="text-sm text-emerald-700">
          Profile saved.{" "}
          <Link href={`/listings/${business.id}`} className="font-medium underline">
            View public listing
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
          href={`/listings/${business.id}`}
          className="inline-flex min-h-11 items-center rounded-full border border-border px-6 py-2.5 text-sm font-medium hover:border-accent/40"
        >
          Preview listing
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
