import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, ImagePlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthChecking, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ProjectImage } from "@/components/ProjectImage";
import { firstName, formatBudget, formatDate, formatMoney, MAX_BIDS, projectQuery } from "@/lib/projects";
import { BidComparison, FollowUpStep, toAiQuestions } from "@/components/ProjectAi";
import type { Comparison } from "@/lib/ai.functions";
import { QUESTIONS, toAnswers, toOwnerQuestions } from "@/lib/questions";
import { PaymentMethodSetup } from "@/components/PaymentMethodSetup";
import { acceptBidAndChargeFee, createBidCardSetup, getProjectPaymentReadiness, submitBidWithPaymentMethod } from "@/lib/payments.functions";
import { formatFee, successFeeCents } from "@/lib/fees";
import { getStripeEnvironment } from "@/lib/stripe";
import { useMyVerification } from "@/lib/verification";
import { HireContactCard } from "@/components/HireContactCard";

export const Route = createFileRoute("/projects/$id")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Project details & bids — ProjectBids" },
      { name: "description", content: "See the project details and compare contractor bids." },
      { property: "og:title", content: "Project details & bids — ProjectBids" },
      { property: "og:description", content: "See the project details and compare contractor bids." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProjectDetail,
});

const MAX_PHOTOS = 6;
const optMoney = z.preprocess((v) => (v === "" ? null : v), z.coerce.number().min(0).max(1_000_000).nullable());
const optUrl = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.string().trim().max(300).url("Enter full links starting with https://").refine((u) => /^https?:\/\//i.test(u), "Links must start with https://").nullable(),
);
const bidSchema = z.object({
  amount: z.coerce.number().positive("Enter a total above $0").max(1_000_000, "That's too high"),
  materials: optMoney,
  labor: optMoney,
  disposal: optMoney,
  duration_days: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().int("Days must be a whole number").min(1).max(365).nullable()),
  earliest_start: z.string().nullable(),
  warranty: z.string().trim().max(40),
  message: z.string().trim().min(1, "Add a short note").max(1000, "Keep it under 1000 characters"),
  insured: z.boolean(),
  licensed: z.boolean(),
  website: optUrl,
  google_url: optUrl,
  yelp_url: optUrl,
  thumbtack_url: optUrl,
});

