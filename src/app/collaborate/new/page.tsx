"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createCollaboration } from "@/lib/actions/social";
import { Card, PageHeader } from "@/components/ui";

export default function NewCollaborationPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/collaborate" className="text-sm text-accent hover:underline">
        ← Back
      </Link>
      <PageHeader
        title="Propose a joint venture"
        description="Describe your idea and the kind of partner you're looking for."
      />
      <Card>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);

            startTransition(async () => {
              setError(null);
              const result = await createCollaboration({
                title: String(formData.get("title") ?? ""),
                summary: String(formData.get("summary") ?? ""),
                lookingFor: String(formData.get("lookingFor") ?? ""),
                location: String(formData.get("location") ?? ""),
              });
              if (result.error) {
                setError(result.error);
                return;
              }
              router.push("/collaborate");
            });
          }}
        >
          <Field label="Title" name="title" placeholder="e.g. Co-branded holiday pop-up" />
          <Field
            label="Summary"
            name="summary"
            placeholder="What are you proposing?"
            multiline
          />
          <Field
            label="Looking for"
            name="lookingFor"
            placeholder="Type of business or skills you need"
          />
          <Field label="Location" name="location" placeholder="City, state or region" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? "Publishing..." : "Publish idea"}
          </button>
        </form>
      </Card>
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
  multiline,
}: {
  label: string;
  name: string;
  placeholder: string;
  multiline?: boolean;
}) {
  const className =
    "mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring";

  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      {multiline ? (
        <textarea name={name} rows={4} placeholder={placeholder} className={className} required />
      ) : (
        <input name={name} placeholder={placeholder} className={className} required />
      )}
    </label>
  );
}
