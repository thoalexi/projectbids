import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { formatDate, formatMoney } from "@/lib/projects";

export const Route = createFileRoute("/my-posts")({
  head: () => ({
    meta: [
      { title: "My Posts — Beam Bids" },
      { name: "description", content: "Every home project you've posted, with status and bids." },
      { property: "og:title", content: "My Posts — Beam Bids" },
      { property: "og:description", content: "Every home project you've posted, with status and bids." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyPosts,
});

const STATUS: Record<string, string> = { draft: "Draft", open: "Open", awarded: "Hired" };

function MyPosts() {
  const { user, loading } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["my-posts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, status, category, location, desired_date, created_at, bid_count" as "id, title, status, category, location, desired_date, created_at")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = data.map((project) => project.id);
      const { data: bids, error: bidError } = ids.length
        ? await supabase.from("bids").select("project_id, amount").in("project_id", ids)
        : { data: [], error: null };
      if (bidError) throw bidError;
      return data.map((project) => ({
        ...project,
        bid_count: (project as typeof project & { bid_count?: number }).bid_count ?? 0,
        bids: bids.filter((bid) => bid.project_id === project.id),
      }));
    },
  });

  if (loading) return null;
  if (!user) return <SignInPrompt title="My Posts" redirect="/my-posts" />;

  return (
    <main className="mx-auto max-w-4xl px-6 pb-20 pt-12">
      <h1 className="font-display text-4xl">My Posts</h1>
      <p className="mt-2 text-muted-foreground">Projects you've posted.</p>
      {isLoading ? (
        <p className="mt-8 text-muted-foreground">Loading…</p>
      ) : !data?.length ? (
        <div className="frosted mt-8 rounded-2xl p-8 text-center">
          <p className="text-muted-foreground">You haven't posted anything yet.</p>
          <Button asChild className="mt-4"><Link to="/post">Post a project</Link></Button>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {data.map((p) => {
            const amounts = (p.bids ?? []).map((b) => Number(b.amount));
            return (
              <li key={p.id}>
                <Link to="/projects/$id" params={{ id: p.id }} className="frosted flex items-center justify-between gap-4 rounded-xl p-4 hover:ring-1 hover:ring-primary/30">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.category} · {p.location} · by {formatDate(p.desired_date)}</p>
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-border">{STATUS[p.status] ?? p.status}</span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.bid_count ?? 0} bid{p.bid_count === 1 ? "" : "s"}
                      {amounts.length > 0 && ` · lowest ${formatMoney(Math.min(...amounts))}`}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

export function SignInPrompt({ title, redirect }: { title: string; redirect: string }) {
  return (
    <main className="mx-auto max-w-xl px-6 py-20">
      <div className="frosted rounded-2xl p-8 text-center">
        <h1 className="font-display text-3xl">{title}</h1>
        <p className="mt-2 text-muted-foreground">Sign in to see this page.</p>
        <Button asChild className="mt-6"><Link to="/auth" search={{ redirect }}>Sign in</Link></Button>
      </div>
    </main>
  );
}