function safeUrl(u: string | null | undefined) {
  return !!u && /^https?:\/\//i.test(u);
}
function toPhotos(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
function toQA(v: unknown): { question: string; answer: string }[] {
  return Array.isArray(v) ? v.filter((x) => x && typeof x.question === "string").map((x) => ({ question: x.question, answer: String(x.answer ?? "") })) : [];
}

function initials(name: string) {
  return name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
}

function ProjectDetail() {
  const { id } = Route.useParams();
  const { user, displayName, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const { data: project, isLoading } = useQuery(projectQuery(id));
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [extra, setExtra] = useState({ materials: "", labor: "", disposal: "", duration_days: "", earliest_start: "", warranty: "" });
  const [creds, setCreds] = useState({ insured: false, licensed: false, website: "", google_url: "", yelp_url: "", thumbtack_url: "" });
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [trade, setTrade] = useState("");
  const [busy, setBusy] = useState(false);
  const [qAnswers, setQAnswers] = useState<string[]>([]);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const verification = useMyVerification();
  const [pendingBid, setPendingBid] = useState<Parameters<typeof submitBidWithPaymentMethod>[0]["data"] | null>(null);

  // Prefill credentials from the contractor's most recent bid.
  useEffect(() => {
    if (!user) return;
    supabase
      .from("bids")
      .select("insured, licensed, website, google_url, yelp_url, thumbtack_url")
      .eq("contractor_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data)
          setCreds({
            insured: data.insured,
            licensed: data.licensed,
            website: data.website ?? "",
            google_url: data.google_url ?? "",
            yelp_url: data.yelp_url ?? "",
            thumbtack_url: data.thumbtack_url ?? "",
          });
      });
  }, [user]);

  // Verified pros: fill any blanks from their approved verification application.
  const app = verification.application;
  useEffect(() => {
    if (!app || app.status !== "approved") return;
    setCreds((c) => ({
      insured: c.insured || app.insured,
      licensed: c.licensed || app.licensed,
      website: c.website || app.website || "",
      google_url: c.google_url || app.google_url || "",
      yelp_url: c.yelp_url || app.yelp_url || "",
      thumbtack_url: c.thumbtack_url || app.thumbtack_url || "",
    }));
    if (app.trade) setTrade((t) => t || app.trade!);
  }, [app]);

  // Finish a bid after the card screen returned from a security check (page reload).
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const setupIntentId = params.get("setup_intent");
    if (!setupIntentId) return;
    const clean = () => window.history.replaceState(null, "", window.location.pathname);
    const raw = sessionStorage.getItem(`beam:pending-bid:${id}`);
    if (!raw) return clean();
    if (params.get("redirect_status") !== "succeeded") {
      clean();
      return void toast.error("Your card couldn't be saved. Please try again.");
    }
    const draft = JSON.parse(raw) as Parameters<typeof submitBidWithPaymentMethod>[0]["data"];
    setAmount(String(draft.amount));
    setMessage(draft.message);
    setBusy(true);
    submitBidWithPaymentMethod({ data: { ...draft, setupIntentId } })
      .then((result) => {
        if ("error" in result) return void toast.error(`Your bid wasn't sent: ${result.error}`);
        sessionStorage.removeItem(`beam:pending-bid:${id}`);
        toast.success("Your bid was sent to the homeowner.");
        setAmount("");
        setMessage("");
        refresh();
      })
      .catch(() => toast.error("Your bid wasn't sent. Please try again."))
      .finally(() => { setBusy(false); clean(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  const parts = [extra.materials, extra.labor, extra.disposal].filter((v) => v.trim() !== "");
  const hasBreakdown = parts.length > 0;
  const breakdownSum = Math.round(parts.reduce((s, v) => s + (Number(v) || 0), 0) * 100) / 100;
  const currentAmount = hasBreakdown ? breakdownSum : Number(amount || 0);
  const currentFee = successFeeCents(currentAmount);

  if (isLoading) return <main className="mx-auto max-w-6xl px-6 py-16 text-muted-foreground">Loading…</main>;
  if (!project)
    return (
      <main className="mx-auto max-w-6xl px-6 py-16">
        <p>This project wasn't found.</p>
        <Link to="/projects" className="text-primary">Back to jobs</Link>
      </main>
    );

  if (authLoading) return <AuthChecking />;
  if (!user)
    return (
      <main className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="font-display text-3xl">Sign in to view this job</h1>
        <p className="mt-3 text-muted-foreground">
          Job details are only visible to signed-in members. Sign in or create a free account to see the full project and place a bid.
        </p>
        <Button asChild className="mt-6">
          <Link to="/auth" search={{ redirect: `/projects/${id}` }}>Sign in</Link>
        </Button>
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
  const ownerQs = toOwnerQuestions(project.owner_questions);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["project", id] });
    qc.invalidateQueries({ queryKey: ["projects"] });
  };

  async function accept(bidId: string) {
    setBusy(true);
    const result = await acceptBidAndChargeFee({ data: { projectId: id, bidId, environment: getStripeEnvironment() } });
    setBusy(false);
    if ("error" in result) return void toast.error(result.error);
    refresh();
  }

  async function uploadPhotos(files: FileList | null) {
    if (!files || !user) return;
    const list = Array.from(files).slice(0, MAX_PHOTOS - photos.length);
    setUploading(true);
    const added: string[] = [];
    for (const file of list) {
      if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
        toast.error("Photos must be images under 10 MB.");
        continue;
      }
      const path = `${user.id}/portfolio/${crypto.randomUUID()}.${file.name.split(".").pop() || "jpg"}`;
      const { error } = await supabase.storage.from("project-photos").upload(path, file, { contentType: file.type });
      if (error) toast.error("Couldn't upload a photo.");
      else added.push(`storage:${path}`);
    }
    setPhotos((p) => [...p, ...added].slice(0, MAX_PHOTOS));
    setUploading(false);
  }

  async function submitBid(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = bidSchema.safeParse({ amount: hasBreakdown ? breakdownSum : amount, message, ...extra, ...creds, earliest_start: extra.earliest_start || null });
    if (!parsed.success) return void toast.error(parsed.error.issues[0]?.message);
    const unanswered = ownerQs.findIndex((_, i) => !(qAnswers[i] ?? "").trim());
    if (unanswered >= 0) return void toast.error(`Please answer: ${ownerQs[unanswered]}`);
    const question_answers = ownerQs.map((q, i) => ({ question: q, answer: (qAnswers[i] ?? "").trim().slice(0, 500) }));
    const bidData = {
      projectId: id,
      setupIntentId: "",
      amount: parsed.data.amount,
      contractorName: displayName || "Contractor",
      trade: trade.trim().slice(0, 60) || project?.category || null,
      message: parsed.data.message,
      materials: parsed.data.materials,
      labor: parsed.data.labor,
      disposal: parsed.data.disposal,
      durationDays: parsed.data.duration_days,
      earliestStart: parsed.data.earliest_start,
      warranty: parsed.data.warranty || null,
      insured: parsed.data.insured,
      licensed: parsed.data.licensed,
      website: parsed.data.website,
      googleUrl: parsed.data.google_url,
      yelpUrl: parsed.data.yelp_url,
      thumbtackUrl: parsed.data.thumbtack_url,
      portfolioImages: photos,
      questionAnswers: question_answers,
      environment: getStripeEnvironment(),
    } as const;
    setBusy(true);
    const setup = await createBidCardSetup({ data: { projectId: id, environment: bidData.environment } });
    setBusy(false);
    if ("error" in setup) return void toast.error(setup.error);
    setPendingBid(bidData);
    sessionStorage.setItem(`beam:pending-bid:${id}`, JSON.stringify(bidData));
    setSetupSecret(setup.clientSecret);
  }

  async function finishBid(setupIntentId: string) {
    if (!pendingBid) throw new Error("Your bid details are missing");
    const result = await submitBidWithPaymentMethod({ data: { ...pendingBid, setupIntentId } });
    if ("error" in result) throw new Error(result.error);
    sessionStorage.removeItem(`beam:pending-bid:${id}`);
    toast.success("Your bid was sent to the homeowner.");
    setSetupSecret(null);
    setPendingBid(null);
    setAmount("");
    setMessage("");
    setExtra({ materials: "", labor: "", disposal: "", duration_days: "", earliest_start: "", warranty: "" });
    setPhotos([]);
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
      <div className="mt-4 grid gap-6">
        <div className="frosted rounded-2xl p-6">
          <ProjectImage url={project.image_url} alt={project.title} className="h-44 w-full sm:h-56" />
          <div className="mt-6 flex items-start justify-between gap-4">
            <div>
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-primary">
                {project.category} · {project.location}
              </span>
              <h1 className="font-display mt-1 text-balance text-3xl">{project.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Posted by {firstName(project.owner_name)}
                {project.owner_verified && <span className="ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold text-success ring-1 ring-success">Verified Homeowner</span>}
                {project.contractor_requirement === "verified_only" && <span className="ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold text-primary ring-1 ring-primary">Verified Pros only</span>}
                {" "}· wanted by {formatDate(project.desired_date)}
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
              {ownerQs.length > 0 && (
                <div className="mt-4 text-sm">
                  <p className="text-xs text-muted-foreground">Homeowner's questions for contractors</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 font-medium">
                    {ownerQs.map((q, i) => <li key={i}>{q}</li>)}
                  </ul>
                </div>
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
                        {b.contractor_verified && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary ring-1 ring-primary">Verified Pro</span>}
                        {b.insured && <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold text-success ring-1 ring-success">Insured</span>}
                        {b.licensed && <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold text-success ring-1 ring-success">Licensed</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">"{b.message}"</p>
                      <p className="mt-1 text-xs text-secondary-foreground">
                        {[
                          `Materials ${b.materials != null ? formatMoney(Number(b.materials)) : "–"}`,
                          `Labor ${b.labor != null ? formatMoney(Number(b.labor)) : "–"}`,
                          `Disposal ${b.disposal != null ? formatMoney(Number(b.disposal)) : "–"}`,
                          b.duration_days && `${b.duration_days} ${b.duration_days === 1 ? "day" : "days"}`,
                          b.earliest_start && `Start ${formatDate(b.earliest_start)}`,
                          b.warranty && `Warranty ${b.warranty}`,
                        ].filter(Boolean).join(" · ")}
                      </p>
                      {(() => {
                        const links = ([
                          ["Website", b.website],
                          ["Google", b.google_url],
                          ["Yelp", b.yelp_url],
                          ["Thumbtack", b.thumbtack_url],
                        ] as const).filter(([, u]) => safeUrl(u));
                        return links.length ? (
                          <p className="mt-1 flex flex-wrap gap-3 text-xs">
                            {links.map(([l, u]) => (
                              <a key={l} href={u!} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">{l}</a>
                            ))}
                          </p>
                        ) : null;
                      })()}
                      {toPhotos(b.portfolio_images).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {toPhotos(b.portfolio_images).map((p) => (
                            <button key={p} type="button" onClick={() => setLightbox(p)} aria-label="View past work photo">
                              <ProjectImage url={p} alt="Past work" className="size-14" />
                            </button>
                          ))}
                        </div>
                      )}
                      {toQA(b.question_answers).length > 0 && (
                        <dl className="mt-2 space-y-1 text-xs">
                          {toQA(b.question_answers).map((qa, i) => (
                            <div key={i}>
                              <dt className="text-muted-foreground">{qa.question}</dt>
                              <dd className="font-medium">{qa.answer}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
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
                      <Button size="sm" disabled={busy || project.payment_status === "pending"} onClick={() => accept(b.id)}>{project.payment_status === "pending" && project.pending_bid_id === b.id ? "Hiring…" : "Hire"}</Button>
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

        {project.status === "awarded" && user && (isOwner || bids.find((b) => b.id === project.accepted_bid_id)?.contractor_id === user.id) && (
          <HireContactCard
            projectId={id}
            userId={user.id}
            userEmail={user.email ?? ""}
            defaultName={displayName ?? ""}
            isOwner={isOwner}
            otherName={isOwner ? (bids.find((b) => b.id === project.accepted_bid_id)?.contractor_name ?? "Your pro") : firstName(project.owner_name)}
            neighborhood={project.location}
          />
        )}

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
                <Link to="/auth" search={{ redirect: `/projects/${id}` }}>Sign in to bid</Link>
              </Button>
            </>
          ) : myBid ? (
            <>
              <h2 className="text-lg font-semibold">You've bid {formatMoney(Number(myBid.amount))}</h2>
              <p className="mt-1 text-sm text-muted-foreground">The homeowner will pick a bid soon.</p>
            </>
          ) : project.contractor_requirement === "verified_only" && verification.status !== "approved" ? (
            <>
              <h2 className="text-lg font-semibold">Verified Pros only</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {verification.status === "pending_review"
                  ? "Your Verified Pro application is being reviewed. You can bid here once it's approved."
                  : "This homeowner only takes bids from Verified Pros. Share your past work and reviews to apply (insurance and license are optional) — it's a one-time $5 fee."}
              </p>
              {verification.status !== "pending_review" && (
                <Button asChild className="mt-5 w-full"><Link to="/verify">Get verified — $5</Link></Button>
              )}
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
              <div className="mt-4 flex gap-2 rounded-lg bg-success/10 p-3 text-sm ring-1 ring-success/25">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                <p><span className="font-semibold">No charge to bid.</span> If the homeowner hires you, your saved card is charged a {formatFee(currentFee)} success fee. Losing bids cost $0.</p>
              </div>
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {(["materials", "labor", "disposal"] as const).map((k) => (
                    <label key={k} className="block">
                      <span className="text-xs font-medium text-muted-foreground"><span className="capitalize">{k}</span> (optional)</span>
                      <input inputMode="decimal" value={extra[k]} onChange={(e) => setExtra({ ...extra, [k]: e.target.value })} placeholder="$" className="field mt-1.5" />
                    </label>
                  ))}
                </div>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">
                    Estimated total{hasBreakdown && " · calculated from breakdown"}
                  </span>
                  <div className="field mt-1.5 flex items-center gap-1 py-0">
                    <span className="text-muted-foreground">$</span>
                    <input
                      inputMode="decimal"
                      value={hasBreakdown ? String(breakdownSum) : amount}
                      readOnly={hasBreakdown}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="150"
                      className="w-full bg-transparent py-2.5 outline-none"
                    />
                  </div>
                </label>
                <label className="flex items-center justify-between gap-3 rounded-lg bg-card/60 px-3 py-2.5 ring-1 ring-border">
                  <span className="text-sm">I carry liability insurance</span>
                  <Switch checked={creds.insured} onCheckedChange={(v) => setCreds({ ...creds, insured: v })} />
                </label>
                <label className="flex items-center justify-between gap-3 rounded-lg bg-card/60 px-3 py-2.5 ring-1 ring-border">
                  <span className="text-sm">I hold a state or trade license</span>
                  <Switch checked={creds.licensed} onCheckedChange={(v) => setCreds({ ...creds, licensed: v })} />
                </label>
                {(
                  [
                    ["website", "Business website (optional)", "https://yourbusiness.com"],
                    ["google_url", "Google reviews link (optional)", "https://g.page/…"],
                    ["yelp_url", "Yelp link (optional)", "https://yelp.com/biz/…"],
                    ["thumbtack_url", "Thumbtack link (optional)", "https://thumbtack.com/…"],
                  ] as const
                ).map(([k, label, ph]) => (
                  <label key={k} className="block">
                    <span className="text-xs font-medium text-muted-foreground">{label}</span>
                    <input type="url" value={creds[k]} maxLength={300} onChange={(e) => setCreds({ ...creds, [k]: e.target.value })} placeholder={ph} className="field mt-1.5" />
                  </label>
                ))}
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Photos of similar past jobs (optional, up to {MAX_PHOTOS})</span>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {photos.map((p) => (
                      <div key={p} className="relative">
                        <ProjectImage url={p} alt="Past work" className="size-16" />
                        <button type="button" aria-label="Remove photo" onClick={() => setPhotos(photos.filter((x) => x !== p))} className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-background ring-1 ring-border">
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                    {photos.length < MAX_PHOTOS && (
                      <label className="grid size-16 cursor-pointer place-items-center rounded-xl bg-card/60 text-muted-foreground ring-1 ring-border">
                        {uploading ? <span className="text-[10px]">…</span> : <ImagePlus className="size-5" />}
                        <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(e) => uploadPhotos(e.target.files)} />
                      </label>
                    )}
                  </div>
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
                {ownerQs.length > 0 && (
                  <div className="rounded-xl bg-primary/5 p-3 ring-1 ring-primary/20">
                    <p className="text-sm font-medium">Please answer the following questions the homeowner had:</p>
                    <div className="mt-3 space-y-3">
                      {ownerQs.map((q, i) => (
                        <label key={i} className="block">
                          <span className="text-xs font-medium text-muted-foreground">{q}</span>
                          <input
                            value={qAnswers[i] ?? ""}
                            maxLength={500}
                            onChange={(e) => setQAnswers((a) => { const n = [...a]; n[i] = e.target.value; return n; })}
                            className="field mt-1.5"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )}
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
                  {busy ? "Preparing secure card form…" : `Continue · ${formatFee(currentFee)} only if hired`}
                </Button>
              </div>
            </form>
          )}
        </aside>
      </div>
      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-2xl">
          <DialogTitle className="sr-only">Past work photo</DialogTitle>
          {lightbox && <ProjectImage url={lightbox} alt="Past work" className="aspect-[4/3] w-full" />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!setupSecret} onOpenChange={(open) => { if (!open && !busy) { setSetupSecret(null); setPendingBid(null); sessionStorage.removeItem(`beam:pending-bid:${id}`); } }}>
        <DialogContent className="max-w-xl">
          <DialogTitle>Save a payment method</DialogTitle>
          <p className="text-sm text-muted-foreground">Nothing is charged now. If this bid is hired, the success fee will be {formatFee(currentFee)}.</p>
          {setupSecret && <PaymentMethodSetup clientSecret={setupSecret} onReady={finishBid} />}
        </DialogContent>
      </Dialog>
    </main>
  );
}
