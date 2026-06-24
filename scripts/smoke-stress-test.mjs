/**
 * Smoke + light stress test against production (or BASE_URL).
 * Usage: node scripts/smoke-stress-test.mjs [baseUrl]
 */
const BASE = process.argv[2] ?? "https://all-connect-seven.vercel.app";

const PUBLIC_ROUTES = [
  "/",
  "/directory",
  "/forum",
  "/collaborate",
  "/groups",
  "/pricing",
  "/auth/login",
  "/auth/signup",
];

const PROTECTED_ROUTES = [
  "/dashboard",
  "/messages",
  "/notifications",
  "/profile/create",
  "/forum/new",
  "/collaborate/new",
  "/dashboard/leads",
  "/dashboard/marketing",
  "/dashboard/assessment",
  "/dashboard/agent",
];

const REDIRECT_ROUTES = [{ path: "/pro", expectLocationIncludes: "/dashboard" }];

const SECURITY_HEADERS = [
  "strict-transport-security",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
];

async function fetchRoute(path, opts = {}) {
  const url = `${BASE}${path}`;
  const start = performance.now();
  const res = await fetch(url, { redirect: "manual", ...opts });
  const ms = Math.round(performance.now() - start);
  return { path, url, status: res.status, ms, headers: res.headers, location: res.headers.get("location") };
}

async function smokePublic() {
  const results = [];
  for (const path of PUBLIC_ROUTES) {
    const r = await fetchRoute(path);
    const ok = r.status >= 200 && r.status < 400;
    results.push({ ...r, ok, kind: "public" });
  }
  return results;
}

async function smokeProtected() {
  const results = [];
  for (const path of PROTECTED_ROUTES) {
    const r = await fetchRoute(path);
    const ok = r.status === 307 || r.status === 302 || r.status === 308;
    const toLogin = r.location?.includes("/auth/login");
    results.push({ ...r, ok: ok && toLogin, kind: "protected", toLogin });
  }
  return results;
}

async function smokeRedirects() {
  const results = [];
  for (const { path, expectLocationIncludes } of REDIRECT_ROUTES) {
    const r = await fetchRoute(path);
    const ok =
      (r.status === 307 || r.status === 302 || r.status === 308) &&
      r.location?.includes(expectLocationIncludes);
    results.push({ ...r, ok, kind: "redirect" });
  }
  return results;
}

async function smokeWebhook() {
  const url = `${BASE}/api/stripe/webhook`;
  const start = performance.now();
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  const ms = Math.round(performance.now() - start);
  return {
    path: "/api/stripe/webhook",
    ok: res.status === 400,
    status: res.status,
    ms,
    note: "POST without stripe-signature should 400",
  };
}

async function smokeSecurityHeaders() {
  const r = await fetchRoute("/");
  const missing = SECURITY_HEADERS.filter((h) => !r.headers.get(h));
  return { ok: missing.length === 0, missing, present: SECURITY_HEADERS.filter((h) => r.headers.get(h)) };
}

async function stressTest(concurrency = 50, requestsPerRoute = 20) {
  const routes = ["/", "/directory", "/pricing", "/auth/login"];
  const all = [];
  for (const path of routes) {
    for (let i = 0; i < requestsPerRoute; i++) {
      all.push(fetchRoute(path));
    }
  }

  const batchSize = concurrency;
  const times = [];
  const statuses = {};
  let errors = 0;

  for (let i = 0; i < all.length; i += batchSize) {
    const batch = await Promise.allSettled(all.slice(i, i + batchSize));
    for (const r of batch) {
      if (r.status === "fulfilled") {
        times.push(r.value.ms);
        statuses[r.value.status] = (statuses[r.value.status] ?? 0) + 1;
      } else {
        errors++;
      }
    }
  }

  times.sort((a, b) => a - b);
  const p50 = times[Math.floor(times.length * 0.5)] ?? 0;
  const p95 = times[Math.floor(times.length * 0.95)] ?? 0;
  const p99 = times[Math.floor(times.length * 0.99)] ?? 0;
  const max = times[times.length - 1] ?? 0;
  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

  return {
    total: all.length,
    concurrency,
    errors,
    statuses,
    latencyMs: { avg, p50, p95, p99, max },
    ok: errors === 0 && (statuses["200"] ?? 0) + (statuses["307"] ?? 0) >= all.length * 0.95,
  };
}

