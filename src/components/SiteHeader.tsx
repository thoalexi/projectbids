import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { amIAdmin } from "@/lib/verification.functions";
import logo from "@/assets/logo-concept-gavel.png";

export function SiteHeader() {
  const { user, displayName } = useAuth();
  const navigate = useNavigate();
  const checkAdmin = useServerFn(amIAdmin);
  const { data: isAdmin } = useQuery({ queryKey: ["am-admin", user?.id], enabled: !!user, queryFn: () => checkAdmin() });
  return (
    <header className="sticky top-0 z-30">
      <div className="frosted border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <img src={logo} alt="ProjectBids logo" className="size-10 shrink-0" width={40} height={40} />
            <span className="hidden shrink-0 whitespace-nowrap font-display text-xl tracking-tight min-[420px]:inline">ProjectBids</span>
          </Link>
          <nav className="hidden items-center gap-5 whitespace-nowrap text-sm font-medium text-muted-foreground lg:flex xl:gap-7">
            <Link to="/projects" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>
              Browse jobs
            </Link>
            {user && (
              <>
                <Link to="/my-posts" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>My Posts</Link>
                <Link to="/my-bids" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>My Bids</Link>
                <Link to="/verify" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>Get verified</Link>
                {isAdmin && (
                  <>
                    <Link to="/admin/verifications" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>Review</Link>
                    <Link to="/admin/feedback" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>Feedback queue</Link>
                  </>
                )}
              </>
            )}
            <Link to="/how-it-works" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>
              How it works
            </Link>
            {user ? (
              <button
                className="hover:text-foreground"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate({ to: "/" });
                }}
              >
                Sign out
              </button>
            ) : (
              <Link to="/auth" className="hover:text-foreground">
                Sign in
              </Link>
            )}
          </nav>
          <Button asChild size="default" className="shrink-0 px-3 py-2 sm:px-4">
            <Link to="/post">
              <span className="hidden min-[420px]:inline">Post a project</span>
              <span className="min-[420px]:hidden">Post</span>
              <span className="grid size-4 place-items-center rounded-full bg-primary-foreground/25 text-[11px] leading-none">+</span>
            </Link>
          </Button>
        </div>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-1 border-t border-border py-2 text-sm font-medium text-muted-foreground lg:hidden">
          <Link to="/projects" activeProps={{ className: "text-foreground" }}>Browse</Link>
          {user && (
            <>
              <Link to="/my-posts" activeProps={{ className: "text-foreground" }}>My Posts</Link>
              <Link to="/my-bids" activeProps={{ className: "text-foreground" }}>My Bids</Link>
              <Link to="/verify" activeProps={{ className: "text-foreground" }}>Verify</Link>
              {isAdmin && (
                <>
                  <Link to="/admin/verifications" activeProps={{ className: "text-foreground" }}>Review</Link>
                  <Link to="/admin/feedback" activeProps={{ className: "text-foreground" }}>Feedback queue</Link>
                </>
              )}
            </>
          )}
          <Link to="/how-it-works" className="hidden sm:inline" activeProps={{ className: "text-foreground" }}>How it works</Link>
          {user ? (
            <button className="hidden sm:inline" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}>Sign out</button>
          ) : (
            <Link to="/auth" className="hidden sm:inline">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
