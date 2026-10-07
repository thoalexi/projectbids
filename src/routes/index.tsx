import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import heroRoom from "@/assets/hero-room.jpg";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/ProjectCard";
import { projectsQuery } from "@/lib/projects";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quote Slip — Post the job, get honest bids" },
      { name: "description", content: "Describe a home project, add a photo and date, and compare bids from local contractors." },
      { property: "og:title", content: "Quote Slip — Post the job, get honest bids" },
      { property: "og:description", content: "Describe a home project, add a photo and date, and compare bids from local contractors." },
    ],
  }),
  component: Index,
});

function Index() {
  const { data } = useQuery(projectsQuery());
  const open = (data ?? []).filter((p) => p.status === "open").slice(0, 6);

  return (
    <main>
      <section className="mx-auto max-w-6xl px-6 pb-12 pt-14">
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="max-w-[46ch]">
            <p className="mb-5 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-primary">
              <span className="size-1.5 rounded-full bg-primary" />
              Open jobs near you
            </p>
            <h1 className="font-display text-balance text-5xl leading-[1.04]">
              Post it once. Local Atlanta pros compete for your business.
            </h1>
            <p className="mt-5 max-w-[52ch] text-pretty leading-relaxed text-muted-foreground">
              Describe what needs doing around the house, drop a photo and a date, and let local pros compete on
              price. Compare every quote side by side, then pick the one you trust.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/post">Post a project</Link>
              </Button>
              <Button asChild variant="soft">
                <Link to="/how-it-works">See how bids work</Link>
              </Button>
            </div>
          </div>
          <Link to="/projects/$id" params={{ id: "11111111-1111-1111-1111-111111111111" }} className="frosted block rounded-2xl p-5">
            <img src={heroRoom} alt="Small room ready for painting" width={1152} height={864} className="aspect-[4/3] w-full rounded-xl object-cover ring-1 ring-border" />
            <div className="mt-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Paint small room, 9×9×9 ft</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Bids from $150 · see all quotes</p>
              </div>
              <span className="shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold text-primary ring-1 ring-primary/20">
                Compare bids
              </span>
            </div>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight">Open jobs</h2>
          <Link to="/projects" className="text-sm text-muted-foreground hover:text-foreground">
            View all →
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {open.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      </section>
    </main>
  );
}
