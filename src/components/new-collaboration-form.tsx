"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { createCollaboration } from "@/lib/actions/social";
import { uploadCollaborationAttachment } from "@/lib/actions/upload";
import { Card } from "@/components/ui";
import type { CollaborationType } from "@/lib/types";

// Per-type copy
const TYPE_CONFIG: Record<
  CollaborationType,
  {
    heading: string;
    description: string;
    titleLabel: string;
    titlePlaceholder: string;
    summaryLabel: string;
    summaryPlaceholder: string;
    requirementsLabel: string;
    requirementsPlaceholder: string;
    lookingForLabel: string;
    lookingForPlaceholder: string;
    deadlineLabel: string;
    submitLabel: string;
  }
> = {
  proposal: {
    heading: "Create Proposal",
    description:
      "Share a collaboration opportunity with local businesses. Describe what you're proposing and the type of partner you need.",
    titleLabel: "Proposal title",
    titlePlaceholder: "e.g. Co-branded holiday pop-up event",
    summaryLabel: "What are you proposing?",
    summaryPlaceholder:
      "Describe your proposal in detail — what you're offering, the opportunity, and what success looks like...",
    requirementsLabel: "Partner requirements",
    requirementsPlaceholder:
      "What specific qualifications, experience, or resources are you looking for in a partner?",
    lookingForLabel: "Type of partner",
    lookingForPlaceholder: "e.g. Retail store, marketing agency, restaurant...",
    deadlineLabel: "Proposal deadline",
    submitLabel: "Publish Proposal",
  },
  contract: {
    heading: "Create Contract Opportunity",
    description:
      "Post a contract opportunity for businesses or freelancers to bid on. Specify the scope of work and your requirements.",
    titleLabel: "Contract title",
    titlePlaceholder: "e.g. Website redesign for retail brand",
    summaryLabel: "Scope of work",
    summaryPlaceholder:
      "Describe the project scope, deliverables, timeline, and any relevant background...",
    requirementsLabel: "Requirements & qualifications",
    requirementsPlaceholder:
      "List specific qualifications, certifications, experience level, or tools required...",
    lookingForLabel: "Type of contractor",
    lookingForPlaceholder: "e.g. Web developer, graphic designer, logistics company...",
    deadlineLabel: "Bid / application deadline",
    submitLabel: "Publish Contract",
  },
  b2b_sale: {
    heading: "Create B2B Sale",
    description:
      "List a product, service, or bundle you're selling to other businesses. Include pricing details and buyer requirements.",
    titleLabel: "What are you selling?",
    titlePlaceholder: "e.g. Bulk wholesale coffee supplies for cafes",
    summaryLabel: "Product / service description",
    summaryPlaceholder:
      "Describe what you're selling, pricing tiers, volume minimums, and what makes it a great deal...",
    requirementsLabel: "Buyer requirements",
    requirementsPlaceholder:
      "Minimum order quantity, business type, industry, or other buyer qualifications...",
    lookingForLabel: "Target buyer",
    lookingForPlaceholder: "e.g. Restaurant owners, retail shops, event planners...",
    deadlineLabel: "Offer expires",
    submitLabel: "Publish Sale",
  },
};

const TYPE_TABS: { value: CollaborationType; label: string }[] = [
  { value: "proposal", label: "Proposal" },
  { value: "contract", label: "Contract" },
  { value: "b2b_sale", label: "B2B Sale" },
];

