import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, ChevronDown, RotateCcw } from "lucide-react";
import { z } from "zod";
import { ProjectCard } from "@/components/ProjectCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AREAS, CATEGORIES, projectsQuery } from "@/lib/projects";
import { toAnswers } from "@/lib/questions";
import { useAuth } from "@/lib/auth";

const searchSchema = z.object({
  category: fallback(z.string(), "All").default("All"),
  stage: fallback(z.string(), "All").default("All"),
  area: fallback(z.string(), "").default(""),
  due: fallback(z.string(), "Any date").default("Any date"),
  poster: fallback(z.string(), "Anyone").default("Anyone"),
  access: fallback(z.string(), "All jobs").default("All jobs"),
});

const POSTER_OPTIONS = ["Anyone", "Verified Homeowners"];
const ACCESS_OPTIONS = ["All jobs", "Open to all", "Verified Pros only"];

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
  const { user } = useAuth();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/projects/" });
  const category = ["All", ...CATEGORIES].includes(search.category) ? search.category : "All";
  const stage = ["All", ...STAGES].includes(search.stage) ? search.stage : "All";
  const areas = search.area.split(",").map((value) => value.trim()).filter((value) => AREAS.includes(value));
  console.log("[browse render] search.area =", JSON.stringify(search.area));
  const due = DUE_OPTIONS.includes(search.due) ? search.due : "Any date";
  const poster = POSTER_OPTIONS.includes(search.poster) ? search.poster : "Anyone";
  const access = ACCESS_OPTIONS.includes(search.access) ? search.access : "All jobs";
  const active = category !== "All" || stage !== "All" || areas.length > 0 || due !== "Any date" || poster !== "Anyone" || access !== "All jobs";
  const list = (data ?? []).filter((project) => {
    const answers = toAnswers(project.answers);
    return project.owner_id !== user?.id
      && (category === "All" || project.category === category)
      && (stage === "All" || answers["stage"] === stage)
      && (areas.length === 0 || areas.includes(project.location))
      && matchesDueDate(project.desired_date, due)
      && (poster === "Anyone" || project.owner_verified)
      && (access === "All jobs" || (access === "Verified Pros only") === (project.contractor_requirement === "verified_only"));
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          <AreaSelect value={areas} onToggle={(next) => navigate({ search: (previous) => ({ ...previous, area: next.join(",") }) })} />
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Done by</span>
            <select value={due} onChange={(event) => update("due", event.target.value)} className="field mt-1.5">
              {DUE_OPTIONS.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Posted by</span>
            <select value={poster} onChange={(event) => update("poster", event.target.value)} className="field mt-1.5">
              {POSTER_OPTIONS.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Who can bid</span>
            <select value={access} onChange={(event) => update("access", event.target.value)} className="field mt-1.5">
              {ACCESS_OPTIONS.map((option) => <option key={option}>{option}</option>)}
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
              onClick={() => navigate({ search: { category: "All", stage: "All", area: "", due: "Any date", poster: "Anyone", access: "All jobs" } })}
            >
              <RotateCcw className="size-3.5" /> Clear filters
            </Button>
          )}
        </div>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) =>
          user ? (
            <ProjectCard key={p.id} project={p} />
          ) : (
            <div
              key={p.id}
              role="link"
              tabIndex={0}
              onClick={() => navigate({ to: "/auth", search: { redirect: `/projects/${p.id}` } })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") navigate({ to: "/auth", search: { redirect: `/projects/${p.id}` } });
              }}
              className="cursor-pointer text-left"
              aria-label={`Sign in to view ${p.title}`}
            >
              <ProjectCard project={p} locked />
            </div>
          )
        )}
      </div>
      {!isLoading && list.length === 0 && (
        <div className="mt-10 text-center">
          <p className="font-semibold">No jobs match these filters.</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a different location, hiring stage, or completion date.</p>
          {active && <Button type="button" variant="secondary" className="mt-4" onClick={() => navigate({ search: { category: "All", stage: "All", area: "", due: "Any date", poster: "Anyone", access: "All jobs" } })}>Clear filters</Button>}
        </div>
      )}
    </main>
  );
}

function AreaSelect({ value, onToggle }: { value: string[]; onToggle: (areas: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const toggle = (area: string) =>
    onToggle(value.includes(area) ? value.filter((item) => item !== area) : [...value, area]);
  return (
    <div className="block">
      <span className="text-xs font-medium text-muted-foreground">Location</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" className="field mt-1.5 flex h-10 w-full items-center justify-between gap-2 text-left">
            <span className="truncate">
              {value.length === 0 ? "All locations" : value.length === 1 ? value[0] : `${value.length} locations`}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-1.5">
          <div className="max-h-64 overflow-y-auto">
            {AREAS.map((area) => (
              <label key={area} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60">
                <Checkbox checked={value.includes(area)} onCheckedChange={() => toggle(area)} />
                <span>{area}</span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
