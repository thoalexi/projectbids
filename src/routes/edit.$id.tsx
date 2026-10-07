import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ProjectForm } from "@/components/ProjectForm";
import { projectQuery, resolveImage } from "@/lib/projects";
import { toAnswers } from "@/lib/questions";

export const Route = createFileRoute("/edit/$id")({
  head: () => ({
    meta: [
      { title: "Edit your project — Quote Slip" },
      { name: "description", content: "Update your project details before contractors start bidding." },
      { property: "og:title", content: "Edit your project — Quote Slip" },
      { property: "og:description", content: "Update your project details before contractors start bidding." },
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

  const locked = !project || project.owner_id !== user?.id || project.status !== "open" || (project.bids?.length ?? 0) > 0;
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
        userId={user!.id}
        initial={{ ...project, answers: toAnswers(project.answers) }}
        initialPreview={preview}
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
