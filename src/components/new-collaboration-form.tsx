"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createCollaboration } from "@/lib/actions/social";
import { Card } from "@/components/ui";
import type { CollaborationType } from "@/lib/types";

const typeOptions: { value: CollaborationType; label: string }[] = [
  { value: "proposal", label: "Proposal" },
  { value: "contract", label: "Contract" },
  { value: "b2b_sale", label: "B2B sale" },
];

export function NewCollaborationForm({ initialType }: { initialType: CollaborationType }) {
  const router = useRouter();
  const [collaborationType, setCollaborationType] = useState<CollaborationType>(initialType);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
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
              collaborationType,
            });
            if (result.error) {
              setError(result.error);
              return;
            }
            router.push(
              collaborationType === "proposal"
                ? "/partnerships"
                : `/partnerships?tab=${collaborationType}`,
            );
          });
        }}
      >
        <label className="block text-sm">
          <span className="font-medium">Type</span>
          <select
            value={collaborationType}
            onChange={(e) => setCollaborationType(e.target.value as CollaborationType)}
            className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Field label="Title" name="title" placeholder="e.g. Co-branded holiday pop-up" />
        <Field label="Summary" name="summary" placeholder="What are you proposing?" multiline />
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
          {pending ? "Publishing..." : "Publish"}
        </button>
      </form>
    </Card>
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
