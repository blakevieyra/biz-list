import { normalizeZipCode } from "@/lib/feed/location-scope";
import { INDUSTRY_OPTIONS, type IndustryOption } from "@/lib/industries";

const INDUSTRY_SET = new Set<string>(INDUSTRY_OPTIONS);

export function validateZipCode(zip: string): string | null {
  const normalized = normalizeZipCode(zip);
  if (normalized.length !== 5) {
    return "Enter a valid 5-digit US zip code.";
  }
  return null;
}

export function validateLocationFields(input: {
  city: string;
  state: string;
  zipCode?: string;
}): { error: string | null; zipCode: string } {
  if (!input.city.trim() || !input.state.trim()) {
    return { error: "City and state are required.", zipCode: "" };
  }
  if (input.zipCode !== undefined) {
    const zipError = validateZipCode(input.zipCode);
    if (zipError) return { error: zipError, zipCode: "" };
    return { error: null, zipCode: normalizeZipCode(input.zipCode) };
  }
  return { error: null, zipCode: "" };
}

export function validateIndustryInterests(interests: string[]): {
  values: string[];
  error: string | null;
} {
  const values = interests.filter((item): item is IndustryOption =>
    INDUSTRY_SET.has(item),
  );
  if (interests.length > 0 && values.length === 0) {
    return { values: [], error: "Pick industries from the provided list." };
  }
  return { values, error: null };
}

export function validateBusinessCategory(category: string): {
  value: string;
  error: string | null;
} {
  const trimmed = category.trim();
  if (!trimmed) {
    return { value: "", error: "Industry is required." };
  }
  if (!INDUSTRY_SET.has(trimmed)) {
    return { value: "", error: "Pick an industry from the provided list." };
  }
  return { value: trimmed, error: null };
}
