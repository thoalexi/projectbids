import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Tables } from "@/integrations/supabase/types";

export type VerificationStatus = "none" | "payment_required" | "pending_review" | "approved" | "rejected";

export function useMyVerification() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["my-verification", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("contractor_verifications").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data as Tables<"contractor_verifications"> | null;
    },
  });
  const status = (query.data?.status ?? "none") as VerificationStatus;
  return { application: query.data ?? null, status, isLoading: query.isLoading, refetch: query.refetch };
}
