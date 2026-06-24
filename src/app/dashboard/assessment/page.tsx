"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { runAiAssessment } from "@/lib/actions/pro";
import { Card, PageHeader } from "@/components/ui";

export default function DashboardAssessmentPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    overallScore: number;
    seoScore: number;
    onlinePresenceScore: number;
    businessClarityScore: number;
    summary: string;
    recommendations: string[];
  } | null>(null);

  return (
    <>
      <PageHeader
        title="AI Business Audit"
        description="Analyze your website, SEO, online presence, and how clearly your business shows up locally."
      />

      <Card>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              setError(null);
              const response = await runAiAssessment({
                websiteUrl: String(formData.get("websiteUrl") ?? ""),
                businessName: String(formData.get("businessName") ?? ""),
                category: String(formData.get("category") ?? ""),
                description: String(formData.get("description") ?? ""),
                city: String(formData.get("city") ?? ""),
                state: String(formData.get("state") ?? ""),
                tagline: String(formData.get("tagline") ?? ""),
              });
              if (response.error) {
                setError(response.error);
                return;
              }
              if (response.assessment) {
                setResult(response.assessment);
                router.refresh();
              }
            });
          }}
        >
          <Field label="Business name" name="businessName" required />
          <Field label="Website URL" name="websiteUrl" placeholder="https://yourbusiness.com" />
          <Field label="Category" name="category" placeholder="Food & Beverage" required />
          <Field label="Tagline" name="tagline" placeholder="One line about what you do" />
          <Field label="City" name="city" />
          <Field label="State" name="state" placeholder="TX" />
          <label className="block text-sm">
            <span className="font-medium">Business description</span>
            <textarea
              name="description"
              rows={4}
              required
              className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? "Analyzing..." : "Run AI audit"}
          </button>
        </form>
      </Card>

      {result && (
        <div className="mt-8 space-y-6">
          <Card>
            <h2 className="text-lg font-semibold">Overall score: {result.overallScore}/100</h2>
            <p className="mt-2 text-sm text-muted">{result.summary}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <Score label="SEO" value={result.seoScore} />
              <Score label="Online presence" value={result.onlinePresenceScore} />
              <Score label="Business clarity" value={result.businessClarityScore} />
            </div>
          </Card>
          <Card>
            <h3 className="font-semibold">Recommendations</h3>
            <ul className="mt-3 space-y-2">
              {result.recommendations.map((item) => (
                <li key={item} className="text-sm text-muted">
                  • {item}
                </li>
              ))}
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

function Field({
  label,
  name,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        placeholder={placeholder}
        required={required}
        className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent"
      />
    </label>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
