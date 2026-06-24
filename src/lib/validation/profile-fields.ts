import { normalizeZipCode } from "@/lib/feed/location-scope";
import {
  isIndustryOption,
  isValidIndustryInterest,
  isValidSubcategory,
} from "@/lib/industries";

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
  const values = interests.filter((item) => isValidIndustryInterest(item));
  if (interests.length > 0 && values.length === 0) {
    return { values: [], error: "Pick specific business types from the provided list." };
  }
  return { values, error: null };
}

export function validateBusinessCategory(
  category: string,
  subcategory?: string,
): {
  category: string;
  subcategory: string;
  error: string | null;
} {
  const trimmed = category.trim();
  if (!trimmed || !isIndustryOption(trimmed)) {
    return { category: "", subcategory: "", error: "Pick an industry from the provided list." };
  }
  const sub = (subcategory ?? "").trim();
  if (!sub || !isValidSubcategory(trimmed, sub)) {
    return {
      category: "",
      subcategory: "",
      error: "Pick a specific business type under your industry.",
    };
  }
  return { category: trimmed, subcategory: sub, error: null };
}
