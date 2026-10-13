import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { friendlyAuthError } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/reset-password")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Set a new password — ProjectBids" },
      { name: "description", content: "Choose a new password for your ProjectBids account." },
      { property: "og:title", content: "Set a new password — ProjectBids" },
      { property: "og:description", content: "Choose a new password for your ProjectBids account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

type Phase = "checking" | "ready" | "invalid" | "done";

function ResetPasswordPage() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    if (hash.get("error") || hash.get("error_code") || query.get("error")) {
      setPhase("invalid");
      return;
    }
    const isRecoveryLink = hash.get("type") === "recovery" || query.has("code") || query.get("type") === "recovery";
    let settled = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        settled = true;
        setPhase("ready");
      }
    });
    // Give the client a moment to process the link before deciding it's invalid.
    const t = window.setTimeout(async () => {
      if (settled) return;
      const { data } = await supabase.auth.getSession();
      setPhase(isRecoveryLink && data.session ? "ready" : "invalid");
    }, 1500);
    return () => {
      sub.subscription.unsubscribe();
      window.clearTimeout(t);
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (password.length < 8 || password.length > 72) return setError("Password must be 8–72 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        if (error.status === 401 || error.status === 403) setPhase("invalid");
        else setError(friendlyAuthError(error, "reset"));
      } else {
        setPhase("done");
        window.history.replaceState(null, "", "/reset-password");
      }
    } catch (err) {
      setError(friendlyAuthError(err, "reset"));
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <div className="frosted rounded-2xl p-8">
        {phase === "checking" && <p className="text-sm text-muted-foreground" aria-busy="true">Checking your link…</p>}
        {phase === "invalid" && (
          <>
            <h1 className="font-display text-3xl">This link has expired</h1>
            <p className="mt-2 text-sm text-muted-foreground">Reset links work once and expire after a while. Request a new one to continue.</p>
            <Button asChild className="mt-6 w-full"><Link to="/auth">Send a new link</Link></Button>
          </>
        )}
        {phase === "done" && (
          <>
            <h1 className="font-display text-3xl">Password updated</h1>
            <p className="mt-2 text-sm text-muted-foreground">You're signed in with your new password.</p>
            <Button asChild className="mt-6 w-full"><Link to="/" replace>Continue</Link></Button>
          </>
        )}
        {phase === "ready" && (
          <>
            <h1 className="font-display text-3xl">Set a new password</h1>
            <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
              <input type="email" name="email" autoComplete="username" className="hidden" readOnly tabIndex={-1} aria-hidden="true" />
              <div className="relative">
                <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" aria-label="New password" autoComplete="new-password" className="field pr-11" />
                <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground hover:text-foreground">
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <input type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm new password" aria-label="Confirm new password" autoComplete="new-password" className="field" />
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={busy} className="w-full">{busy ? "Saving…" : "Save new password"}</Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
