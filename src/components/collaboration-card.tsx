import type { CollaborationIdea } from "@/lib/types";
import { Card, formatDate } from "./ui";

const statusStyles = {
  open: "bg-emerald-100 text-emerald-800",
  in_discussion: "bg-amber-100 text-amber-800",
  closed: "bg-slate-100 text-slate-600",
};

export function CollaborationCard({ idea }: { idea: CollaborationIdea }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[idea.status]}`}
        >
          {idea.status.replace("_", " ")}
        </span>
        <span className="text-xs text-muted">{formatDate(idea.createdAt)}</span>
      </div>
      <h3 className="mt-3 text-lg font-semibold">{idea.title}</h3>
      <p className="mt-2 text-sm text-muted">{idea.summary}</p>
      <div className="mt-4 space-y-1 text-sm">
        <p>
          <span className="font-medium">Looking for:</span> {idea.lookingFor}
        </p>
        <p>
          <span className="font-medium">Location:</span> {idea.location}
        </p>
        <p className="text-xs text-muted">Posted by {idea.authorName}</p>
      </div>
    </Card>
  );
}
