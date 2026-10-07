import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ProjectImage } from "@/components/ProjectImage";
import { formatBudget, formatDate, formatMoney, MAX_BIDS, projectQuery } from "@/lib/projects";
import { BidComparison, FollowUpStep, toAiQuestions } from "@/components/ProjectAi";
import type { Comparison } from "@/lib/ai.functions";
import { QUESTIONS, toAnswers } from "@/lib/questions";

export const Route = createFileRoute("/projects/$id")({
  head: () => ({
    meta: [
      { title: "Project details & bids — Quote Slip" },
      { name: "description", content: "See the project details and compare contractor bids." },
      { property: "og:title", content: "Project details & bids — Quote Slip" },
      { property: "og:description", content: "See the project details and compare contractor bids." },
    ],
  }),
  component: ProjectDetail,
});

const optMoney = z.preprocess((v) => (v === "" ? null : v), z.coerce.number().min(0).max(1_000_000).nullable());
const bidSchema = z.object({
  amount: z.coerce.number().positive("Enter a total above $0").max(1_000_000, "That's too high"),
  materials: optMoney,
  labor: optMoney,
  disposal: optMoney,
  duration_days: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().int("Days must be a whole number").min(1).max(365).nullable()),
  earliest_start: z.string().nullable(),
  warranty: z.string().trim().max(40),
  message: z.string().trim().min(1, "Add a short note").max(1000, "Keep it under 1000 characters"),
});

function initials(name: string) {
  return name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
}

