import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/projects";
import { SignInPrompt } from "./my-posts";
import { getMyBidPayments } from "@/lib/payments.functions";
import { formatFee } from "@/lib/fees";

export const Route = createFileRoute("/my-bids")({
  head: () => ({
    meta: [
      { title: "My Bids — Beam Bids" },
      { name: "description", content: "Bids you've placed, jobs you've been hired for, and what's still pending." },
      { property: "og:title", content: "My Bids — Beam Bids" },
      { property: "og:description", content: "Bids you've placed, jobs you've been hired for, and what's still pending." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyBids,
});

function MyBids() {
  const { user, loading } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["my-bids", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bids")
        .select("id, amount, created_at, project_id, projects!bids_project_id_fkey(id, title, status, accepted_bid_id, location)")
        .eq("contractor_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const { data: payments } = useQuery({
    queryKey: ["my-bid-payments", user?.id],
    enabled: !!user,
    queryFn: () => getMyBidPayments(),
  });

  if (loading) return null;
  if (!user) return <SignInPrompt title="My Bids" redirect="/my-bids" />;

  const rows = (data ?? []).map((b) => {
    const p = b.projects;
    const group = p?.accepted_bid_id === b.id ? "Hired" : p?.status === "awarded" ? "Not selected" : "Pending";
    return { ...b, group, payment: payments?.find((payment) => payment.bid_id === b.id) };
  });

  return (
    <main className="mx-auto max-w-4xl px-6 pb-20 pt-12">
      <h1 className="font-display text-4xl">My Bids</h1>
      <p className="mt-2 text-muted-foreground">Bids you've placed and jobs you've won.</p>
      {isLoading ? (
        <p className="mt-8 text-muted-foreground">Loading…</p>
      ) : !rows.length ? (
        <div className="frosted mt-8 rounded-2xl p-8 text-center">
          <p className="text-muted-foreground">You haven't bid on any jobs yet.</p>
          <Button asChild className="mt-4"><Link to="/projects">Browse jobs</Link></Button>
        </div>
      ) : (
        (["Hired", "Pending", "Not selected"] as const).map((g) => {
          const list = rows.filter((r) => r.group === g);
          if (!list.length) return null;
          return (
            <section key={g} className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">{g} · {list.length}</h2>
              <ul className="mt-3 space-y-3">
                {list.map((b) => (
                  <li key={b.id}>
                    <Link to="/projects/$id" params={{ id: b.project_id }} className="frosted flex items-center justify-between gap-4 rounded-xl p-4 hover:ring-1 hover:ring-primary/30">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{b.projects?.title ?? "Project"}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.projects?.location} · bid on {new Date(b.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                        {b.payment && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Success fee {formatFee(b.payment.fee_amount_cents)} · {b.payment.status === "ready" ? "card ready" : b.payment.status === "paid" ? "paid" : b.payment.status === "closed" ? "no charge" : b.payment.status === "expired" ? "expired — no charge" : b.payment.status.replace("_", " ")}
                          </p>
                        )}
                      </div>
                      <span className={`shrink-0 text-lg font-semibold ${g === "Hired" ? "text-success" : ""}`}>{formatMoney(Number(b.amount))}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </main>
  );
}
