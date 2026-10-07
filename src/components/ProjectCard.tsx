import { Link } from "@tanstack/react-router";
import { ProjectImage } from "./ProjectImage";
import { formatBudget, formatDate } from "@/lib/projects";

type Props = {
  project: {
    id: string;
    title: string;
    category: string;
    location: string;
    desired_date: string;
    image_url: string | null;
    status: string;
    bid_count: number | null;
    budget_min: number | null;
    budget_max: number | null;
  contractor_requirement?: string;
    owner_verified?: boolean;
  };
  locked?: boolean;
};

export function ProjectCard({ project, locked }: Props) {
  const count = project.bid_count ?? 0;
  const budget = formatBudget(project.budget_min, project.budget_max);
  const Wrapper = locked ? "div" : Link;
  const wrapperProps = locked
    ? {}
    : { to: "/projects/$id", params: { id: project.id } };
  return (
    <Wrapper
      {...wrapperProps}
      className="frosted block rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
    >
      <ProjectImage url={project.image_url} alt={project.title} className="aspect-[16/10] w-full" />
      <div className="mt-3 flex items-center gap-2">
        <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-accent">
          {project.category}
        </span>
        <span className="text-xs text-muted-foreground">{project.location}{budget && ` · ${budget}`}</span>
        {project.status === "awarded" && (
          <span className="ml-auto rounded bg-success/10 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-success">
            Hired
          </span>
        )}
      </div>
      {(project.owner_verified || project.contractor_requirement === "verified_only") && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {project.owner_verified && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-success ring-1 ring-success">Verified Homeowner</span>}
          {project.contractor_requirement === "verified_only" && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-primary ring-1 ring-primary">Verified Pros only</span>}
        </div>
      )}
      <h3 className="mt-1.5 text-balance text-base font-semibold leading-snug">{project.title}</h3>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Wanted by {formatDate(project.desired_date)}</span>
        <span className="font-semibold text-primary">
          {count} {count === 1 ? "bid" : "bids"}
        </span>
      </div>
    </Wrapper>
  );
}
