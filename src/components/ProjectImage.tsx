import { useQuery } from "@tanstack/react-query";
import { ImageIcon } from "lucide-react";
import { resolveImage } from "@/lib/projects";
import { cn } from "@/lib/utils";

export function ProjectImage({ url, alt, className }: { url: string | null; alt: string; className?: string }) {
  const { data } = useQuery({ queryKey: ["img", url], queryFn: () => resolveImage(url), staleTime: 50 * 60 * 1000 });
  return (
    <div className={cn("overflow-hidden rounded-xl bg-muted ring-1 ring-border", className)}>
      {data ? (
        <img src={data} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center text-muted-foreground">
          <ImageIcon className="size-6" />
        </div>
      )}
    </div>
  );
}
