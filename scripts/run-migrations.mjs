#!/usr/bin/env node
/**
 * Applies pending Supabase migrations in order.
 *
 * Best option — paste from Supabase Dashboard → Connect → URI:
 *   DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-us-west-2.pooler.supabase.com:6543/postgres
 *
 * Or set:
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_DB_PASSWORD=your-db-password
 *   SUPABASE_DB_REGION=us-west-2   (optional, default us-west-2)
 *
 * Usage: npm run db:migrate
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

const MIGRATIONS = [
  "supabase/fix-plan-tier-enum.sql",
  "supabase/migrations/20260623160000_business_platform.sql",
  "supabase/migrations/20260623180000_security_hardening.sql",
  "supabase/migrations/20260623200000_pending_signups.sql",
  "supabase/migrations/20260623210000_business_media_and_profiles.sql",
  "supabase/migrations/20260624200000_business_social_jobs_feed.sql",
  "supabase/migrations/20260624210000_zip_industry_discovery.sql",
  "supabase/migrations/20260624220000_service_orders.sql",
  "supabase/migrations/20260624230000_geo_radius.sql",
  "supabase/migrations/20260624240000_business_post_types.sql",
  "supabase/migrations/20260624250000_business_subcategory.sql",
  "supabase/migrations/20260624260000_county_and_content_likes.sql",
];

const POOLER_REGIONS = [
  process.env.SUPABASE_DB_REGION,
  "us-west-2",
  "us-west-1",
  "us-east-1",
  "us-east-2",
  "eu-west-1",
  "eu-central-1",
  "ap-southeast-1",
].filter(Boolean);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value) process.env[key] = value;
    else if (!process.env[key]) process.env[key] = value;
  }
}

function getProjectRef() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  return url.replace(/^https?:\/\//, "").split(".")[0];
}

function buildConnectionCandidates() {
  const urls = [];

  if (process.env.DATABASE_URL) {
    urls.push({ label: "DATABASE_URL from .env.local", url: process.env.DATABASE_URL });
  }

  const password = process.env.SUPABASE_DB_PASSWORD;
  const ref = getProjectRef();
  if (!password || !ref) return urls;

  const enc = encodeURIComponent(password);

  for (const region of [...new Set(POOLER_REGIONS)]) {
    urls.push({
      label: `Pooler transaction (${region}:6543)`,
      url: `postgresql://postgres.${ref}:${enc}@aws-0-${region}.pooler.supabase.com:6543/postgres`,
    });
    urls.push({
      label: `Pooler session (${region}:5432)`,
      url: `postgresql://postgres.${ref}:${enc}@aws-0-${region}.pooler.supabase.com:5432/postgres`,
    });
  }

  urls.push({
    label: "Direct database host",
    url: `postgresql://postgres:${enc}@db.${ref}.supabase.co:5432/postgres`,
  });

  return urls;
}

async function tryConnect(candidates) {
  const errors = [];

  for (const { label, url } of candidates) {
    const host = url.match(/@([^:/]+)/)?.[1] ?? label;
    console.log(`Trying ${label} (${host})...`);

    const client = new pg.Client({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    });

    try {
      await client.connect();
      console.log(`✓ Connected via ${label}\n`);
      return client;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`  • ${label}: ${message}`);
      await client.end().catch(() => {});
    }
  }

  throw new Error(
    `Could not connect to Supabase Postgres.\n\n${errors.join("\n")}\n\n` +
      `Fix:\n` +
      `1. Open Supabase Dashboard → your project → Settings → Database\n` +
      `2. If project says "Paused", click Restore project\n` +
      `3. Click Connect → copy the "Transaction pooler" URI\n` +
      `4. Add to .env.local as DATABASE_URL=... (full string)\n` +
      `5. Run npm run db:migrate again\n\n` +
      `Or run SQL manually: Supabase → SQL Editor → paste supabase/apply-all-pending.sql`,
  );
}

async function runSql(client, sql, label) {
  console.log(`▶ ${label}`);
  await client.query(sql);
  console.log(`  ✓ done`);
}

async function main() {
  const candidates = buildConnectionCandidates();
  if (!candidates.length) {
    console.error(`
Missing database credentials in .env.local.

Add either:
  DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-us-west-2.pooler.supabase.com:6543/postgres

Or:
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_DB_PASSWORD=your-database-password
`);
    process.exit(1);
  }

  const client = await tryConnect(candidates);

  try {
    for (const relativePath of MIGRATIONS) {
      const filePath = path.join(root, relativePath);
      if (!fs.existsSync(filePath)) {
        console.warn(`  ⚠ Skipping missing file: ${relativePath}`);
        continue;
      }

      const sql = fs.readFileSync(filePath, "utf8");

      await client.query("BEGIN");
      try {
        await runSql(client, sql, relativePath);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }

    const { rows } = await client.query(`
      select enumlabel as plan_tier
      from pg_enum e
      join pg_type t on e.enumtypid = t.oid
      where t.typname = 'plan_tier'
      order by e.enumsortorder
    `);
    console.log("\nplan_tier values:", rows.map((r) => r.plan_tier).join(", "));
    console.log("\n✅ All migrations applied successfully.");
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error("\n❌ Migration failed:", err.message);
  process.exit(1);
});
