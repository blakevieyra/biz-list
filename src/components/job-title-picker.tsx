"use client";

import { JOB_TITLE_CATALOG, JOB_TITLE_CATEGORIES } from "@/lib/job-titles";

export function JobTitlePicker({
  selected,
  onChange,
  label = "Target job titles",
  hint,
}: {
  selected: string[];
  onChange: (titles: string[]) => void;
  label?: string;
  hint?: string;
}) {
  function toggle(title: string) {
    onChange(
      selected.includes(title)
        ? selected.filter((item) => item !== title)
        : [...selected, title].slice(0, 8),
    );
  }

  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      <div className="mt-3 space-y-3">
        {JOB_TITLE_CATEGORIES.map((category) => (
          <div key={category}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{category}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {JOB_TITLE_CATALOG[category].map((title) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => toggle(title)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    selected.includes(title)
                      ? "bg-accent text-white"
                      : "border border-border bg-card text-muted hover:text-foreground"
                  }`}
                >
                  {title}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
