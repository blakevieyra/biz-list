/**
 * Admin endpoint: seed dummy test accounts and run comprehensive functionality tests.
 * POST /api/admin/test-accounts?action=seed   — create accounts
 * POST /api/admin/test-accounts?action=test   — run tests + audit
 * POST /api/admin/test-accounts?action=clean  — delete test accounts
 *
 * Caller must be authenticated as an owner email.
 */
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const OWNER_EMAILS = ["blake.vieyra@gmail.com", "blakevieyra@gmail.com", "maria@demo.allconnect.app"];

const TEST_PASSWORD = "BizList@Test2026!";

const TEST_ACCOUNTS = [
  {
    email: "test-business-free@bizlist.app",
    role: "business" as const,
    plan: "free" as const,
    displayName: "Jake Morrison",
    businessName: "Morrison Auto Repair",
    category: "Automotive & Transport",
    city: "Austin",
    state: "TX",
    description: "Family-owned auto repair shop serving Austin since 2015. Oil changes, brakes, engine work.",
    tagline: "Honest repairs, fair prices",
    services: [{ name: "Oil change", price: "$45" }, { name: "Brake inspection", price: "$30" }],
  },
  {
    email: "test-business-pro@bizlist.app",
    role: "business" as const,
    plan: "pro" as const,
    displayName: "Sarah Kim",
    businessName: "Bloom Wellness Studio",
    category: "Health & Wellness",
    city: "Austin",
    state: "TX",
    description: "Boutique yoga and wellness studio offering classes, private sessions, and corporate wellness programs.",
    tagline: "Where balance begins",
    services: [{ name: "Group yoga class", price: "$22" }, { name: "Private session (60 min)", price: "$95" }],
    isHiring: true,
  },
  {
    email: "test-business-platinum@bizlist.app",
    role: "business" as const,
    plan: "platinum" as const,
    displayName: "Marcus Webb",
    businessName: "Webb Digital Creative",
    category: "Marketing & Print",
    city: "Austin",
    state: "TX",
    description: "Full-service digital creative agency specialising in branding, web design, and social media campaigns for local businesses.",
    tagline: "Creative work that converts",
    services: [{ name: "Brand identity package", price: "$1,800" }, { name: "Monthly social media mgmt", price: "$850/mo" }, { name: "Website design (5 pages)", price: "$2,500" }],
    isHiring: false,
    intents: ["b2b", "proposal"],
  },
  {
    email: "test-org-pro@bizlist.app",
    role: "organization" as const,
    plan: "pro" as const,
    displayName: "Lisa Nguyen",
    businessName: "Austin Small Biz Alliance",
    category: "Professional Services",
    city: "Austin",
    state: "TX",
    description: "Nonprofit organization supporting small businesses in Austin through networking, education, and advocacy.",
    tagline: "Stronger together",
    services: [{ name: "Annual membership", price: "$150/yr" }, { name: "Business workshop", price: "$75" }],
  },
  {
    email: "test-marketer-platinum@bizlist.app",
    role: "marketer" as const,
    plan: "platinum" as const,
    displayName: "Devon Price",
    businessName: "Price Growth Partners",
    category: "Marketing & Print",
    city: "Round Rock",
    state: "TX",
    description: "Performance marketing consultancy focused on paid search, email campaigns, and conversion optimisation for e-commerce and local businesses.",
    tagline: "Growth you can measure",
    services: [{ name: "Paid ads audit", price: "$500" }, { name: "Monthly retainer", price: "$2,000/mo" }],
    intents: ["b2b", "contract", "proposal"],
  },
  {
    email: "test-customer-free@bizlist.app",
    role: "customer" as const,
    plan: "free" as const,
    displayName: "Jordan Lee",
    city: "Austin",
    state: "TX",
    bio: "Freelance photographer and coffee enthusiast. Always looking for great local spots.",
  },
];

