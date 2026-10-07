import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type WithCount = { bid_count: number; owner_verified?: boolean };

export const CATEGORIES = [
  "Interior/exterior painting",
  "Flooring",
  "Landscaping",
  "Pressure washing",
  "Junk removal",
  "Handyman",
];

export const AREAS = [
  "Atlanta, GA", "Midtown Atlanta, GA", "Buckhead, GA", "Decatur, GA", "East Point, GA", "Sandy Springs, GA",
  "Brookhaven, GA", "Dunwoody, GA", "Marietta, GA", "Smyrna, GA", "Roswell, GA", "Alpharetta, GA",
  "Tucker, GA", "Stone Mountain, GA", "College Park, GA",
];

export const MAX_BIDS = 5;

export function formatBudget(min: number | null, max: number | null) {
  const k = (n: number) => (n >= 1000 ? `$${+(n / 1000).toFixed(1)}K` : `$${n}`);
  if (min && max) return `~${k(min)}–${k(max).replace("$", "")}`;
  if (min) return `${k(min)}+`;
  if (max) return `up to ${k(max)}`;
  return null;
}

export const projectsQuery = () =>
  queryOptions({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, bid_count, owner_verified" as "*")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as (Tables<"projects"> & WithCount)[];
    },
  });

export const projectQuery = (id: string) =>
  queryOptions({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, bid_count, owner_verified" as "*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: bids, error: bidsError } = await supabase.from("bids").select("*, contractor_verified" as "*").eq("project_id", id);
      if (bidsError) throw bidsError;
      return { ...data, owner_verified: !!(data as typeof data & Partial<WithCount>).owner_verified, bid_count: (data as typeof data & Partial<WithCount>).bid_count ?? bids?.length ?? 0, bids: (bids ?? []) as (Tables<"bids"> & { contractor_verified?: boolean })[] };
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
