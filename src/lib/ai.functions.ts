import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { z as z4 } from "zod/v4";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiJson } from "./ai.server";
import { QUESTIONS, toAnswers } from "./questions";

const input = (d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d);

export type AiQuestion = { question: string; answer: string };
export type Comparison = {
  bids: { bid_id: string; name: string; total: string; materials: string; demo: string; disposal: string; timeline: string; earliest_start: string; warranty: string }[];
  warnings: string[];
};

export const askFollowUps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input)
  .handler(async ({ data, context }) => {
    const { data: p } = await context.supabase.from("projects").select("*").eq("id", data.projectId).maybeSingle();
    if (!p || p.owner_id !== context.userId) throw new Error("Only the homeowner can do this.");
    const answers = toAnswers(p.answers);
    const qa = QUESTIONS.map((q) => `${q.label} ${answers[q.id] ?? "—"}`).join("\n");
    const out = await aiJson(
      z4.object({ questions: z4.array(z4.string()) }),
      "You help homeowners post clear home-improvement jobs so contractors can bid accurately. Ask 2 to 4 short, specific follow-up questions about details that are missing and would change the price (size, scope, what's included, access, materials). Never ask about budget. Don't repeat what's already answered. Each question under 15 words.",
      `Category: ${p.category}\nTitle: ${p.title}\nLocation: ${p.location}\nDetails: ${p.description}\n${qa}`,
    );
    const questions: AiQuestion[] = out.questions.slice(0, 4).map((q) => ({ question: q.slice(0, 160), answer: "" }));
    await context.supabase.from("projects").update({ ai_questions: questions }).eq("id", p.id);
    return questions;
  });

export const compareBids = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input)
  .handler(async ({ data, context }) => {
    const { data: p } = await context.supabase.from("projects").select("*, bids(*)").eq("id", data.projectId).maybeSingle();
    if (!p || p.owner_id !== context.userId) throw new Error("Only the homeowner can compare bids.");
    const bids = [...(p.bids ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
    if (bids.length < 2) throw new Error("You need at least two bids to compare.");
    const hash = bids.map((b) => `${b.id}:${b.amount}`).join("|");
    if (p.comparison && p.comparison_bid_hash === hash) return p.comparison as unknown as Comparison;

    const text = bids
      .map((b, i) =>
        [
          `Bid ${i + 1} — ${b.contractor_name}`,
          `Total: $${b.amount}`,
          `Materials: ${b.materials ?? "not stated"}; Labor: ${b.labor ?? "not stated"}; Disposal: ${b.disposal ?? "not stated"}`,
          `Duration: ${b.duration_days ?? "?"} days; Earliest start: ${b.earliest_start ?? "?"}; Warranty: ${b.warranty || "none stated"}`,
          `Licensed & insured: ${b.insured ? "yes" : "not stated / no"}`,
          `Note: ${b.message}`,
        ].join("\n"),
      )
      .join("\n\n");
    const row = z4.object({
      total: z4.string(), materials: z4.string(), demo: z4.string(), disposal: z4.string(),
      timeline: z4.string(), earliest_start: z4.string(), warranty: z4.string(),
    });
    const out = await aiJson(
      z4.object({ bids: z4.array(row), warnings: z4.array(z4.string()) }),
      "You normalize contractor bids so a homeowner can compare them fairly. Return one row per bid, in the same order. Use short cell values: dollar totals like \"$3,150\", \"Included\", \"Extra $250\", \"Not mentioned\", \"✓\", \"2 days\", \"Oct 19\", \"2 yr\". Then list warnings for gaps or differences that matter (e.g. \"Bid 2 (Name) does not include disposal.\"). Refer to bids by contractor name. Max 5 warnings, each under 20 words.",
      `Project: ${p.title} (${p.category})\n${p.description}\n\n${text}`,
    );
    const comparison: Comparison = {
      bids: bids.map((b, i) => ({
        bid_id: b.id,
        name: b.contractor_name,
        ...(out.bids[i] ?? { total: `$${b.amount}`, materials: "—", demo: "—", disposal: "—", timeline: "—", earliest_start: "—", warranty: "—" }),
      })),
      warnings: out.warnings.slice(0, 5),
    };
    await context.supabase.from("projects").update({ comparison, comparison_bid_hash: hash }).eq("id", p.id);
    return comparison;
  });
