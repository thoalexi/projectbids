import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { successFeeCents } from "@/lib/fees";
import { createStripeClient, getStripeErrorMessage, type StripeEnv } from "@/lib/stripe.server";

type BidInput = {
  projectId: string;
  setupIntentId: string;
  amount: number;
  contractorName: string;
  trade?: string | null;
  message: string;
  materials?: number | null;
  labor?: number | null;
  disposal?: number | null;
  durationDays?: number | null;
  earliestStart?: string | null;
  warranty?: string | null;
  insured: boolean;
  licensed?: boolean;
  website?: string | null;
  googleUrl?: string | null;
  yelpUrl?: string | null;
  thumbtackUrl?: string | null;
  portfolioImages: string[];
  questionAnswers: { question: string; answer: string }[];
  environment: StripeEnv;
};

function validEnv(value: unknown): value is StripeEnv {
  return value === "sandbox" || value === "live";
}

async function resolveOrCreateCustomer(stripe: ReturnType<typeof createStripeClient>, options: { email?: string; userId: string }) {
  if (!/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid user");
  const found = await stripe.customers.search({ query: `metadata['userId']:'${options.userId}'`, limit: 1 });
  const firstFound = found.data[0];
  if (firstFound) return firstFound.id;
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    const firstExisting = existing.data[0];
    if (firstExisting) {
      await stripe.customers.update(firstExisting.id, { metadata: { ...firstExisting.metadata, userId: options.userId } });
      return firstExisting.id;
    }
  }
  const created = await stripe.customers.create({ ...(options.email && { email: options.email }), metadata: { userId: options.userId } });
  return created.id;
}

