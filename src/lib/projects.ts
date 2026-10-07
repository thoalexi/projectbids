import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const CATEGORIES = [
  "Painting",
  "Plumbing",
  "Electrical",
  "Carpentry",
  "Tiling",
  "Flooring",
  "Landscaping",
  "Handyman",
  "Other",
];

export const projectsQuery = () =>
  queryOptions({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, bids(count)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const projectQuery = (id: string) =>
  queryOptions({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, bids(*)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

/** Uploaded photos live in a private bucket as "storage:<path>"; seeded ones are plain URLs. */
export async function resolveImage(url: string | null): Promise<string | null> {
  if (!url) return null;
  if (!url.startsWith("storage:")) return url;
  const { data } = await supabase.storage
    .from("project-photos")
    .createSignedUrl(url.slice(8), 60 * 60);
  return data?.signedUrl ?? null;
}

export const formatDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

export const formatMoney = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
