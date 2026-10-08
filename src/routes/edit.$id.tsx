import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ProjectForm } from "@/components/ProjectForm";
import { toAiQuestions } from "@/components/ProjectAi";
import { projectQuery, resolveImage } from "@/lib/projects";
import { toAnswers, toOwnerQuestions } from "@/lib/questions";

export const Route = createFileRoute("/edit/$id")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Edit your project — ProjectBids" },
      { name: "description", content: "Update your project details before contractors start bidding." },
      { property: "og:title", content: "Edit your project — ProjectBids" },
      { property: "og:description", content: "Update your project details before contractors start bidding." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EditProject,
});

function EditProject() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: project, isLoading } = useQuery(projectQuery(id));
  const [preview, setPreview] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (project) resolveImage(project.image_url).then(setPreview);
  }, [project]);

  if (loading || isLoading || (project && preview === undefined))
    return <main className="mx-auto max-w-3xl px-6 py-16 text-muted-foreground">Loading…</main>;

  if (!user)
    return (
      <main className="mx-auto max-w-xl px-6 py-20">
        <div className="frosted rounded-2xl p-8 text-center">
          <h1 className="font-display text-3xl">Edit project</h1>
          <p className="mt-2 text-muted-foreground">Sign in to edit your project.</p>
          <Link to="/auth" search={{ redirect: `/edit/${id}` }} className="mt-6 inline-block text-primary">Sign in</Link>
        </div>
      </main>
    );

  const locked = !project || project.owner_id !== user.id || project.status === "awarded" || (project.bid_count ?? 0) > 0;
  if (locked)
    return (
      <main className="mx-auto max-w-xl px-6 py-20">
        <div className="frosted rounded-2xl p-8 text-center">
          <h1 className="font-display text-3xl">Can't edit this project</h1>
          <p className="mt-2 text-muted-foreground">Only the homeowner can edit a project, and only before any bids come in.</p>
          <Link to="/projects/$id" params={{ id }} className="mt-6 inline-block text-primary">Back to project</Link>
        </div>
      </main>
    );

  return (
    <main className="mx-auto max-w-3xl px-6 pb-20 pt-12">
      <Link to="/projects/$id" params={{ id }} className="text-sm text-muted-foreground hover:text-foreground">← Back to project</Link>
      <h1 className="font-display mt-4 text-4xl">Edit project</h1>
      <p className="mt-2 text-muted-foreground">You can make changes until the first bid arrives.</p>
      <ProjectForm
        userId={user.id}
        initial={{ ...project, answers: toAnswers(project.answers), budget_min: project.budget_min, budget_max: project.budget_max, owner_questions: toOwnerQuestions(project.owner_questions), ai_questions: toAiQuestions(project.ai_questions), contractor_requirement: project.contractor_requirement === "verified_only" ? "verified_only" : "all" }}
        initialPreview={preview ?? null}
        submitLabel="Save changes"
        busyLabel="Saving…"
        onSubmit={async (v) => {
          const { error } = await supabase.from("projects").update(v).eq("id", id);
          if (error) return void toast.error("Couldn't save — a contractor may have just bid.");
          qc.invalidateQueries({ queryKey: ["project", id] });
          qc.invalidateQueries({ queryKey: ["projects"] });
          toast.success("Project updated.");
          navigate({ to: "/projects/$id", params: { id } });
        }}
      />
    </main>
  );
}
