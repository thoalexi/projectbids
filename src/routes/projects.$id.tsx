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
import { formatDate, formatMoney, projectQuery } from "@/lib/projects";

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

const bidSchema = z.object({
  amount: z.coerce.number().positive("Enter a price above $0").max(1_000_000, "That's too high"),
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
    const parsed = bidSchema.safeParse({ amount, message });
    if (!parsed.success) return void toast.error(parsed.error.issues[0]?.message);
    setBusy(true);
    const { error } = await supabase.from("bids").insert({
      project_id: id,
      contractor_id: user.id,
      contractor_name: displayName || "Contractor",
      trade: trade.trim().slice(0, 60) || project!.category,
      amount: parsed.data.amount,
      message: parsed.data.message,
    });
    setBusy(false);
    if (error) return void toast.error("Couldn't send your bid. Try again.");
    toast.success("Your bid was sent to the homeowner.");
    setAmount("");
    setMessage("");
    refresh();
  }

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
              </p>
              <p className="mt-3 max-w-[60ch] text-pretty text-sm leading-relaxed text-secondary-foreground">
                {project.description}
              </p>
            </div>
            <span className="shrink-0 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground ring-1 ring-border">
              {bids.length} {bids.length === 1 ? "bid" : "bids"}
            </span>
          </div>

          <div className="mt-6 space-y-3">
            {bids.length === 0 && <p className="text-sm text-muted-foreground">No bids yet — check back soon.</p>}
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
          ) : (
            <form onSubmit={submitBid}>
              <h2 className="text-lg font-semibold">Place a bid</h2>
              <p className="mt-1 text-sm text-muted-foreground">Add your price and a short note to the homeowner.</p>
              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Your price</span>
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
