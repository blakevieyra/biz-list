import Link from "next/link";
import type { BusinessProfile } from "@/lib/types";
import { Card, IntentBadge } from "./ui";

export function BusinessCard({ business }: { business: BusinessProfile }) {
  return (
    <Link href={`/directory/${business.id}`}>
      <Card className="transition hover:border-accent/40 hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {business.category}
            </p>
            <h3 className="mt-1 text-lg font-semibold">{business.name}</h3>
            <p className="mt-1 text-sm text-muted">{business.tagline}</p>
          </div>
        </div>
        <p className="mt-3 line-clamp-2 text-sm">{business.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {business.intents.map((intent) => (
            <IntentBadge key={intent} intent={intent} />
          ))}
        </div>
        <p className="mt-4 text-xs text-muted">
          {business.city}, {business.state}
        </p>
      </Card>
    </Link>
  );
}
