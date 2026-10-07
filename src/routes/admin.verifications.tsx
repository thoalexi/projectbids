import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ProjectImage } from "@/components/ProjectImage";
import { amIAdmin, listVerificationApplications, reviewVerificationApplication } from "@/lib/verification.functions";

export const Route = createFileRoute("/admin/verifications")({
  head: () => ({
    meta: [
      { title: "Review Verified Pro applications — Beam Bids" },
      { name: "description", content: "Admin review queue for Verified Pro applications." },
      { property: "og:title", content: "Review Verified Pro applications — Beam Bids" },
      { property: "og:description", content: "Admin review queue for Verified Pro applications." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const LABEL: Record<string, string> = { pending_review: "Waiting for review", approved: "Approved", rejected: "Needs changes" };

function AdminPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const checkAdmin = useServerFn(amIAdmin);
  const list = useServerFn(listVerificationApplications);
  const review = useServerFn(reviewVerificationApplication);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const admin = useQuery({ queryKey: ["am-admin", user?.id], enabled: !!user, queryFn: () => checkAdmin() });
  const apps = useQuery({ queryKey: ["verification-apps"], enabled: admin.data === true, queryFn: () => list() });

  if (!user) return <main className="mx-auto max-w-4xl px-6 py-16"><Link to="/auth" search={{ redirect: "/admin/verifications" }} className="text-primary">Sign in</Link></main>;
  if (admin.isLoading) return <main className="mx-auto max-w-4xl px-6 py-16 text-muted-foreground">Loading…</main>;
  if (!admin.data) return <main className="mx-auto max-w-4xl px-6 py-16"><p>This page is for Beam Bids admins only.</p></main>;

  async function decide(id: string, decision: "approved" | "rejected") {
    try {
      await review({ data: { id, decision, note: notes[id] } });
      toast.success(decision === "approved" ? "Approved — badge is live." : "Sent back for changes.");
      qc.invalidateQueries({ queryKey: ["verification-apps"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    }
  }

  const rows = apps.data ?? [];
  return (
    <main className="mx-auto max-w-4xl px-6 pb-20 pt-10">
      <h1 className="font-display text-4xl">Verified Pro applications</h1>
      <p className="mt-2 text-muted-foreground">Check each contractor's photos, reviews and insurance before approving.</p>
      {apps.isLoading && <p className="mt-6 text-muted-foreground">Loading…</p>}
      {!apps.isLoading && rows.length === 0 && <p className="mt-6 text-muted-foreground">No applications yet.</p>}
      <div className="mt-6 space-y-4">
        {rows.map((a) => {
          const photos = Array.isArray(a.portfolio_images) ? (a.portfolio_images as string[]) : [];
          const links = [["Google", a.google_url], ["Yelp", a.yelp_url], ["Thumbtack", a.thumbtack_url], ["Website", a.website]].filter(([, u]) => u && /^https:\/\//i.test(u));
          return (
            <div key={a.id} className="frosted rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{a.business_name}{a.trade && ` · ${a.trade}`}</p>
                  <p className="text-xs text-muted-foreground">{a.insured ? `Insured — ${a.insurance_details || "no details"}` : "Not insured"}</p>
                </div>
                <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-border">{LABEL[a.status] ?? a.status}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                {links.map(([label, u]) => <a key={label} href={u!} target="_blank" rel="noreferrer noopener" className="text-primary underline">{label}</a>)}
              </div>
              <div className="mt-3 grid grid-cols-5 gap-2">
                {photos.map((p) => <ProjectImage key={p} url={p} alt="Past work" className="aspect-square w-full" />)}
              </div>
              <input value={notes[a.id] ?? a.admin_note ?? ""} onChange={(e) => setNotes({ ...notes, [a.id]: e.target.value })} maxLength={500} placeholder="Note to the contractor (shown if sent back)" className="field mt-3" />
              <div className="mt-3 flex gap-2">
                <Button onClick={() => decide(a.id, "approved")} disabled={a.status === "approved"}>Approve & grant badge</Button>
                <Button variant="secondary" onClick={() => decide(a.id, "rejected")} disabled={a.status === "rejected"}>Send back for changes</Button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
