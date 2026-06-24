import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
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

loadEnv(".env.local");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data: diego } = await supabase
  .from("profiles")
  .select("id, display_name, email")
  .eq("email", "diego@demo.allconnect.app")
  .maybeSingle();

if (!diego) {
  console.log("Diego profile not found");
  process.exit(0);
}

const { data: convos } = await supabase
  .from("conversations")
  .select("id, participant_a, participant_b, business_id")
  .or(`participant_a.eq.${diego.id},participant_b.eq.${diego.id}`);

console.log(JSON.stringify({ diego, conversationCount: convos?.length ?? 0, conversations: [] }, null, 2));

for (const c of convos ?? []) {
  const otherId = c.participant_a === diego.id ? c.participant_b : c.participant_a;
  const { data: other } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", otherId)
    .single();
  const { data: msgs } = await supabase
    .from("messages")
    .select("sender_id, body, created_at, read")
    .eq("conversation_id", c.id)
    .order("created_at");

  console.log("\n--- Conversation with", other?.display_name, `(${other?.email})`);
  for (const m of msgs ?? []) {
    const from = m.sender_id === diego.id ? "Diego" : other?.display_name;
    console.log(`  [${m.created_at}] ${from}: ${m.body}`);
  }
}