export function NewCollaborationForm({ initialType }: { initialType: CollaborationType }) {
  const router = useRouter();
  const [collaborationType, setCollaborationType] = useState<CollaborationType>(initialType);
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
  const [uploadPending, startUploadTransition] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formPending, startFormTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cfg = TYPE_CONFIG[collaborationType];

  function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploadError(null);
    startUploadTransition(async () => {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.set("file", file);
        const result = await uploadCollaborationAttachment(fd);
        if (result.error) {
          setUploadError(result.error);
          return;
        }
        if (result.url) uploaded.push(result.url);
      }
      setAttachmentUrls((prev) => [...prev, ...uploaded]);
    });
  }

  function removeAttachment(url: string) {
    setAttachmentUrls((prev) => prev.filter((u) => u !== url));
  }

  function isDocUrl(url: string) {
    const lower = url.toLowerCase();
    return (
      lower.includes(".pdf") ||
      lower.includes(".doc") ||
      lower.includes(".docx") ||
      lower.includes(".xls") ||
      lower.includes(".xlsx") ||
      lower.includes(".txt")
    );
  }

  function filenameFromUrl(url: string) {
    const parts = url.split("/");
    return decodeURIComponent(parts[parts.length - 1] ?? url);
  }

  return (
    <Card>
      {/* Dynamic heading + description */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold">{cfg.heading}</h2>
        <p className="mt-1 text-sm text-muted">{cfg.description}</p>
      </div>

      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startFormTransition(async () => {
            setFormError(null);
            const result = await createCollaboration({
              title: String(fd.get("title") ?? ""),
              summary: String(fd.get("summary") ?? ""),
              requirements: String(fd.get("requirements") ?? "") || undefined,
              deadline: String(fd.get("deadline") ?? "") || undefined,
              attachmentUrls,
              lookingFor: String(fd.get("lookingFor") ?? ""),
              location: String(fd.get("location") ?? ""),
              collaborationType,
            });
            if (result.error) {
              setFormError(result.error);
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
        {/* Title */}
        <Field label={cfg.titleLabel} name="title" placeholder={cfg.titlePlaceholder} required />

        {/* Summary */}
        <Field
          label={cfg.summaryLabel}
          name="summary"
          placeholder={cfg.summaryPlaceholder}
          multiline
          rows={5}
          required
        />

        {/* Requirements */}
        <Field
          label={cfg.requirementsLabel}
          name="requirements"
          placeholder={cfg.requirementsPlaceholder}
          multiline
          rows={4}
          hint="Be specific about what you need — this helps you get better responses."
        />

        {/* Looking for + Location row */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={cfg.lookingForLabel}
            name="lookingFor"
            placeholder={cfg.lookingForPlaceholder}
            required
          />
          <Field
            label="Location"
            name="location"
            placeholder="City, state or remote"
            required
          />
        </div>

        {/* Deadline */}
        <label className="block text-sm">
          <span className="font-medium">{cfg.deadlineLabel}</span>
          <span className="ml-1 text-xs text-muted">(optional)</span>
          <input
            type="date"
            name="deadline"
            min={new Date().toISOString().split("T")[0]}
            className="mt-1 block w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring"
          />
        </label>

        {/* Attachments */}
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">Attachments</p>
            <p className="mt-0.5 text-xs text-muted">
              Add photos, PDFs, Word docs, or spreadsheets (images up to 10 MB, docs up to 25 MB).
            </p>
          </div>

          {attachmentUrls.length > 0 && (
            <div className="space-y-2">
              {/* Image previews */}
              {attachmentUrls.filter((u) => !isDocUrl(u)).length > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {attachmentUrls
                    .filter((u) => !isDocUrl(u))
                    .map((url) => (
                      <div
                        key={url}
                        className="relative overflow-hidden rounded-xl border border-border bg-slate-100"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="aspect-square w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeAttachment(url)}
                          className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                </div>
              )}
              {/* Doc list */}
              {attachmentUrls.filter(isDocUrl).map((url) => (
                <div
                  key={url}
                  className="flex items-center gap-2 rounded-xl border border-border bg-slate-50 px-3 py-2"
                >
                  <span className="text-lg">📄</span>
                  <span className="flex-1 truncate text-sm">{filenameFromUrl(url)}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(url)}
                    className="shrink-0 text-xs text-muted hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            type="button"
            disabled={uploadPending}
            onClick={() => fileInputRef.current?.click()}
            className="min-h-11 rounded-full border border-dashed border-border px-4 py-2 text-sm font-medium hover:border-accent/40 disabled:opacity-50"
          >
            {uploadPending
              ? "Uploading..."
              : attachmentUrls.length
                ? "Add more files"
                : "Attach files"}
          </button>
          {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
        </div>

        {formError && <p className="text-sm text-red-600">{formError}</p>}

        <button
          type="submit"
          disabled={formPending || uploadPending}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {formPending ? "Publishing..." : cfg.submitLabel}
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
  rows = 4,
  hint,
  required,
}: {
  label: string;
  name: string;
  placeholder: string;
  multiline?: boolean;
  rows?: number;
  hint?: string;
  required?: boolean;
}) {
  const className =
    "mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring";

  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      {!required && <span className="ml-1 text-xs text-muted">(optional)</span>}
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      {multiline ? (
        <textarea
          name={name}
          rows={rows}
          placeholder={placeholder}
          className={className}
          required={required}
        />
      ) : (
        <input name={name} placeholder={placeholder} className={className} required={required} />
      )}
    </label>
  );
}
