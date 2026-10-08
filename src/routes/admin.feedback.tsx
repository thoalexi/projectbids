import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { amIAdmin, claimOwnerAdmin } from "@/lib/verification.functions";

export const Route = createFileRoute("/admin/feedback")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Feedback queue — ProjectBids" },
      { name: "description", content: "Admin queue for site feedback." },
      { property: "og:title", content: "Feedback queue — ProjectBids" },
      { property: "og:description", content: "Admin queue for site feedback." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FeedbackAdminPage,
});

type FeedbackRow = {
  id: string;
  message: string;
  email: string | null;
  user_id: string | null;
  page: string;
  status: string;
  created_at: string;
};

function FeedbackAdminPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const checkAdmin = useServerFn(amIAdmin);
  const claim = useServerFn(claimOwnerAdmin);
  const [showAll, setShowAll] = useState(false);

  const admin = useQuery({ queryKey: ["am-admin", user?.id], enabled: !!user, queryFn: () => checkAdmin() });
  const rows = useQuery({
    queryKey: ["feedback", showAll],
    enabled: admin.data === true,
    queryFn: async () => {
      let q = supabase
        .from("feedback")
        .select("id, message, email, user_id, page, status, created_at")
        .order("created_at", { ascending: false });
      if (!showAll) q = q.eq("status", "open");
      const { data, error } = await q;
      if (error) throw error;
      return data as FeedbackRow[];
    },
  });

  if (!user)
    return (
      <main className="mx-auto max-w-4xl px-6 py-16">
        <Link to="/auth" search={{ redirect: "/admin/feedback" }} className="text-primary">
          Sign in
        </Link>
      </main>
    );
  if (admin.isLoading) return <main className="mx-auto max-w-4xl px-6 py-16 text-muted-foreground">Loading…</main>;
  if (!admin.data)
    return (
      <main className="mx-auto max-w-4xl px-6 py-16">
        <p>This page is for ProjectBids admins only.</p>
        <Button
          className="mt-4"
          onClick={async () => {
            try {
              await claim();
              toast.success("You're now an admin.");
              qc.invalidateQueries({ queryKey: ["am-admin"] });
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Couldn't grant access");
            }
          }}
        >
          I'm the site owner — turn on admin access
        </Button>
      </main>
    );

  async function setStatus(id: string, status: "open" | "resolved") {
    const { error } = await supabase.from("feedback").update({ status }).eq("id", id);
    if (error) return void toast.error("Couldn't save");
    qc.invalidateQueries({ queryKey: ["feedback"] });
  }

  const list = rows.data ?? [];
  return (
    <main className="mx-auto max-w-4xl px-6 pb-20 pt-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-4xl">Feedback</h1>
        <Button variant="soft" size="sm" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show open only" : "Show all"}
        </Button>
      </div>
      <p className="mt-2 text-muted-foreground">Notes visitors and members left from around the site.</p>
      {rows.isLoading && <p className="mt-6 text-muted-foreground">Loading…</p>}
      {!rows.isLoading && list.length === 0 && (
        <p className="mt-6 text-muted-foreground">{showAll ? "No feedback yet." : "No open feedback — nice."}</p>
      )}
      <div className="mt-6 space-y-4">
        {list.map((f) => (
          <div key={f.id} className="frosted rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <p className="text-xs text-muted-foreground">
                {f.email
                  ? f.email
                  : f.user_id
                    ? "A signed-in member (no email left)"
                    : "A visitor (no email left)"}
                {" · "}
                {f.created_at
                  ? new Date(f.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                  : ""}
                {f.page ? <>{" · from "}<span className="font-mono text-[11px]">{f.page}</span></> : null}
              </p>
              <span
                className={
                  f.status === "resolved"
                    ? "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold text-success ring-1 ring-success/30"
                    : "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold text-primary ring-1 ring-primary/30"
                }
              >
                {f.status === "resolved" ? "Resolved" : "Open"}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{f.message}</p>
            <Button
              variant="soft"
              size="sm"
              className="mt-3"
              onClick={() => setStatus(f.id, f.status === "resolved" ? "open" : "resolved")}
            >
              {f.status === "resolved" ? "Reopen" : "Mark resolved"}
            </Button>
          </div>
        ))}
      </div>
    </main>
  );
}
