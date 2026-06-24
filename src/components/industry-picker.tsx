"use client";

import { INDUSTRY_OPTIONS } from "@/lib/industries";

export function IndustryPicker({
  selected,
  onChange,
  multiple = true,
  label = "Industries",
  hint,
}: {
  selected: string[];
  onChange: (industries: string[]) => void;
  multiple?: boolean;
  label?: string;
  hint?: string;
}) {
  function toggle(industry: string) {
    if (multiple) {
      onChange(
        selected.includes(industry)
          ? selected.filter((i) => i !== industry)
          : [...selected, industry],
      );
      return;
    }
    onChange(selected.includes(industry) ? [] : [industry]);
  }

  return (
    <fieldset>
      <legend className="text-sm font-medium">{label}</legend>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {INDUSTRY_OPTIONS.map((industry) => (
          <button
            key={industry}
            type="button"
            onClick={() => toggle(industry)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              selected.includes(industry)
                ? "bg-accent text-white"
                : "border border-border bg-background text-muted"
            }`}
          >
            {industry}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
