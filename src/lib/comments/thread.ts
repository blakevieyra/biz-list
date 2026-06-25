import type { BusinessPostComment } from "@/lib/types";

/** Flatten a comment tree (including nested replies) into a single list. */
export function flattenCommentTree(comments: BusinessPostComment[]): BusinessPostComment[] {
  const out: BusinessPostComment[] = [];
  function walk(list: BusinessPostComment[]) {
    for (const item of list) {
      const { replies, ...rest } = item;
      out.push(rest);
      if (replies?.length) walk(replies);
    }
  }
  walk(comments);
  return out;
}

/** Nest flat comments by parentId for threaded display. */
export function organizeCommentThreads(comments: BusinessPostComment[]): BusinessPostComment[] {
  const sorted = [...comments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const byId = new Map<string, BusinessPostComment>(
    sorted.map((c) => [c.id, { ...c, replies: [] as BusinessPostComment[] }]),
  );
  const roots: BusinessPostComment[] = [];

  for (const comment of sorted) {
    const node = byId.get(comment.id);
    if (!node) continue;
    if (comment.parentId && byId.has(comment.parentId)) {
      byId.get(comment.parentId)!.replies!.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
