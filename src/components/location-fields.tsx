"use client";

import { useState } from "react";
import { US_STATES, COMMON_COUNTRIES } from "@/lib/geo/us-states";

export interface LocationValues {
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface LocationFieldsProps {
  values: LocationValues;
  onChange: (values: LocationValues) => void;
}

export function LocationFields({ values, onChange }: LocationFieldsProps) {
  const [zipLooking, setZipLooking] = useState(false);

  const isUS = !values.country || values.country === "US" || values.country === "United States";

  async function handleZipLookup() {
    const zip = values.zipCode.replace(/\D/g, "").slice(0, 5);
    if (zip.length !== 5) return;
    setZipLooking(true);
    try {
      const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
      if (!res.ok) return;
      const data = await res.json() as {
        places?: { "place name": string; state: string; "state abbreviation": string }[];
      };
      const place = data.places?.[0];
      if (place) {
        onChange({
          ...values,
          city: place["place name"],
          state: place.state,
          country: "US",
        });
      }
    } catch {
      // silently ignore lookup failure
    } finally {
      setZipLooking(false);
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* City */}
      <label className="block text-sm">
        <span className="font-medium">City</span>
        <input
          value={values.city}
          onChange={(e) => onChange({ ...values, city: e.target.value })}
          placeholder="Fresno"
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
        />
      </label>

      {/* State */}
      <label className="block text-sm">
        <span className="font-medium">State</span>
        {isUS ? (
          <select
            value={values.state}
            onChange={(e) => onChange({ ...values, state: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm bg-background"
          >
            <option value="">Select state…</option>
            {US_STATES.map((s) => (
              <option key={s.abbr} value={s.name}>{s.name}</option>
            ))}
          </select>
        ) : (
          <input
            value={values.state}
            onChange={(e) => onChange({ ...values, state: e.target.value })}
            placeholder="Province / region"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        )}
      </label>

      {/* Zip code with autofill */}
      <label className="block text-sm">
        <span className="font-medium">Zip / Postal code</span>
        <div className="mt-1 flex gap-1.5">
          <input
            value={values.zipCode}
            onChange={(e) => onChange({ ...values, zipCode: e.target.value })}
            onBlur={() => { if (isUS && values.zipCode.replace(/\D/g, "").length === 5) handleZipLookup(); }}
            placeholder="93702"
            maxLength={10}
            className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2 text-sm"
          />
          {isUS && (
            <button
              type="button"
              onClick={handleZipLookup}
              disabled={zipLooking || values.zipCode.replace(/\D/g, "").length !== 5}
              title="Auto-fill city & state from zip"
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground disabled:opacity-40"
            >
              {zipLooking ? "…" : "Fill"}
            </button>
          )}
        </div>
      </label>

      {/* Country */}
      <label className="block text-sm">
        <span className="font-medium">Country</span>
        <select
          value={values.country || "US"}
          onChange={(e) => onChange({ ...values, country: e.target.value })}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm bg-background"
        >
          {COMMON_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
