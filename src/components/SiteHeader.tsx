import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { user, displayName } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30">
      <div className="frosted border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-lg bg-primary/10 ring-1 ring-primary/15">
              <span className="size-4 rounded-sm bg-primary/70" />
            </span>
            <span className="font-display text-lg tracking-tight">Beam Bids</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <Link to="/projects" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>
              Browse jobs
            </Link>
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
      </div>
    </header>
  );
}
