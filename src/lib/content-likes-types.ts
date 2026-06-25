export type ContentLikeTarget = "post" | "service" | "photo" | "comment";

export type ContentLikeState = {
  counts: Record<string, number>;
  userLiked: string[];
};

export function contentLikeKey(targetType: ContentLikeTarget, targetId: string): string {
  return `${targetType}:${targetId}`;
}

export function isContentLiked(state: ContentLikeState, targetType: ContentLikeTarget, targetId: string): boolean {
  return state.userLiked.includes(contentLikeKey(targetType, targetId));
}
