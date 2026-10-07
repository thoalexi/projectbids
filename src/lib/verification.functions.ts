import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { createStripeClient, getStripeErrorMessage, type StripeEnv } from "@/lib/stripe.server";

export const VERIFICATION_FEE_CENTS = 500;

type ApplicationInput = {
  businessName: string;
  trade?: string | null;
  website?: string | null;
  googleUrl?: string | null;
  yelpUrl?: string | null;
  thumbtackUrl?: string | null;
  insured: boolean;
  insuranceDetails?: string | null;
  portfolioImages: string[];
  environment: StripeEnv;
};

const clean = (v: string | null | undefined, max: number) => (v ?? "").trim().slice(0, max) || null;
const url = (v: string | null | undefined) => {
  const s = clean(v, 300);
  return s && /^https:\/\//i.test(s) ? s : null;
};

export const startVerificationApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ApplicationInput) => {
    if (d.environment !== "sandbox" && d.environment !== "live") throw new Error("Invalid environment");
    if (!d.businessName?.trim()) throw new Error("Business name is required");
    if (!Array.isArray(d.portfolioImages) || d.portfolioImages.length < 3) throw new Error("Add at least 3 photos of past work");
    return d;
  })
  .handler(async ({ data, context }) => {
    try {
      const reviews = [url(data.googleUrl), url(data.yelpUrl), url(data.thumbtackUrl)].filter(Boolean);
      if (reviews.length === 0) throw new Error("Add at least one Google, Yelp, or Thumbtack review link");
      const images = data.portfolioImages.filter((p) => typeof p === "string" && p.startsWith(`storage:${context.userId}/`)).slice(0, 10);
      if (images.length < 3) throw new Error("Add at least 3 photos of past work");

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: existing } = await supabaseAdmin.from("contractor_verifications").select("*").eq("user_id", context.userId).maybeSingle();
      if (existing && (existing.status === "pending_review" || existing.status === "approved")) {
        throw new Error(existing.status === "approved" ? "You're already a Verified Pro" : "Your application is already under review");
      }
      // A rejected applicant who already paid can resubmit without paying again.
      const alreadyPaid = existing?.status === "rejected" && !!existing.stripe_payment_intent_id;
      const fields = {
        user_id: context.userId,
        business_name: data.businessName.trim().slice(0, 120),
        trade: clean(data.trade, 60),
        website: url(data.website),
        google_url: url(data.googleUrl),
        yelp_url: url(data.yelpUrl),
        thumbtack_url: url(data.thumbtackUrl),
        insured: !!data.insured,
        insurance_details: clean(data.insuranceDetails, 300),
        portfolio_images: images as Json,
        environment: data.environment,
        status: alreadyPaid ? "pending_review" : "payment_required",
        admin_note: alreadyPaid ? null : existing?.admin_note ?? null,
        submitted_at: alreadyPaid ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };
      const { data: row, error } = await supabaseAdmin.from("contractor_verifications").upsert(fields, { onConflict: "user_id" }).select("id").single();
      if (error || !row) throw error ?? new Error("Could not save application");
      if (alreadyPaid) return { submitted: true as const };

      const stripe = createStripeClient(data.environment);
      const { data: authData } = await context.supabase.auth.getUser();
      const intent = await stripe.paymentIntents.create({
        amount: VERIFICATION_FEE_CENTS,
        currency: "usd",
        payment_method_types: ["card"],
        description: "Beam Bids Verified Pro application",
        ...(authData.user?.email ? { receipt_email: authData.user.email } : {}),
        metadata: { kind: "verification", applicationId: row.id, userId: context.userId },
      });
      await supabaseAdmin.from("contractor_verifications").update({ stripe_payment_intent_id: intent.id }).eq("id", row.id);
      if (!intent.client_secret) throw new Error("Payment could not be started");
      return { clientSecret: intent.client_secret };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const confirmVerificationPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { environment: StripeEnv }) => d)
  .handler(async ({ data, context }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: app } = await supabaseAdmin.from("contractor_verifications").select("*").eq("user_id", context.userId).maybeSingle();
      if (!app?.stripe_payment_intent_id) throw new Error("No application found");
      if (app.status !== "payment_required") return { status: app.status };
      const stripe = createStripeClient(data.environment);
      const intent = await stripe.paymentIntents.retrieve(app.stripe_payment_intent_id);
      if (intent.status !== "succeeded" || intent.metadata?.["userId"] !== context.userId) throw new Error("Payment has not gone through yet");
      await supabaseAdmin.from("contractor_verifications").update({ status: "pending_review", submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", app.id).eq("status", "payment_required");
      return { status: "pending_review" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Admins only");
}

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return !!data;
  });

export const listVerificationApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { data, error } = await context.supabase
      .from("contractor_verifications")
      .select("*")
      .neq("status", "payment_required")
      .order("submitted_at", { ascending: true });
    if (error) throw error;
    return data;
  });

export const reviewVerificationApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; decision: "approved" | "rejected"; note?: string }) => {
    if (!d.id || (d.decision !== "approved" && d.decision !== "rejected")) throw new Error("Invalid decision");
    return d;
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("contractor_verifications")
      .update({ status: data.decision, admin_note: data.note?.trim().slice(0, 500) || null, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .in("status", ["pending_review", "approved", "rejected"]);
    if (error) throw error;
    return { ok: true };
  });
