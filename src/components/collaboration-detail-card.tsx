"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CollaborationInterestedButton } from "@/components/collaboration-interested-button";
import {
  submitCollaborationOffer,
  commentOnCollaboration,
  deleteCollaboration,
} from "@/lib/actions/social";
import { uploadCollaborationAttachment } from "@/lib/actions/upload";
import { ReportButton } from "@/components/report-button";
import type { CollaborationComment, CollaborationIdea } from "@/lib/types";
import { Card, formatPostDateTime } from "@/components/ui";

const statusStyles = {
  open: "bg-emerald-100 text-emerald-800",
  in_discussion: "bg-amber-100 text-amber-800",
  closed: "bg-slate-100 text-slate-600",
};

const typeLabels: Record<string, string> = {
  proposal: "Proposal",
  contract: "Contract",
  b2b_sale: "B2B Sale",
};

const offerHeading: Record<string, string> = {
  proposal: "Submit a proposal offer",
  contract: "Submit a contract response",
  b2b_sale: "Submit a bid",
};

const offerPlaceholder: Record<string, string> = {
  proposal:
    "Describe your offer — what you can provide, your timeline, and why you're a good fit...",
  contract: "Outline your contract terms, deliverables, and pricing...",
  b2b_sale: "Describe what you're selling, pricing, and how it benefits them...",
};

const offerButtonLabel: Record<string, string> = {
  proposal: "Submit offer",
  contract: "Submit response",
  b2b_sale: "Submit bid",
};

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

function AttachmentList({ urls }: { urls: string[] }) {
  if (!urls.length) return null;
  const images = urls.filter((u) => !isDocUrl(u));
  const docs = urls.filter(isDocUrl);
  return (
    <div className="mt-3 space-y-2">
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((url) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="aspect-square w-full rounded-xl border border-border object-cover hover:opacity-90 transition"
              />
            </a>
          ))}
        </div>
      )}
      {docs.map((url) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl border border-border bg-slate-50 px-3 py-2 hover:border-accent/40 transition"
        >
          <span className="text-lg">📄</span>
          <span className="flex-1 truncate text-sm text-accent hover:underline">
            {filenameFromUrl(url)}
          </span>
        </a>
      ))}
    </div>
  );
}

