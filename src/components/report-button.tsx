"use client";

import { useState } from "react";

type ReportTarget =
  | { type: "post"; id: string; title?: string }
  | { type: "forum_post"; id: string; title?: string }
  | { type: "collaboration"; id: string; title?: string }
  | { type: "listing"; id: string; name?: string }
  | { type: "page"; path: string; label?: string };

function buildSubject(target: ReportTarget): string {
  switch (target.type) {
    case "post": return `Report: Business post${target.title ? ` — "${target.title}"` : ""}`;
    case "forum_post": return `Report: Forum post${target.title ? ` — "${target.title}"` : ""}`;
    case "collaboration": return `Report: Collaboration${target.title ? ` — "${target.title}"` : ""}`;
    case "listing": return `Report: Business listing${target.name ? ` — "${target.name}"` : ""}`;
    case "page": return `Report: Page${target.label ? ` — ${target.label}` : ""}`;
  }
}

function buildBody(target: ReportTarget): string {
  const id = target.type === "page" ? target.path : target.id;
  return `Please describe the issue:\n\n\n---\nContent ID: ${id}\nContent type: ${target.type}\nPage: ${typeof window !== "undefined" ? window.location.href : ""}`;
}

export function ReportButton({
  target,
  className,
}: {
  target: ReportTarget;
  className?: string;
}) {
  const [sent, setSent] = useState(false);

  function handleReport() {
    const subject = encodeURIComponent(buildSubject(target));
    const body = encodeURIComponent(buildBody(target));
    window.location.href = `mailto:support@bizlist.co?subject=${subject}&body=${body}`;
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  }

  return (
    <button
      type="button"
      onClick={handleReport}
      className={
        className ??
        "text-xs text-muted hover:text-red-600 transition-colors"
      }
      title="Report this content to BizList support"
    >
      {sent ? "Reported" : "Report"}
    </button>
  );
}
