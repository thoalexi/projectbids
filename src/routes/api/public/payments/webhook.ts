import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

export const Route = createFileRoute("/api/public/payments/webhook")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") return Response.json({ received: true, ignored: "invalid env" });
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          const object = event.data.object as { id?: string; metadata?: Record<string, string>; last_payment_error?: { message?: string } };
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          if (event.type === "payment_intent.succeeded" && object.id && object.metadata?.["kind"] === "verification") {
            await supabaseAdmin.from("contractor_verifications").update({ status: "pending_review", submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("stripe_payment_intent_id", object.id).eq("status", "payment_required");
          } else if (event.type === "payment_intent.succeeded" && object.id) {
            await supabaseAdmin.rpc("finalize_paid_bid", { p_payment_intent_id: object.id });
            const projectId = object.metadata?.["projectId"];
            if (projectId) {
              const { releaseFinishedBidCards } = await import("@/lib/card-release.server");
              await releaseFinishedBidCards(supabaseAdmin, projectId).catch((e) => console.error("Card release", e));
            }
          } else if (event.type === "payment_intent.payment_failed" && object.id) {
            const { data: payment } = await supabaseAdmin.from("bid_payments").select("id, project_id, bid_id").eq("stripe_payment_intent_id", object.id).maybeSingle();
            if (payment) {
              await supabaseAdmin.from("bid_payments").update({ status: "failed", failure_message: object.last_payment_error?.message ?? "The payment failed", updated_at: new Date().toISOString() }).eq("id", payment.id);
              await supabaseAdmin.from("projects").update({ pending_bid_id: null, payment_status: "failed" }).eq("id", payment.project_id).eq("pending_bid_id", payment.bid_id);
            }
          }
          return Response.json({ received: true });
        } catch (error) {
          console.error("Payment webhook error", error);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});