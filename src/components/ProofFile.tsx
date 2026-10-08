import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { resolveImage } from "@/lib/projects";
import { ProjectImage } from "@/components/ProjectImage";

/** Shows an uploaded proof document: image thumbnail, or a PDF tile that opens in a new tab. */
export function ProofFile({ url, alt }: { url: string; alt: string }) {
  const isPdf = /\.pdf$/i.test(url);
  const { data } = useQuery({ queryKey: ["img", url], queryFn: () => resolveImage(url), enabled: isPdf, staleTime: 50 * 60 * 1000 });
  if (!isPdf) return <ProjectImage url={url} alt={alt} className="aspect-square w-full" />;
  return (
    <a href={data ?? undefined} target="_blank" rel="noreferrer noopener" className="grid aspect-square w-full place-items-center rounded-xl bg-muted text-muted-foreground ring-1 ring-border hover:text-foreground">
      <span className="flex flex-col items-center gap-1 text-[10px] font-medium"><FileText className="size-6" />PDF</span>
    </a>
  );
}
