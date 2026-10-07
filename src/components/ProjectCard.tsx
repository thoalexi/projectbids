import { Link } from "@tanstack/react-router";
import { ProjectImage } from "./ProjectImage";
import { formatDate } from "@/lib/projects";

type Props = {
  project: {
    id: string;
    title: string;
    category: string;
    location: string;
    desired_date: string;
    image_url: string | null;
    status: string;
    bids: { count: number }[];
  };
};

export function ProjectCard({ project }: Props) {
  const count = project.bids?.[0]?.count ?? 0;
  return (
    <Link
      to="/projects/$id"
      params={{ id: project.id }}
      className="frosted block rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
    >
      <ProjectImage url={project.image_url} alt={project.title} className="aspect-[16/10] w-full" />
      <div className="mt-3 flex items-center gap-2">
        <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-accent">
          {project.category}
        </span>
        <span className="text-xs text-muted-foreground">{project.location}</span>
        {project.status === "awarded" && (
          <span className="ml-auto rounded bg-success/10 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-success">
            Hired
          </span>
        )}
      </div>
      <h3 className="mt-1.5 text-balance text-base font-semibold leading-snug">{project.title}</h3>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Wanted by {formatDate(project.desired_date)}</span>
        <span className="font-semibold text-primary">
          {count} {count === 1 ? "bid" : "bids"}
        </span>
      </div>
    </Link>
  );
}
