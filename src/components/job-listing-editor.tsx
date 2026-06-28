"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveJobListing } from "@/lib/actions/business";
import { JobApplicationFormEditor } from "@/components/job-application-form-editor";
import { Card } from "@/components/ui";
import type { BusinessProfile, JobApplicationFormConfig } from "@/lib/types";

export function JobListingEditor({ business }: { business: BusinessProfile }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    isHiring: business.isHiring,
    jobTitle: business.jobTitle,
    jobDescription: business.jobDescription,
    jobRequirements: business.jobRequirements,
    jobApplicationForm: business.jobApplicationForm ?? { questions: [] },
  });

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveJobListing({
        businessId: business.id,
        isHiring: form.isHiring,
        jobTitle: form.jobTitle,
        jobDescription: form.jobDescription,
        jobRequirements: form.jobRequirements,
        jobApplicationForm: form.jobApplicationForm,
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
        <h2 className="font-semibold">Job listing</h2>
        <p className="mt-1 text-sm text-muted">
          Enable hiring to show a &ldquo;Now Hiring&rdquo; badge on your profile and accept applications.
        </p>
        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isHiring}
              onChange={(e) => setForm({ ...form, isHiring: e.target.checked })}
              className="rounded"
            />
            <span className="font-medium">We&apos;re hiring</span>
          </label>

          {form.isHiring && (
            <>
              <label className="block text-sm">
                <span className="font-medium">Job title</span>
                <input
                  value={form.jobTitle}
                  onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                  placeholder="e.g. Sales Associate, Barista, Driver"
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium">Job description</span>
                <textarea
                  value={form.jobDescription}
                  onChange={(e) => setForm({ ...form, jobDescription: e.target.value })}
                  rows={4}
                  placeholder="Describe the role, responsibilities, and what a typical day looks like."
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium">Requirements</span>
                <textarea
                  value={form.jobRequirements}
                  onChange={(e) => setForm({ ...form, jobRequirements: e.target.value })}
                  rows={3}
                  placeholder="Experience, certifications, skills, or schedule requirements."
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </label>
            </>
          )}
        </div>
      </Card>

      {form.isHiring && (
        <Card>
          <JobApplicationFormEditor
            form={form.jobApplicationForm}
            onChange={(jobApplicationForm: JobApplicationFormConfig) =>
              setForm({ ...form, jobApplicationForm })
            }
          />
        </Card>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-emerald-700">Job listing saved.</p>}

      <button
        type="button"
        disabled={pending}
        onClick={handleSave}
        className="min-h-11 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save job listing"}
      </button>
    </div>
  );
}
