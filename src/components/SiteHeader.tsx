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
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="ProjectBids logo" className="size-8" width={32} height={32} />
            <span className="font-display text-lg tracking-tight">ProjectBids</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <Link to="/projects" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>
              Browse jobs
            </Link>
            {user && (
              <>
                <Link to="/my-posts" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>My Posts</Link>
                <Link to="/my-bids" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>My Bids</Link>
                <Link to="/verify" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>Get verified</Link>
                {isAdmin && <Link to="/admin/verifications" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>Review</Link>}
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
                Sign out {displayName && `(${displayName})`}
              </button>
            ) : (
              <Link to="/auth" className="hover:text-foreground">
                Sign in
              </Link>
            )}
          </nav>
          <Button asChild size="default" className="py-2">
            <Link to="/post">
              Post a project
              <span className="grid size-4 place-items-center rounded-full bg-primary-foreground/25 text-[11px] leading-none">+</span>
            </Link>
          </Button>
        </div>
        {user && (
          <nav className="flex justify-center gap-6 border-t border-border py-2 text-sm font-medium text-muted-foreground md:hidden">
            <Link to="/projects" activeProps={{ className: "text-foreground" }}>Browse</Link>
            <Link to="/my-posts" activeProps={{ className: "text-foreground" }}>My Posts</Link>
            <Link to="/my-bids" activeProps={{ className: "text-foreground" }}>My Bids</Link>
            <Link to="/verify" activeProps={{ className: "text-foreground" }}>Verify</Link>
          </nav>
        )}
      </div>
    </header>
  );
}
