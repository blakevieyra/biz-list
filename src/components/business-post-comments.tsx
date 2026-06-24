import type { BusinessPostComment } from "@/lib/types";

export function BusinessPostComments({
  comments,
  limit,
}: {
  comments: BusinessPostComment[];
  limit?: number;
}) {
  const visible = limit ? comments.slice(-limit) : comments;
  if (!visible.length) return null;

  return (
    <ul className="space-y-2.5">
      {visible.map((item) => (
        <li key={item.id} className="text-sm leading-relaxed">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{item.authorName}</span>
            {item.isOwnerReply && (
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                Reply from business
              </span>
            )}
          </div>
          <p className="mt-0.5 text-muted">{item.body}</p>
        </li>
      ))}
    </ul>
  );
}
