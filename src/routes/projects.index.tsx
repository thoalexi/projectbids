import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ProjectCard } from "@/components/ProjectCard";
import { CATEGORIES, projectsQuery } from "@/lib/projects";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "Browse home projects — Quote Slip" },
      { name: "description", content: "Find open home improvement jobs and send your bid to homeowners." },
      { property: "og:title", content: "Browse home projects — Quote Slip" },
      { property: "og:description", content: "Find open home improvement jobs and send your bid to homeowners." },
    ],
  }),
  component: Browse,
});

function Browse() {
  const { data, isLoading } = useQuery(projectsQuery());
  const [cat, setCat] = useState("All");
  const list = (data ?? []).filter((p) => cat === "All" || p.category === cat);

  return (
    <main className="mx-auto max-w-6xl px-6 pb-20 pt-12">
      <h1 className="font-display text-4xl">Open jobs</h1>
      <p className="mt-2 text-muted-foreground">Pick a project, send a price, and win the work.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {["All", ...CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold ring-1 transition-colors",
              cat === c ? "bg-primary text-primary-foreground ring-primary/40" : "bg-secondary text-secondary-foreground ring-border hover:bg-card",
            )}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>
      {!isLoading && list.length === 0 && <p className="mt-10 text-muted-foreground">No projects in this category yet.</p>}
    </main>
  );
}
