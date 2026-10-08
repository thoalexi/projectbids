import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import logo from "@/assets/logo-concept-gavel.png";

export function SiteFooter() {
  const [fbOpen, setFbOpen] = useState(false);

  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <img src={logo} alt="ProjectBids logo" className="size-9 shrink-0" width={36} height={36} />
            <div>
              <p className="font-display text-lg tracking-tight">ProjectBids</p>
              <p className="text-sm text-muted-foreground">Post what needs doing. Local pros bid. You pick.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => setFbOpen(true)}>
            <MessageSquare className="size-4" />
            Feedback
          </Button>
        </div>
        <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link to="/projects" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>
              Browse jobs
            </Link>
            <Link to="/how-it-works" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>
              How it works
            </Link>
            <Link to="/post" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>
              Post a project
            </Link>
          </nav>
          <p>© {new Date().getFullYear()} ProjectBids · Atlanta metro</p>
        </div>
      </div>
      <FeedbackDialog open={fbOpen} onOpenChange={setFbOpen} />
    </footer>
  );
}
