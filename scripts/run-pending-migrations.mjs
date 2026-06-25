#!/usr/bin/env node
/**
 * Applies only migrations added after the events/customer_pro release.
 * Usage: node scripts/run-pending-migrations.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

const PENDING = [
  "supabase/migrations/20260624270000_comment_threads_attachments.sql",
  "supabase/migrations/20260624300000_job_application_form.sql",
  "supabase/migrations/20260624310000_collaboration_types_comments.sql",
  "supabase/migrations/20260624320000_profile_avatar_url.sql",
  "supabase/migrations/20260624330000_profile_country.sql",
];

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
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Missing DATABASE_URL in .env.local");
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  await client.connect();
  console.log("Connected to Supabase Postgres\n");

  try {
    for (const relativePath of PENDING) {
      const filePath = path.join(root, relativePath);
      const sql = fs.readFileSync(filePath, "utf8");
      console.log(`▶ ${relativePath}`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("COMMIT");
        console.log("  ✓ done\n");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }

    console.log("✅ Pending migrations applied successfully.");
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error("\n❌ Migration failed:", err.message);
  process.exit(1);
});
