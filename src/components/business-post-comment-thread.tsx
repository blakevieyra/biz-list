"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { commentOnBusinessPost, deleteBusinessPostComment, editBusinessPostComment } from "@/lib/actions/business";
import { uploadCommentAttachment } from "@/lib/actions/upload";
import { ContentLikeButton } from "@/components/content-like-button";
import { organizeCommentThreads } from "@/lib/comments/thread";
import { isImageUrl } from "@/lib/media/post-media";
import { formatPostDateTime } from "@/components/ui";
import type { BusinessPostComment } from "@/lib/types";

function memberInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function CommentAuthorAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string | null;
}) {
  const initials = memberInitials(name) || "?";

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className="h-8 w-8 shrink-0 rounded-full border border-border object-cover"
      />
    );
  }

  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-slate-100 text-xs font-semibold text-accent"
      aria-hidden
    >
      {initials}
    </div>
  );
}

function CommentAttachment({ url }: { url: string }) {
  if (isImageUrl(url)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1.5 inline-block overflow-hidden rounded-lg border border-border"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="max-h-24 max-w-[10rem] object-cover" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 inline-flex text-xs text-accent hover:underline"
    >
      View attachment
    </a>
  );
}

function CommentItem({
  comment,
  businessId,
  currentUserId,
  depth,
  replyToId,
  onReply,
}: {
  comment: BusinessPostComment;
  businessId: string;
  currentUserId: string | null;
  depth: number;
  replyToId: string | null;
  onReply: (commentId: string) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [actionPending, startAction] = useTransition();
  const isReplyTarget = replyToId === comment.id;
  const isOwn = !!currentUserId && comment.authorId === currentUserId;

  function handleDelete() {
    if (!confirm("Delete this comment?")) return;
    startAction(async () => {
      await deleteBusinessPostComment(comment.id);
      router.refresh();
    });
  }

  function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    startAction(async () => {
      await editBusinessPostComment(comment.id, editBody);
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <li className={depth > 0 ? "ml-6 border-l border-border pl-3" : undefined}>
      <div
        className={`rounded-lg py-1 ${isReplyTarget ? "bg-accent/5 px-2 ring-1 ring-accent/20" : ""}`}
      >
        <div className="flex gap-2">
          <CommentAuthorAvatar name={comment.authorName} avatarUrl={comment.authorAvatarUrl} />
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-snug">
              <span className="font-medium text-foreground">{comment.authorName}</span>
              <span className="text-xs text-muted">
                {" "}
                · {formatPostDateTime(comment.createdAt)}
              </span>
              {comment.isOwnerReply && (
                <span className="ml-1.5 inline-flex rounded-full bg-accent/10 px-2 py-0.5 align-middle text-[11px] font-medium text-accent">
                  Reply from business
                </span>
              )}
            </p>
            {editing ? (
              <form onSubmit={handleEditSave} className="mt-1 flex gap-2">
                <input
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-border px-2 py-1 text-sm"
                  autoFocus
                />
                <button type="submit" disabled={actionPending} className="text-xs font-medium text-accent hover:underline disabled:opacity-50">
                  Save
                </button>
                <button type="button" onClick={() => { setEditing(false); setEditBody(comment.body); }} className="text-xs text-muted hover:underline">
                  Cancel
                </button>
              </form>
            ) : (
              <div className="mt-0.5 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed text-muted">{comment.body}</p>
                  {comment.attachmentUrl && <CommentAttachment url={comment.attachmentUrl} />}
                </div>
                <div className="flex shrink-0 items-center gap-2 self-start">
                  <ContentLikeButton
                    businessId={businessId}
                    targetType="comment"
                    targetId={comment.id}
                    initialCount={comment.likeCount ?? 0}
                    initialLiked={comment.likedByViewer ?? false}
                    size="sm"
                  />
                  {currentUserId && (
                    <button
                      type="button"
                      onClick={() => onReply(comment.id)}
                      className="text-xs font-medium text-accent hover:underline"
                    >
                      Reply
                    </button>
                  )}
                  {isOwn && (
                    <>
                      <button type="button" onClick={() => setEditing(true)} className="text-xs text-muted hover:text-foreground">
                        Edit
                      </button>
                      <button type="button" onClick={handleDelete} disabled={actionPending} className="text-xs text-muted hover:text-red-600 disabled:opacity-50">
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {comment.replies && comment.replies.length > 0 && (
        <ul className="mt-2 space-y-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              businessId={businessId}
              currentUserId={currentUserId}
              depth={depth + 1}
              replyToId={replyToId}
              onReply={onReply}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function BusinessPostCommentThread({
  postId,
  businessId,
  comments,
  currentUserId,
  placeholder = "Add a comment...",
  submitLabel = "Reply",
}: {
  postId: string;
  businessId: string;
  comments: BusinessPostComment[];
  currentUserId: string | null;
  placeholder?: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [uploadPending, setUploadPending] = useState(false);
  const [body, setBody] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const threaded = useMemo(() => organizeCommentThreads(comments), [comments]);
  const replyTarget = replyToId
    ? comments.find((c) => c.id === replyToId) ??
      comments.flatMap((c) => c.replies ?? []).find((c) => c.id === replyToId)
    : null;

  function handleReply(commentId: string) {
    setReplyToId(commentId);
    setError(null);
  }

  function clearReplyTarget() {
    setReplyToId(null);
  }

  async function handleAttachment(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!currentUserId) {
      router.push("/auth/login");
      return;
    }

    setUploadPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadCommentAttachment(formData);
    setUploadPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.url) setAttachmentUrl(result.url);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() && !attachmentUrl) return;
    if (!currentUserId) {
      router.push("/auth/login");
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await commentOnBusinessPost(postId, body.trim() || "📎", {
        parentCommentId: replyToId ?? undefined,
        attachmentUrl: attachmentUrl ?? undefined,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setBody("");
      setAttachmentUrl(null);
      setReplyToId(null);
      router.refresh();
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 max-h-full flex-1 overflow-y-auto overscroll-contain pr-1">
        {threaded.length > 0 ? (
          <ul className="space-y-2.5">
            {threaded.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                businessId={businessId}
                currentUserId={currentUserId}
                depth={0}
                replyToId={replyToId}
                onReply={handleReply}
              />
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted">No comments yet.</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-3 shrink-0 space-y-2 border-t border-border pt-3">
        {replyTarget && (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs">
            <span className="text-muted">
              Replying to <span className="font-medium text-foreground">{replyTarget.authorName}</span>
            </span>
            <button
              type="button"
              onClick={clearReplyTarget}
              className="font-medium text-accent hover:underline"
            >
              Cancel
            </button>
          </div>
        )}

        {attachmentUrl && (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachmentUrl}
              alt=""
              className="max-h-16 rounded-lg border border-border object-cover"
            />
            <button
              type="button"
              onClick={() => setAttachmentUrl(null)}
              className="absolute -right-1 -top-1 rounded-full bg-black/70 px-1.5 text-[10px] text-white"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => void handleAttachment(e.target.files)}
          />
          <button
            type="button"
            disabled={uploadPending || pending}
            onClick={() => fileRef.current?.click()}
            title="Attach a small image (max 512 KB)"
            className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-sm text-muted hover:text-foreground disabled:opacity-50"
            aria-label="Attach image"
          >
            📎
          </button>
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={replyTarget ? `Reply to ${replyTarget.authorName}...` : placeholder}
            className="min-h-10 min-w-0 flex-1 rounded-lg border border-border bg-white px-2.5 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={pending || uploadPending || (!body.trim() && !attachmentUrl)}
            className="min-h-10 shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "…" : submitLabel}
          </button>
        </div>
        {error && <p className="shrink-0 text-xs text-red-600">{error}</p>}
      </form>
    </div>
  );
}

/** Read-only comment list (no composer). */
export function BusinessPostComments({
  comments,
  limit,
}: {
  comments: BusinessPostComment[];
  limit?: number;
}) {
  const visible = limit ? comments.slice(-limit) : comments;
  const threaded = useMemo(() => organizeCommentThreads(visible), [visible]);
  if (!threaded.length) return null;

  return (
    <ul className="space-y-2.5">
      {threaded.map((comment) => (
        <li key={comment.id} className="text-sm leading-relaxed">
          <div className="flex gap-2">
            <CommentAuthorAvatar name={comment.authorName} avatarUrl={comment.authorAvatarUrl} />
            <p className="min-w-0 flex-1">
              <span className="font-medium">{comment.authorName}</span>
              <span className="text-xs text-muted">
                {" "}
                · {formatPostDateTime(comment.createdAt)}
              </span>
              {comment.isOwnerReply && (
                <span className="ml-1.5 inline-flex rounded-full bg-accent/10 px-2 py-0.5 align-middle text-[11px] font-medium text-accent">
                  Reply from business
                </span>
              )}
              <span className="text-muted"> {comment.body}</span>
            </p>
          </div>
          {comment.attachmentUrl && (
            <div className="ml-10">
              <CommentAttachment url={comment.attachmentUrl} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