async function burstTest() {
  const path = "/";
  const concurrent = 100;
  const start = performance.now();
  const results = await Promise.allSettled(
    Array.from({ length: concurrent }, () => fetchRoute(path)),
  );
  const elapsed = Math.round(performance.now() - start);
  const ok = results.filter((r) => r.status === "fulfilled" && r.value.status === 200).length;
  return { concurrent, ok, failed: concurrent - ok, elapsedMs: elapsed, rps: Math.round((concurrent / elapsed) * 1000) };
}

console.log(`\n=== AllConnect smoke + stress test ===`);
console.log(`Target: ${BASE}\n`);

const publicResults = await smokePublic();
const protectedResults = await smokeProtected();
const redirectResults = await smokeRedirects();
const webhook = await smokeWebhook();
const headers = await smokeSecurityHeaders();
const stress = await stressTest(50, 25);
const burst = await burstTest();

function printRouteResults(label, rows) {
  console.log(`\n--- ${label} ---`);
  for (const r of rows) {
    const icon = r.ok ? "PASS" : "FAIL";
    console.log(`  [${icon}] ${r.path} → ${r.status}${r.ms != null ? ` (${r.ms}ms)` : ""}${r.location ? ` → ${r.location}` : ""}${r.note ? ` — ${r.note}` : ""}`);
  }
}

printRouteResults("Public routes", publicResults);
printRouteResults("Protected routes (expect login redirect)", protectedResults);
printRouteResults("Redirects", redirectResults);

console.log(`\n--- API security ---`);
console.log(`  [${webhook.ok ? "PASS" : "FAIL"}] ${webhook.path} → ${webhook.status} (${webhook.ms}ms) — ${webhook.note}`);

console.log(`\n--- Security headers (/) ---`);
console.log(`  [${headers.ok ? "PASS" : "FAIL"}] present: ${headers.present.join(", ")}`);
if (headers.missing.length) console.log(`  Missing: ${headers.missing.join(", ")}`);

console.log(`\n--- Stress test (50 concurrent, 25 req × 4 routes = 100 total) ---`);
console.log(`  Status codes: ${JSON.stringify(stress.statuses)}`);
console.log(`  Errors: ${stress.errors}`);
console.log(`  Latency ms — avg: ${stress.latencyMs.avg}, p50: ${stress.latencyMs.p50}, p95: ${stress.latencyMs.p95}, p99: ${stress.latencyMs.p99}, max: ${stress.latencyMs.max}`);
console.log(`  [${stress.ok ? "PASS" : "WARN"}] ${stress.ok ? "Stable under load" : "Some failures or slow responses"}`);

console.log(`\n--- Burst test (100 parallel GET /) ---`);
console.log(`  OK: ${burst.ok}/100 in ${burst.elapsedMs}ms (~${burst.rps} req/s)`);
console.log(`  [${burst.failed === 0 ? "PASS" : "WARN"}] ${burst.failed} failed`);

const publicFail = publicResults.filter((r) => !r.ok).length;
const protectedFail = protectedResults.filter((r) => !r.ok).length;
const totalFail = publicFail + protectedFail + redirectResults.filter((r) => !r.ok).length + (webhook.ok ? 0 : 1) + (headers.ok ? 0 : 1);

console.log(`\n=== Summary ===`);
console.log(`Smoke: ${PUBLIC_ROUTES.length + PROTECTED_ROUTES.length + REDIRECT_ROUTES.length} routes — ${totalFail} failures`);
console.log(`Stress: ${stress.total} requests, ${stress.errors} errors, p95 ${stress.latencyMs.p95}ms`);
process.exit(totalFail > 0 ? 1 : 0);
