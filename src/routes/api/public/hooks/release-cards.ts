import { createFileRoute } from "@tanstack/react-router";

// Daily scheduled job: expires past-due projects and releases saved cards.
// Idempotent and only ever removes charge ability, so a replayed call is harmless.
export const Route = createFileRoute("/api/public/hooks/release-cards")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!request.headers.get("authorization")?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { releaseFinishedBidCards } = await import("@/lib/card-release.server");
        const released = await releaseFinishedBidCards(supabaseAdmin);
        return Response.json({ released });
      },
    },
  },
});