async function requireOwner() {
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Admin unavailable", admin: null, callerId: null };
  const supabase = await createClient();
  if (!supabase) return { error: "DB unavailable", admin: null, callerId: null };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", admin: null, callerId: null };
  if (!OWNER_EMAILS.includes(user.email?.toLowerCase() ?? "")) {
    return { error: `Forbidden — caller: ${user.email}`, admin: null, callerId: null };
  }
  return { error: null, admin, callerId: user.id };
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") ?? "test";

  const { error, admin } = await requireOwner();
  if (error || !admin) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });

  // ── CLEAN ────────────────────────────────────────────────────────
  if (action === "clean") {
    const testEmails = TEST_ACCOUNTS.map((a) => a.email);
    const { data: allUsers } = await admin.auth.admin.listUsers();
    const toDelete = (allUsers?.users ?? []).filter((u) => testEmails.includes(u.email ?? ""));
    const deleted: string[] = [];
    for (const u of toDelete) {
      await admin.auth.admin.deleteUser(u.id);
      deleted.push(u.email ?? u.id);
    }
    return NextResponse.json({ action: "clean", deleted, count: deleted.length });
  }

  // ── SEED ────────────────────────────────────────────────────────
  if (action === "seed") {
    const results: Record<string, unknown>[] = [];

    for (const acct of TEST_ACCOUNTS) {
      // Create or find auth user
      const { data: allUsers } = await admin.auth.admin.listUsers();
      let authUser = allUsers?.users?.find((u) => u.email === acct.email);

      if (!authUser) {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: acct.email,
          password: TEST_PASSWORD,
          email_confirm: true,
        });
        if (createErr || !created.user) {
          results.push({ email: acct.email, status: "error", error: createErr?.message });
          continue;
        }
        authUser = created.user;
      }

      const userId = authUser.id;

      // Upsert profile
      await admin.from("profiles").upsert({
        id: userId,
        display_name: acct.displayName,
        role: acct.role,
        plan_tier: acct.plan,
        city: acct.city,
        state: acct.state,
        bio: "bio" in acct ? acct.bio : acct.description,
        onboarding_completed: true,
      }, { onConflict: "id" });

      // Create business listing for non-customer accounts
      if (acct.role !== "customer" && "businessName" in acct) {
        const { data: existing } = await admin
          .from("businesses")
          .select("id")
          .eq("owner_id", userId)
          .maybeSingle();

        if (!existing) {
          await admin.from("businesses").insert({
            owner_id: userId,
            name: acct.businessName,
            category: acct.category,
            city: acct.city,
            state: acct.state,
            description: acct.description,
            tagline: acct.tagline,
            services: JSON.stringify(acct.services ?? []),
            is_hiring: (acct as { isHiring?: boolean }).isHiring ?? false,
            intents: (acct as { intents?: string[] }).intents ?? [],
          });
        }
      }

      results.push({
        email: acct.email,
        userId,
        role: acct.role,
        plan: acct.plan,
        displayName: acct.displayName,
        status: "seeded",
        password: TEST_PASSWORD,
      });
    }

    return NextResponse.json({ action: "seed", results, count: results.length });
  }

  // ── TEST ────────────────────────────────────────────────────────
  const FEATURE_MATRIX: Record<string, string[]> = {
    free: ["directoryListing", "businessPosts", "messaging", "networking", "workGroups", "servicesListing", "customerLikes", "reviews"],
    pro: ["directoryListing", "businessPosts", "messaging", "networking", "workGroups", "servicesListing", "customerLikes", "reviews", "localLeads", "aiAudit", "trendingBoost", "analytics"],
    platinum: ["directoryListing", "businessPosts", "messaging", "networking", "workGroups", "servicesListing", "customerLikes", "reviews", "localLeads", "aiAudit", "trendingBoost", "analytics", "automatedMarketing", "virtualAgent"],
  };

  const ALL_FEATURES = ["directoryListing", "businessPosts", "messaging", "networking", "workGroups", "servicesListing", "customerLikes", "reviews", "localLeads", "aiAudit", "trendingBoost", "analytics", "automatedMarketing", "virtualAgent"];

  const { data: allUsers } = await admin.auth.admin.listUsers();
  const testResults: Record<string, unknown>[] = [];
  let auditResult: Record<string, unknown> | null = null;

  for (const acct of TEST_ACCOUNTS) {
    const authUser = allUsers?.users?.find((u) => u.email === acct.email);
    if (!authUser) {
      testResults.push({ email: acct.email, status: "NOT_FOUND — run ?action=seed first" });
      continue;
    }

    const userId = authUser.id;

    // Verify profile
    const { data: profile } = await admin.from("profiles").select("*").eq("id", userId).maybeSingle();

    // Verify business
    const { data: business } = acct.role !== "customer"
      ? await admin.from("businesses").select("id,name,category,is_hiring,intents").eq("owner_id", userId).maybeSingle()
      : { data: null };

    // Feature gate check
    const allowed = FEATURE_MATRIX[acct.plan] ?? [];
    const featureGates = Object.fromEntries(
      ALL_FEATURES.map((f) => [f, allowed.includes(f) ? "✅ ALLOWED" : "🔒 GATED"])
    );

    // Run audit for platinum business (1 full audit to demonstrate)
    let audit: Record<string, unknown> | null = null;
    if (acct.plan === "platinum" && acct.role === "business" && business && !auditResult) {
      try {
        const origin = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://bizlist.app";
        const auditProfile = {
          businessName: (acct as { businessName: string }).businessName,
          category: (acct as { category: string }).category,
          cityState: `${acct.city}, ${acct.state}`,
          website: "",
          description: (acct as { description: string }).description,
          tagline: (acct as { tagline: string }).tagline,
          services: (acct as { services: { name: string; price: string }[] }).services,
          phone: "",
          hours: "Mon–Fri 9am–6pm",
          isHiring: false,
        };

        // Phase 1: research stream
        const streamRes = await fetch(`${origin}/api/audit/research-stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessName: auditProfile.businessName,
            category: auditProfile.category,
            cityState: auditProfile.cityState,
            website: auditProfile.website,
            description: auditProfile.description,
          }),
        });

        let research: Record<string, string> = {};
        if (streamRes.ok) {
          const text = await streamRes.text();
          for (const line of text.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            try {
              const ev = JSON.parse(line.slice(6));
              if (ev.done && ev.research) research = ev.research as Record<string, string>;
            } catch { /* skip */ }
          }
        }

        // Phase 2: generate
        const genRes = await fetch(`${origin}/api/audit/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile: auditProfile, research }),
        });
        const genData = await genRes.json() as { result?: { overallScore?: number; internalScore?: number; externalScore?: number; sections?: { id: string; score: number; summary: string }[]; priorityActions?: { priority: string; action: string }[]; executiveSummary?: string }; error?: string };

        if (genData.result) {
          audit = {
            status: "✅ AUDIT COMPLETE",
            overallScore: genData.result.overallScore,
            internalScore: genData.result.internalScore,
            externalScore: genData.result.externalScore,
            executiveSummary: genData.result.executiveSummary,
            sections: (genData.result.sections ?? []).map((s) => ({
              id: s.id,
              score: s.score,
              summary: s.summary?.slice(0, 120),
            })),
            topPriorityActions: (genData.result.priorityActions ?? [])
              .filter((a) => a.priority === "high")
              .map((a) => a.action)
              .slice(0, 3),
          };
          auditResult = audit;
        } else {
          audit = { status: "❌ AUDIT FAILED", error: genData.error };
        }
      } catch (e) {
        audit = { status: "❌ AUDIT ERROR", error: String(e) };
      }
    }

    testResults.push({
      email: acct.email,
      role: acct.role,
      plan: acct.plan,
      displayName: acct.displayName,
      password: TEST_PASSWORD,
      profileVerified: profile ? "✅" : "❌ missing",
      profileRole: profile?.role,
      profilePlan: profile?.plan_tier,
      businessListing: business ? `✅ ${business.name}` : acct.role === "customer" ? "N/A" : "❌ missing",
      businessCategory: business?.category,
      businessIsHiring: business?.is_hiring,
      businessIntents: business?.intents,
      featureGates,
      auditEligible: (acct.plan === "pro" || acct.plan === "platinum") && (acct.role as string) !== "customer" ? "✅ YES" : "🔒 NO",
      auditResult: audit ?? (acct.plan === "platinum" && (acct.role as string) === "business" ? "skipped (already ran one)" : undefined),
    });
  }

  return NextResponse.json({
    action: "test",
    password: TEST_PASSWORD,
    timestamp: new Date().toISOString(),
    accountsTested: testResults.length,
    results: testResults,
  });
}