function AttachmentUploader({
  attachmentUrls,
  setAttachmentUrls,
  label = "Attach files",
}: {
  attachmentUrls: string[];
  setAttachmentUrls: React.Dispatch<React.SetStateAction<string[]>>;
  label?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadPending, startUploadTransition] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  return (
    <div className="space-y-2">
      {attachmentUrls.length > 0 && (
        <div className="space-y-1.5">
          {attachmentUrls.filter((u) => !isDocUrl(u)).length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {attachmentUrls
                .filter((u) => !isDocUrl(u))
                .map((url) => (
                  <div key={url} className="relative overflow-hidden rounded-xl border border-border bg-slate-100">
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
          {attachmentUrls.filter(isDocUrl).map((url) => (
            <div key={url} className="flex items-center gap-2 rounded-xl border border-border bg-slate-50 px-3 py-2">
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
        className="rounded-full border border-dashed border-border px-4 py-1.5 text-xs font-medium hover:border-accent/40 disabled:opacity-50"
      >
        {uploadPending ? "Uploading..." : attachmentUrls.length ? "Add more files" : label}
      </button>
      {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
    </div>
  );
}

export function CollaborationDetailCard({
  idea,
  comments,
  currentUserId,
  currentUserName,
}: {
  idea: CollaborationIdea;
  comments: CollaborationComment[];
  currentUserId: string | null;
  currentUserName: string | null;
}) {
  const router = useRouter();
  const [offerPending, startOfferTransition] = useTransition();
  const [commentPending, startCommentTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();
  const [offerText, setOfferText] = useState("");
  const [commentText, setCommentText] = useState("");
  const [offerAttachments, setOfferAttachments] = useState<string[]>([]);
  const [commentAttachments, setCommentAttachments] = useState<string[]>([]);
  const [offerSent, setOfferSent] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);

  const isAuthor = currentUserId === idea.authorId;
  const interestCount = idea.interestedCount ?? 0;
  const type = idea.collaborationType;

  function handleDelete() {
    if (!confirm("Delete this collaboration? This cannot be undone.")) return;
    startDeleteTransition(async () => {
      await deleteCollaboration(idea.id);
      router.push("/partnerships");
    });
  }

  function handleOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!offerText.trim()) return;
    if (!currentUserId) { router.push("/auth/login"); return; }
    startOfferTransition(async () => {
      setOfferError(null);
      const result = await submitCollaborationOffer(idea.id, offerText.trim(), offerAttachments);
      if (result.error) { setOfferError(result.error); return; }
      setOfferText("");
      setOfferAttachments([]);
      setOfferSent(true);
      router.refresh();
    });
  }

  function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    if (!currentUserId) { router.push("/auth/login"); return; }
    startCommentTransition(async () => {
      setCommentError(null);
      const result = await commentOnCollaboration(idea.id, commentText.trim(), commentAttachments);
      if (result.error) { setCommentError(result.error); return; }
      setCommentText("");
      setCommentAttachments([]);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Main card */}
      <Card>
        {/* Author row */}
        <div className="flex items-center gap-3">
          {idea.authorAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={idea.authorAvatarUrl}
              alt={idea.authorName}
              className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-base font-semibold text-accent">
              {idea.authorName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-medium">{idea.authorName}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-accent">
                {typeLabels[type] ?? type}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[idea.status]}`}>
                {idea.status.replace("_", " ")}
              </span>
              <span className="text-xs text-muted">{formatPostDateTime(idea.createdAt)}</span>
            </div>
          </div>
        </div>

        <h1 className="mt-4 text-2xl font-bold leading-snug">{idea.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{idea.summary}</p>

        {/* Requirements */}
        {idea.requirements && (
          <div className="mt-4 rounded-xl border border-border bg-slate-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Requirements</p>
            <p className="mt-1.5 text-sm leading-relaxed">{idea.requirements}</p>
          </div>
        )}

        <dl className="mt-4 grid gap-3 rounded-xl border border-border bg-slate-50/60 p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Looking for</dt>
            <dd className="mt-1 font-medium">{idea.lookingFor}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Location</dt>
            <dd className="mt-1 font-medium">{idea.location}</dd>
          </div>
          {idea.deadline && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Deadline</dt>
              <dd className="mt-1 font-medium">
                {new Date(idea.deadline).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </dd>
            </div>
          )}
        </dl>

        {/* Attachments */}
        {idea.attachmentUrls.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Attachments</p>
            <AttachmentList urls={idea.attachmentUrls} />
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {!isAuthor && (
            currentUserId ? (
              <CollaborationInterestedButton
                collaborationId={idea.id}
                initialInterested={Boolean(idea.userInterested)}
              />
            ) : (
              <CollaborationInterestedButton
                collaborationId={idea.id}
                initialInterested={false}
                requiresAuth
              />
            )
          )}
          <span className="text-sm text-muted">
            {interestCount} {interestCount === 1 ? "person" : "people"} interested
          </span>
          {isAuthor && (
            <button
              type="button"
              disabled={deletePending}
              onClick={handleDelete}
              className="ml-auto text-xs text-muted hover:text-red-600 transition-colors disabled:opacity-50"
            >
              {deletePending ? "Deleting…" : "Delete"}
            </button>
          )}
          {!isAuthor && currentUserId && (
            <span className="ml-auto">
              <ReportButton target={{ type: "collaboration", id: idea.id, title: idea.title }} />
            </span>
          )}
        </div>
      </Card>

      {/* Offer form — shown to non-authors only */}
      {!isAuthor && (
        <Card>
          <h2 className="font-semibold">{offerHeading[type] ?? "Submit an offer"}</h2>
          <p className="mt-1 text-sm text-muted">
            Your offer will be sent directly to {idea.authorName} and appear in the discussion below.
          </p>
          {offerSent ? (
            <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
              Your offer was sent! {idea.authorName} has been notified.
            </div>
          ) : (
            <form onSubmit={handleOffer} className="mt-4 space-y-3">
              <textarea
                value={offerText}
                onChange={(e) => setOfferText(e.target.value)}
                rows={5}
                placeholder={offerPlaceholder[type] ?? "Describe your offer..."}
                className="w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <AttachmentUploader
                attachmentUrls={offerAttachments}
                setAttachmentUrls={setOfferAttachments}
                label="Attach supporting files"
              />
              {offerError && <p className="text-sm text-red-600">{offerError}</p>}
              <button
                type="submit"
                disabled={offerPending || !offerText.trim()}
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {offerPending ? "Sending…" : (offerButtonLabel[type] ?? "Submit offer")}
              </button>
            </form>
          )}
        </Card>
      )}

      {/* Discussion */}
      <Card>
        <h2 className="font-semibold">Discussion</h2>
        <p className="mt-1 text-sm text-muted">
          {isAuthor
            ? "Offers and questions from interested parties appear here. Reply to continue the conversation."
            : "Ask questions or follow up on your offer below."}
        </p>

        {comments.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No messages yet.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {comments.map((comment) => (
              <li key={comment.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{comment.authorName}</span>
                  <span className="text-xs text-muted">{formatPostDateTime(comment.createdAt)}</span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{comment.body}</p>
                {comment.attachmentUrls.length > 0 && (
                  <AttachmentList urls={comment.attachmentUrls} />
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Reply form */}
        {currentUserId && (
          <form onSubmit={handleComment} className="mt-4 space-y-3">
            <div className="flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={isAuthor ? "Reply to an offer or add more details..." : "Ask a follow-up question..."}
                className="min-h-10 min-w-0 flex-1 rounded-xl border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={commentPending || !commentText.trim()}
                className="min-h-10 shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {commentPending ? "Sending…" : "Reply"}
              </button>
            </div>
            <AttachmentUploader
              attachmentUrls={commentAttachments}
              setAttachmentUrls={setCommentAttachments}
              label="Attach files to reply"
            />
            {commentError && <p className="text-sm text-red-600">{commentError}</p>}
          </form>
        )}
      </Card>
    </div>
  );
}
