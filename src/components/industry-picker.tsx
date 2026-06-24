"use client";

import {
  INDUSTRY_CATALOG,
  INDUSTRY_OPTIONS,
  INDUSTRY_SEPARATOR,
  formatIndustryTag,
  getSubcategories,
  isIndustryOption,
  isValidSubcategory,
  type IndustryOption,
} from "@/lib/industries";

/** Business: pick one parent category and one subcategory. */
export function CategoryPicker({
  category,
  subcategory,
  onChange,
  label = "Business category",
  hint,
}: {
  category: string;
  subcategory: string;
  onChange: (next: { category: string; subcategory: string }) => void;
  label?: string;
  hint?: string;
}) {
  const subs = category ? getSubcategories(category) : [];

  return (
    <fieldset className="space-y-4">
      <div>
        <legend className="text-sm font-medium">{label}</legend>
        {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Industry</p>
        <div className="flex flex-wrap gap-2">
          {INDUSTRY_OPTIONS.map((parent) => (
            <button
              key={parent}
              type="button"
              onClick={() => onChange({ category: parent, subcategory: "" })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                category === parent
                  ? "bg-accent text-white"
                  : "border border-border bg-background text-muted"
              }`}
            >
              {parent}
            </button>
          ))}
        </div>
      </div>

      {category && subs.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Specific type
          </p>
          <div className="flex flex-wrap gap-2">
            {subs.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => onChange({ category, subcategory: sub })}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  subcategory === sub
                    ? "bg-accent text-white"
                    : "border border-border bg-background text-muted"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      )}

      {category && subcategory && (
        <p className="text-xs text-muted">
          Listed as:{" "}
          <span className="font-medium text-foreground">
            {formatIndustryTag(category, subcategory)}
          </span>
        </p>
      )}
    </fieldset>
  );
}

/** Customer: multi-select specific subcategories (grouped by industry). */
export function IndustryPicker({
  selected,
  onChange,
  label = "Industries you care about",
  hint,
}: {
  selected: string[];
  onChange: (industries: string[]) => void;
  label?: string;
  hint?: string;
}) {
  function toggle(tag: string) {
    onChange(selected.includes(tag) ? selected.filter((i) => i !== tag) : [...selected, tag]);
  }

  return (
    <fieldset>
      <legend className="text-sm font-medium">{label}</legend>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      <div className="mt-4 space-y-5">
        {INDUSTRY_OPTIONS.map((parent) => (
          <div key={parent}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{parent}</p>
            <div className="flex flex-wrap gap-2">
              {INDUSTRY_CATALOG[parent].map((sub) => {
                const tag = formatIndustryTag(parent, sub);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggle(tag)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                      selected.includes(tag)
                        ? "bg-accent text-white"
                        : "border border-border bg-background text-muted"
                    }`}
                  >
                    {sub}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

export function parseStoredCategory(category: string, subcategory?: string) {
  if (subcategory) return { category, subcategory };
  if (category.includes(INDUSTRY_SEPARATOR)) {
    const [parent, ...rest] = category.split(INDUSTRY_SEPARATOR);
    return { category: parent ?? "", subcategory: rest.join(INDUSTRY_SEPARATOR) };
  }
  return { category, subcategory: "" };
}

export { isIndustryOption, isValidSubcategory, type IndustryOption };
