import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createStripeClient, type StripeEnv } from "@/lib/stripe.server";

const ACTIVE = ["card_required", "ready", "payment_pending", "failed"];

/**
 * Detaches saved cards from Stripe for bids that are closed (someone else hired)
 * or expired (done-by date passed). A card still used by another active bid is
 * left attached. Idempotent: rows are marked with card_released_at.
 */
export async function releaseFinishedBidCards(admin: SupabaseClient<Database>, projectId?: string) {
  if (!projectId) await admin.rpc("expire_past_due_projects");
  let q = admin
    .from("bid_payments")
    .select("id, environment, stripe_payment_method_id")
    .in("status", ["closed", "expired"])
    .is("card_released_at", null)
    .limit(200);
  if (projectId) q = q.eq("project_id", projectId);
  const { data: rows } = await q;
  let released = 0;
  for (const row of rows ?? []) {
    try {
      const pm = row.stripe_payment_method_id;
      if (pm) {
        const { count } = await admin
          .from("bid_payments")
          .select("id", { count: "exact", head: true })
          .eq("stripe_payment_method_id", pm)
          .in("status", ACTIVE);
        if (!count) {
          const stripe = createStripeClient(row.environment as StripeEnv);
          await stripe.paymentMethods.detach(pm).catch((e: { code?: string }) => {
            if (e?.code !== "resource_missing" && !/not attached/i.test(String((e as Error)?.message))) throw e;
          });
        }
      }
      await admin.from("bid_payments").update({ card_released_at: new Date().toISOString() }).eq("id", row.id);
      released++;
    } catch (error) {
      console.error("Card release failed", row.id, error);
    }
  }
  return released;
}
