import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { z } from "zod";
import { ProjectCard } from "@/components/ProjectCard";
import { Button } from "@/components/ui/button";
import { AREAS, CATEGORIES, projectsQuery } from "@/lib/projects";
import { toAnswers } from "@/lib/questions";

const searchSchema = z.object({
  category: fallback(z.string(), "All").default("All"),
  stage: fallback(z.string(), "All").default("All"),
  area: fallback(z.string(), "All").default("All"),
  due: fallback(z.string(), "Any date").default("Any date"),
});

const STAGES = ["Ready to hire", "Planning & budgeting", "Just comparing prices"];
const DUE_OPTIONS = ["Any date", "This week", "Next 30 days", "Later"];

export const Route = createFileRoute("/projects/")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Browse home projects — Beam Bids" },
      { name: "description", content: "Find Atlanta home improvement jobs, bid for free, and only pay when you get hired." },
      { property: "og:title", content: "Browse home projects — Beam Bids" },
      { property: "og:description", content: "Find Atlanta home improvement jobs, bid for free, and only pay when you get hired." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Browse,
});

function toDay(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function matchesDueDate(value: string, due: string) {
  if (due === "Any date") return true;
  const projectDate = toDay(value);
  if (!projectDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (7 - today.getDay()) % 7);
  const thirtyDays = new Date(today);
  thirtyDays.setDate(today.getDate() + 30);
  if (due === "This week") return projectDate >= today && projectDate <= endOfWeek;
  if (due === "Next 30 days") return projectDate >= today && projectDate <= thirtyDays;
  if (due === "Later") return projectDate > thirtyDays;
  return true;
}

function Browse() {
  const { data, isLoading } = useQuery(projectsQuery());
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/projects/" });
  const category = ["All", ...CATEGORIES].includes(search.category) ? search.category : "All";
  const stage = ["All", ...STAGES].includes(search.stage) ? search.stage : "All";
  const area = ["All", ...AREAS].includes(search.area) ? search.area : "All";
  const due = DUE_OPTIONS.includes(search.due) ? search.due : "Any date";
  const active = category !== "All" || stage !== "All" || area !== "All" || due !== "Any date";
  const list = (data ?? []).filter((project) => {
    const answers = toAnswers(project.answers);
    return (category === "All" || project.category === category)
      && (stage === "All" || answers["stage"] === stage)
      && (area === "All" || project.location === area)
      && matchesDueDate(project.desired_date, due);
  });

  const update = (key: keyof typeof search, value: string) =>
    navigate({ search: (previous) => ({ ...previous, [key]: value }) });

  return (
    <main className="mx-auto max-w-6xl px-6 pb-20 pt-12">
      <h1 className="font-display text-4xl">Open jobs</h1>
      <p className="mt-2 text-muted-foreground">Find the right project, send your price, and win the work.</p>

      <div className="mt-6 flex items-start gap-3 rounded-lg bg-success/10 p-4 ring-1 ring-success/25">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
        <div>
          <p className="font-semibold">Bid for free. Only pay when you get hired.</p>
          <p className="mt-0.5 text-sm text-muted-foreground">No pay-per-lead fees. If the lead never becomes your customer, you pay nothing.</p>
        </div>
      </div>

      <div className="mt-6 border-y border-border py-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Category</span>
            <select value={category} onChange={(event) => update("category", event.target.value)} className="field mt-1.5">
              {["All", ...CATEGORIES].map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Hiring process</span>
            <select value={stage} onChange={(event) => update("stage", event.target.value)} className="field mt-1.5">
              {["All", ...STAGES].map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Location</span>
            <select value={area} onChange={(event) => update("area", event.target.value)} className="field mt-1.5">
              {["All", ...AREAS].map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Done by</span>
            <select value={due} onChange={(event) => update("due", event.target.value)} className="field mt-1.5">
              {DUE_OPTIONS.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-3 flex min-h-8 items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">{isLoading ? "Loading jobs…" : `${list.length} ${list.length === 1 ? "job" : "jobs"} found`}</p>
          {active && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate({ search: { category: "All", stage: "All", area: "All", due: "Any date" } })}
            >
              <RotateCcw className="size-3.5" /> Clear filters
            </Button>
          )}
        </div>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>
      {!isLoading && list.length === 0 && (
        <div className="mt-10 text-center">
          <p className="font-semibold">No jobs match these filters.</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a different location, hiring stage, or completion date.</p>
          {active && <Button type="button" variant="secondary" className="mt-4" onClick={() => navigate({ search: { category: "All", stage: "All", area: "All", due: "Any date" } })}>Clear filters</Button>}
        </div>
      )}
    </main>
  );
}
