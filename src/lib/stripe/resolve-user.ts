import type { SupabaseClient } from "@supabase/supabase-js";

export async function resolveBillingUserId(
  supabase: SupabaseClient,
  input: {
    metadataUserId?: string | null;
    stripeCustomerId?: string | null;
  },
): Promise<string | null> {
  const customerId =
    typeof input.stripeCustomerId === "string" ? input.stripeCustomerId : null;

  if (customerId) {
    const { data: byCustomer } = await supabase
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    if (byCustomer?.id) {
      if (input.metadataUserId && input.metadataUserId !== byCustomer.id) {
        console.warn(
          "[stripe] metadata userId does not match stripe_customer_id mapping",
        );
      }
      return byCustomer.id;
    }
  }

  if (input.metadataUserId) {
    const { data: byId } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", input.metadataUserId)
      .maybeSingle();

    if (byId?.id) return byId.id;
  }

  return null;
}
