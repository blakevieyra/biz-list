import type { AiAssessment } from "@/lib/types";
import { Card } from "@/components/ui";

function scoreColor(value: number) {
  if (value >= 75) return "text-emerald-700 bg-emerald-50";
  if (value >= 50) return "text-amber-800 bg-amber-50";
  return "text-red-700 bg-red-50";
}

export function AuditTopicBreakdown({
  topics,
  compact = false,
}: {
  topics: NonNullable<AiAssessment["topicBreakdown"]>;
  compact?: boolean;
}) {
  if (!topics.length) return null;

  return (
    <div className={compact ? "mt-4 space-y-3" : "mt-6 space-y-4"}>
      {topics.map((topic) => (
        <Card key={topic.id} className="border-border/80 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">{topic.label}</h3>
              <p className="mt-1 text-sm text-muted">{topic.summary}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm font-bold ${scoreColor(topic.score)}`}
            >
              {topic.score}/100
            </span>
          </div>
          {!compact && topic.findings.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {topic.findings.map((item) => (
                <li key={item} className="text-sm text-muted">
                  • {item}
                </li>
              ))}
            </ul>
          )}
          {!compact && topic.actions.length > 0 && (
            <div className="mt-3 rounded-lg bg-blue-50/60 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                Recommended actions
              </p>
              <ul className="mt-1.5 space-y-1">
                {topic.actions.map((item) => (
                  <li key={item} className="text-sm text-muted">
                    → {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