function ProjectDetail() {
  const { id } = Route.useParams();
  const { user, displayName } = useAuth();
  const qc = useQueryClient();
  const { data: project, isLoading } = useQuery(projectQuery(id));
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [extra, setExtra] = useState({ materials: "", labor: "", disposal: "", duration_days: "", earliest_start: "", warranty: "" });
  const [trade, setTrade] = useState("");
  const [busy, setBusy] = useState(false);

  if (isLoading) return <main className="mx-auto max-w-6xl px-6 py-16 text-muted-foreground">Loading…</main>;
  if (!project)
    return (
      <main className="mx-auto max-w-6xl px-6 py-16">
        <p>This project wasn't found.</p>
        <Link to="/projects" className="text-primary">Back to jobs</Link>
      </main>
    );

  const bids = [...(project.bids ?? [])].sort((a, b) => Number(a.amount) - Number(b.amount));
  const isOwner = user?.id === project.owner_id;
  const myBid = bids.find((b) => b.contractor_id === user?.id);
  const isOpen = project.status === "open";
  const total = project.bid_count ?? 0;
  const full = total >= MAX_BIDS;
  const budget = formatBudget(project.budget_min, project.budget_max);
  const aiQs = toAiQuestions(project.ai_questions).filter((q) => q.answer);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["project", id] });
    qc.invalidateQueries({ queryKey: ["projects"] });
  };

  async function accept(bidId: string) {
    const { error } = await supabase.from("projects").update({ status: "awarded", accepted_bid_id: bidId }).eq("id", id);
    if (error) return void toast.error("Couldn't accept that bid. Try again.");
    toast.success("Bid accepted! The contractor has the job.");
    refresh();
  }

  async function submitBid(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = bidSchema.safeParse({ amount, message, ...extra, earliest_start: extra.earliest_start || null });
    if (!parsed.success) return void toast.error(parsed.error.issues[0]?.message);
    setBusy(true);
    const { error } = await supabase.from("bids").insert({
      project_id: id,
      contractor_id: user.id,
      contractor_name: displayName || "Contractor",
      trade: trade.trim().slice(0, 60) || project!.category,
      amount: parsed.data.amount,
      message: parsed.data.message,
      materials: parsed.data.materials,
      labor: parsed.data.labor,
      disposal: parsed.data.disposal,
      duration_days: parsed.data.duration_days,
      earliest_start: parsed.data.earliest_start,
      warranty: parsed.data.warranty || null,
    });
    setBusy(false);
    if (error) return void toast.error(error.message.includes("full") ? "Sorry — this project already has 5 bids." : "Couldn't send your bid. Try again.");
    toast.success("Your bid was sent to the homeowner.");
    setAmount("");
    setMessage("");
    setExtra({ materials: "", labor: "", disposal: "", duration_days: "", earliest_start: "", warranty: "" });
    refresh();
  }

  if (project.status === "draft")
    return (
      <main className="mx-auto max-w-2xl px-6 pb-20 pt-10">
        {isOwner ? (
          <FollowUpStep projectId={id} initial={toAiQuestions(project.ai_questions)} onDone={refresh} />
        ) : (
          <p className="text-muted-foreground">This project isn't live yet.</p>
        )}
      </main>
    );

  async function withdraw(bidId: string) {
    const { error } = await supabase.from("bids").delete().eq("id", bidId);
    if (error) return void toast.error("Couldn't withdraw your bid.");
    refresh();
  }

  return (
    <main className="mx-auto max-w-6xl px-6 pb-20 pt-10">
      <Link to="/projects" className="text-sm text-muted-foreground hover:text-foreground">← All jobs</Link>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="frosted rounded-2xl p-6">
          <ProjectImage url={project.image_url} alt={project.title} className="aspect-[16/9] w-full" />
          <div className="mt-6 flex items-start justify-between gap-4">
            <div>
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-primary">
                {project.category} · {project.location}
              </span>
              <h1 className="font-display mt-1 text-balance text-3xl">{project.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Posted by {project.owner_name} · wanted by {formatDate(project.desired_date)}
                {budget && ` · budget ${budget}`}
              </p>
              <p className="mt-3 max-w-[60ch] text-pretty text-sm leading-relaxed text-secondary-foreground">
                {project.description}
              </p>
              {Object.keys(toAnswers(project.answers)).length > 0 && (
                <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  {QUESTIONS.filter((q) => toAnswers(project.answers)[q.id]).map((q) => (
                    <div key={q.id}>
                      <dt className="text-xs text-muted-foreground">{q.label}</dt>
                      <dd className="font-medium">{toAnswers(project.answers)[q.id]}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {aiQs.length > 0 && (
                <dl className="mt-4 grid gap-y-2 text-sm">
                  {aiQs.map((q, i) => (
                    <div key={i}>
                      <dt className="text-xs text-muted-foreground">{q.question}</dt>
                      <dd className="font-medium">{q.answer}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
            <span className="shrink-0 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground ring-1 ring-border">
              {total} of {MAX_BIDS} bids
            </span>
          </div>

          <div className="mt-6 space-y-3">
            {isOwner && bids.length === 0 && <p className="text-sm text-muted-foreground">No bids yet — check back soon.</p>}
            {!isOwner && (
              <p className="text-sm text-muted-foreground">
                Bids are sealed — only the homeowner sees prices. {total} of {MAX_BIDS} bid spots taken{full ? " · bidding full" : ""}.
              </p>
            )}
            {bids.map((b) => {
              const accepted = project.accepted_bid_id === b.id;
              return (
                <div
                  key={b.id}
                  className={`flex items-center justify-between gap-4 rounded-xl bg-card/70 p-4 ring-1 ${accepted ? "ring-success" : "ring-border"}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-avatar text-sm font-semibold text-avatar-foreground">
                      {initials(b.contractor_name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {b.contractor_name}
                        {b.trade && ` · ${b.trade}`}
                      </p>
                      <p className="text-xs text-muted-foreground">"{b.message}"</p>
                      <p className="mt-1 text-xs text-secondary-foreground">
                        {[
                          b.materials != null && `Materials ${formatMoney(Number(b.materials))}`,
                          b.labor != null && `Labor ${formatMoney(Number(b.labor))}`,
                          b.disposal != null && `Disposal ${formatMoney(Number(b.disposal))}`,
                          b.duration_days && `${b.duration_days} ${b.duration_days === 1 ? "day" : "days"}`,
                          b.earliest_start && `Start ${formatDate(b.earliest_start)}`,
                          b.warranty && `Warranty ${b.warranty}`,
                        ].filter(Boolean).join(" · ")}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">Final quote subject to site inspection.</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-lg font-semibold">{formatMoney(Number(b.amount))}</span>
                    {accepted ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                        <CheckCircle2 className="size-4" /> Hired
                      </span>
                    ) : isOwner && isOpen ? (
                      <Button size="sm" onClick={() => accept(b.id)}>Accept bid</Button>
                    ) : b.contractor_id === user?.id && isOpen ? (
                      <Button size="sm" variant="ghost" onClick={() => withdraw(b.id)}>Withdraw</Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          {isOwner && bids.length >= 2 && (
            <BidComparison
              key={bids.map((b) => b.id).join()}
              projectId={id}
              saved={(project.comparison as unknown as Comparison | null) ?? null}
            />
          )}
        </div>

        <aside className="frosted h-fit rounded-2xl p-6">
          {!isOpen ? (
            <>
              <h2 className="text-lg font-semibold">A pro has been hired</h2>
              <p className="mt-1 text-sm text-muted-foreground">This project is no longer taking bids.</p>
            </>
          ) : isOwner ? (
            <>
              <h2 className="text-lg font-semibold">This is your project</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Compare the bids and press "Accept bid" on the one you want. Bids are sorted lowest price first.
              </p>
              {total === 0 ? (
                <Button asChild variant="secondary" className="mt-5 w-full">
                  <Link to="/edit/$id" params={{ id }}>Edit project</Link>
                </Button>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">Editing is locked once bids arrive.</p>
              )}
            </>
          ) : !user ? (
            <>
              <h2 className="text-lg font-semibold">Place a bid</h2>
              <p className="mt-1 text-sm text-muted-foreground">Sign in to send your price to the homeowner.</p>
              <Button asChild className="mt-5 w-full">
                <Link to="/auth">Sign in to bid</Link>
              </Button>
            </>
          ) : myBid ? (
            <>
              <h2 className="text-lg font-semibold">You've bid {formatMoney(Number(myBid.amount))}</h2>
              <p className="mt-1 text-sm text-muted-foreground">The homeowner will pick a bid soon.</p>
            </>
          ) : full ? (
            <>
              <h2 className="text-lg font-semibold">Bidding full</h2>
              <p className="mt-1 text-sm text-muted-foreground">This project already has {MAX_BIDS} bids.</p>
            </>
          ) : (
            <form onSubmit={submitBid}>
              <h2 className="text-lg font-semibold">Place a bid</h2>
              <p className="mt-1 text-sm text-muted-foreground">Add your price and a short note to the homeowner.</p>
              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Estimated total</span>
                  <div className="field mt-1.5 flex items-center gap-1 py-0">
                    <span className="text-muted-foreground">$</span>
                    <input
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="150"
                      className="w-full bg-transparent py-2.5 outline-none"
                    />
                  </div>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["materials", "labor", "disposal"] as const).map((k) => (
                    <label key={k} className="block">
                      <span className="text-xs font-medium capitalize text-muted-foreground">{k}</span>
                      <input inputMode="decimal" value={extra[k]} onChange={(e) => setExtra({ ...extra, [k]: e.target.value })} placeholder="$" className="field mt-1.5" />
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-xs font-medium text-muted-foreground">Days to finish</span>
                    <input inputMode="numeric" value={extra.duration_days} onChange={(e) => setExtra({ ...extra, duration_days: e.target.value })} placeholder="2" className="field mt-1.5" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-muted-foreground">Earliest start</span>
                    <input type="date" value={extra.earliest_start} onChange={(e) => setExtra({ ...extra, earliest_start: e.target.value })} className="field mt-1.5" />
                  </label>
                </div>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Warranty (optional)</span>
                  <input value={extra.warranty} maxLength={40} onChange={(e) => setExtra({ ...extra, warranty: e.target.value })} placeholder="2 yr" className="field mt-1.5" />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Your trade (optional)</span>
                  <input value={trade} onChange={(e) => setTrade(e.target.value)} maxLength={60} placeholder={project.category} className="field mt-1.5" />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Message</span>
                  <textarea
                    rows={3}
                    value={message}
                    maxLength={1000}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="I'm interested — I can prep, tape, and roll this in one day."
                    className="field mt-1.5 resize-none"
                  />
                </label>
                <Button type="submit" disabled={busy} className="w-full">
                  {busy ? "Sending…" : "Submit bid"}
                </Button>
              </div>
            </form>
          )}
        </aside>
      </div>
    </main>
  );
}
