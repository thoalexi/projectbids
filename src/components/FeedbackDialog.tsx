import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const MAX_FEEDBACK_MESSAGE = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function FeedbackDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const location = useLocation();
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setMessage("");
      setEmail(user?.email ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.email]);

  async function submit() {
    const msg = message.trim();
    if (!msg) {
      toast.error("Write a note first.");
      return;
    }
    const mail = email.trim();
    if (mail && !EMAIL_RE.test(mail)) {
      toast.error("That email doesn't look right — leave it blank or fix it.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("feedback").insert({
      message: msg.slice(0, MAX_FEEDBACK_MESSAGE),
      email: mail || null,
      user_id: user?.id ?? null,
      page: `${location.pathname}${location.searchStr ?? ""}`,
    });
    setBusy(false);
    if (error) {
      toast.error("Couldn't send. Try again.");
      return;
    }
    toast.success("Thanks — your note is in.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Feedback</DialogTitle>
          <DialogDescription>Anything confusing, missing, or broken? Tell us — only the ProjectBids team reads this.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_FEEDBACK_MESSAGE))}
              rows={5}
              maxLength={MAX_FEEDBACK_MESSAGE}
              placeholder="What could be better?"
              className="field resize-none"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {message.length}/{MAX_FEEDBACK_MESSAGE}
            </p>
          </div>
          <div>
            <label htmlFor="feedback-email" className="text-xs font-medium text-muted-foreground">
              Email (optional — only if you'd like a reply)
            </label>
            <Input
              id="feedback-email"
              type="email"
              value={email}
              maxLength={255}
              onChange={(e) => setEmail(e.target.value.slice(0, 255))}
              placeholder="you@example.com"
              className="field mt-1"
            />
          </div>
          <Button className="w-full" disabled={busy} onClick={submit}>
            {busy ? "Sending…" : "Send feedback"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