export const createBidCardSetup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { projectId: string; environment: StripeEnv }) => {
    if (!data.projectId || !validEnv(data.environment)) throw new Error("Invalid payment setup");
    return data;
  })
  .handler(async ({ data, context }) => {
    try {
      const { data: project } = await context.supabase
        .from("projects")
        .select("id, owner_id, status, desired_date")
        .eq("id", data.projectId)
        .maybeSingle();
      if (!project || project.owner_id === context.userId || project.status !== "open") throw new Error("This project is not accepting bids");
      if (project.desired_date < new Date().toISOString().slice(0, 10)) throw new Error("This project's done-by date has passed");
      const { count } = await context.supabase.from("bids").select("id", { count: "exact", head: true }).eq("project_id", data.projectId);
      if ((count ?? 0) >= 5) throw new Error("Bidding is full for this project");

      const { data: authData } = await context.supabase.auth.getUser();
      const stripe = createStripeClient(data.environment);
      const customerId = await resolveOrCreateCustomer(stripe, {
        userId: context.userId,
        ...(authData.user?.email ? { email: authData.user.email } : {}),
      });
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        usage: "off_session",
        payment_method_types: ["card"],
        metadata: { userId: context.userId, projectId: data.projectId },
      });
      if (!setupIntent.client_secret) throw new Error("Payment setup did not return a secure form");
      return { clientSecret: setupIntent.client_secret };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const submitBidWithPaymentMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: BidInput) => {
    if (!data.projectId || !data.setupIntentId || !validEnv(data.environment) || !Number.isFinite(data.amount) || data.amount <= 0) throw new Error("Invalid bid");
    return data;
  })
  .handler(async ({ data, context }) => {
    try {
      const stripe = createStripeClient(data.environment);
      const setupIntent = await stripe.setupIntents.retrieve(data.setupIntentId);
      if (setupIntent.status !== "succeeded" || setupIntent.metadata?.["userId"] !== context.userId || setupIntent.metadata?.["projectId"] !== data.projectId) {
        throw new Error("Your payment method could not be verified");
      }
      const paymentMethodId = typeof setupIntent.payment_method === "string" ? setupIntent.payment_method : setupIntent.payment_method?.id;
      const customerId = typeof setupIntent.customer === "string" ? setupIntent.customer : setupIntent.customer?.id;
      if (!paymentMethodId || !customerId) throw new Error("Your payment method could not be verified");

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: used } = await supabaseAdmin.from("bid_payments").select("bid_id").eq("stripe_setup_intent_id", data.setupIntentId).maybeSingle();
      if (used) throw new Error("This payment setup has already been used");
      const { data: project } = await context.supabase.from("projects").select("id, owner_id, status, desired_date").eq("id", data.projectId).maybeSingle();
      if (!project || project.owner_id === context.userId || project.status !== "open") throw new Error("This project is not accepting bids");
      if (project.desired_date < new Date().toISOString().slice(0, 10)) throw new Error("This project's done-by date has passed");

      const { data: bid, error: bidError } = await supabaseAdmin.from("bids").insert({
        project_id: data.projectId,
        contractor_id: context.userId,
        contractor_name: data.contractorName.trim().slice(0, 120) || "Contractor",
        trade: data.trade?.trim().slice(0, 60) || null,
        amount: data.amount,
        message: data.message.trim().slice(0, 1000),
        materials: data.materials ?? null,
        labor: data.labor ?? null,
        disposal: data.disposal ?? null,
        duration_days: data.durationDays ?? null,
        earliest_start: data.earliestStart || null,
        warranty: data.warranty?.trim().slice(0, 40) || null,
        insured: data.insured,
        licensed: !!data.licensed,
        website: data.website || null,
        google_url: data.googleUrl || null,
        yelp_url: data.yelpUrl || null,
        thumbtack_url: data.thumbtackUrl || null,
        portfolio_images: data.portfolioImages as Json,
        question_answers: data.questionAnswers as Json,
      }).select("id").single();
      if (bidError || !bid) throw bidError ?? new Error("Bid could not be created");

      const { error: paymentError } = await supabaseAdmin.from("bid_payments").insert({
        bid_id: bid.id,
        project_id: data.projectId,
        contractor_id: context.userId,
        environment: data.environment,
        stripe_customer_id: customerId,
        stripe_setup_intent_id: data.setupIntentId,
        stripe_payment_method_id: paymentMethodId,
        fee_amount_cents: successFeeCents(data.amount),
        currency: "usd",
        status: "ready",
      });
      if (paymentError) {
        await supabaseAdmin.from("bids").delete().eq("id", bid.id);
        throw paymentError;
      }
      return { bidId: bid.id };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const acceptBidAndChargeFee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { projectId: string; bidId: string; environment: StripeEnv }) => {
    if (!data.projectId || !data.bidId || !validEnv(data.environment)) throw new Error("Invalid bid selection");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: project } = await context.supabase.from("projects").select("id, owner_id, status, desired_date, accepted_bid_id").eq("id", data.projectId).maybeSingle();
    if (!project || project.owner_id !== context.userId) return { error: "Only the homeowner can hire a contractor" };
    if (project.status === "awarded" && project.accepted_bid_id === data.bidId) return { paid: true };
    if (project.status !== "open") return { error: "This project is no longer open" };
    if (project.desired_date < new Date().toISOString().slice(0, 10)) return { error: "The done-by date has passed, so no fee can be charged" };

    const { data: bid } = await supabaseAdmin.from("bids").select("id, project_id, amount").eq("id", data.bidId).eq("project_id", data.projectId).maybeSingle();
    const { data: payment } = await supabaseAdmin.from("bid_payments").select("*").eq("bid_id", data.bidId).eq("environment", data.environment).maybeSingle();
    if (!bid || !payment || !payment.stripe_customer_id || !payment.stripe_payment_method_id) return { error: "This contractor does not have a payment method ready" };
    if (payment.status === "paid") return { paid: true };
    if (!["ready", "failed"].includes(payment.status)) return { error: "This payment is already being processed" };

    const feeAmount = successFeeCents(Number(bid.amount));
    await supabaseAdmin.from("projects").update({ pending_bid_id: data.bidId, payment_status: "pending" }).eq("id", data.projectId).eq("status", "open");
    await supabaseAdmin.from("bid_payments").update({ status: "payment_pending", fee_amount_cents: feeAmount, failure_message: null, updated_at: new Date().toISOString() }).eq("id", payment.id);
    try {
      const stripe = createStripeClient(data.environment);
      const intent = await stripe.paymentIntents.create({
        amount: feeAmount,
        currency: "usd",
        customer: payment.stripe_customer_id,
        payment_method: payment.stripe_payment_method_id,
        confirm: true,
        off_session: true,
        description: "ProjectBids hired-job success fee",
        metadata: { bidId: data.bidId, projectId: data.projectId, contractorId: payment.contractor_id },
      }, { idempotencyKey: `beam-hire-${data.projectId}-${data.bidId}-${feeAmount}` });
      await supabaseAdmin.from("bid_payments").update({ stripe_payment_intent_id: intent.id, updated_at: new Date().toISOString() }).eq("id", payment.id);
      if (intent.status === "succeeded") {
        const { data: finalized } = await supabaseAdmin.rpc("finalize_paid_bid", { p_payment_intent_id: intent.id });
        if (!finalized) return { error: "We couldn't complete the hire. Please try again." };
        const { releaseFinishedBidCards } = await import("@/lib/card-release.server");
        await releaseFinishedBidCards(supabaseAdmin, data.projectId).catch((e) => console.error("Card release", e));
        return { paid: true };
      }
      return { pending: true };
    } catch (error) {
      const message = getStripeErrorMessage(error);
      await supabaseAdmin.from("bid_payments").update({ status: "failed", failure_message: message, updated_at: new Date().toISOString() }).eq("id", payment.id);
      await supabaseAdmin.from("projects").update({ pending_bid_id: null, payment_status: "failed" }).eq("id", data.projectId).eq("pending_bid_id", data.bidId);
      return { error: message };
    }
  });

export const getMyBidPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("bid_payments").select("bid_id, fee_amount_cents, status, failure_message").eq("contractor_id", context.userId);
    if (error) throw error;
    return data;
  });

export const getProjectPaymentReadiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { projectId: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: project } = await context.supabase.from("projects").select("owner_id").eq("id", data.projectId).maybeSingle();
    if (!project || project.owner_id !== context.userId) throw new Error("Not authorized");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin.from("bid_payments").select("bid_id, fee_amount_cents, status").eq("project_id", data.projectId);
    return rows ?? [];
  });