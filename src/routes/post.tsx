import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ProjectForm } from "@/components/ProjectForm";

export const Route = createFileRoute("/post")({
  head: () => ({
    meta: [
      { title: "Post a home project — Quote Slip" },
      { name: "description", content: "Describe your project, add a photo and a date, and start receiving bids." },
      { property: "og:title", content: "Post a home project — Quote Slip" },
      { property: "og:description", content: "Describe your project, add a photo and a date, and start receiving bids." },
    ],
  }),
  component: PostProject,
});

function PostProject() {
  const { user, loading, displayName } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  if (loading) return null;
  if (!user)
    return (
      <main className="mx-auto max-w-xl px-6 py-20">
        <div className="frosted rounded-2xl p-8 text-center">
          <h1 className="font-display text-3xl">Post a project</h1>
          <p className="mt-2 text-muted-foreground">Sign in first so contractors know who they're bidding for.</p>
          <Button asChild className="mt-6">
            <Link to="/auth" search={{ redirect: "/post" }}>Sign in or create an account</Link>
          </Button>
        </div>
      </main>
    );

  return (
    <main className="mx-auto max-w-3xl px-6 pb-20 pt-12">
      <h1 className="font-display text-4xl">Post a project</h1>
      <p className="mt-2 text-muted-foreground">Tell local pros what you need. It's free to post.</p>
      <ProjectForm
        userId={user.id}
        submitLabel="Continue"
        busyLabel="Posting…"
        onSubmit={async (v) => {
          const { data, error } = await supabase
            .from("projects")
            .insert({ ...v, status: "draft", owner_id: user.id, owner_name: firstName(displayName) })
            .select("id")
            .single();
          if (error || !data) return void toast.error("Couldn't post your project. Try again.");
          qc.invalidateQueries({ queryKey: ["projects"] });
          toast.success("Almost done — answer a few quick questions to go live.");
          navigate({ to: "/projects/$id", params: { id: data.id } });
        }}
      />
    </main>
  );
}
