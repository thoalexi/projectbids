import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { POST_AUTH_KEY, safeRedirect } from "@/lib/safe-redirect";
import { friendlyAuthError } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";

const searchSchema = z.object({
  redirect: fallback(z.string(), "/").default("/"),
});

export const Route = createFileRoute("/auth")({
  staticData: { sitemap: false },
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Sign in — ProjectBids" },
      { name: "description", content: "Sign in or create an account to post projects or bid on jobs." },
      { property: "og:title", content: "Sign in — ProjectBids" },
      { property: "og:description", content: "Sign in or create an account to post projects or bid on jobs." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(255),
  password: z.string().min(8, "Password must be at least 8 characters.").max(72),
  name: z.string().trim().max(80),
});

type Mode = "in" | "up" | "forgot";

function AuthPage() {
  const { status } = useAuth();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const target = safeRedirect(redirect);
  const [mode, setMode] = useState<Mode>("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<null | "signup" | "reset">(null);
  const left = useRef(false);

  // Once signed in, leave the sign-in page exactly once.
  useEffect(() => {
    if (status !== "authed" || left.current) return;
    left.current = true;
    sessionStorage.removeItem(POST_AUTH_KEY);
    navigate({ to: target, replace: true });
  }, [status, target, navigate]);

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (mode === "forgot") {
      const parsed = z.string().trim().email().safeParse(email);
      if (!parsed.success) return setError("Enter a valid email address.");
      setBusy(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo: `${window.location.origin}/reset-password` });
        if (error && error.status === 429) setError(friendlyAuthError(error));
        else setSent("reset"); // Same message whether or not the account exists.
      } catch (err) {
        setError(friendlyAuthError(err));
      }
      setBusy(false);
      return;
    }
    const parsed = schema.safeParse({ email, password, name });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check your details and try again.");
    if (mode === "up" && !parsed.data.name) return setError("Add your name or business name.");
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password });
        if (error) setError(friendlyAuthError(error, "signin"));
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: parsed.data.name } },
        });
        if (error) setError(friendlyAuthError(error, "signup"));
        else if (!data.session) setSent("signup");
      }
    } catch (err) {
      setError(friendlyAuthError(err));
    }
    setBusy(false);
  }

  async function google() {
    if (googleBusy) return;
    setError(null);
    setGoogleBusy(true);
    sessionStorage.setItem(POST_AUTH_KEY, target);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.redirected) return; // Browser is leaving for Google.
      if (result.error) {
        sessionStorage.removeItem(POST_AUTH_KEY);
        const msg = result.error.message?.toLowerCase() ?? "";
        if (!/cancel|closed|denied/.test(msg)) setError("Google sign-in didn't finish. Please try again.");
      }
    } catch {
      sessionStorage.removeItem(POST_AUTH_KEY);
      setError("Google sign-in didn't finish. Please try again.");
    }
    setGoogleBusy(false);
  }

  if (status === "authed") {
    return (
      <main className="mx-auto max-w-md px-6 py-16" aria-busy="true">
        <div className="frosted rounded-2xl p-8 text-sm text-muted-foreground">Signing you in…</div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <div className="frosted rounded-2xl p-8">
        {sent ? (
          <>
            <h1 className="font-display text-3xl">Check your email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {sent === "signup"
                ? `We sent a confirmation link to ${email}. Click it to finish signing up.`
                : `If an account exists for ${email}, we sent a link to set a new password.`}
            </p>
            <button className="mt-6 text-sm text-primary hover:underline" onClick={() => { setSent(null); switchMode("in"); }}>
              Back to sign in
            </button>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl">
              {mode === "in" ? "Welcome back" : mode === "up" ? "Create your account" : "Reset your password"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "forgot" ? "Enter your email and we'll send you a link." : "Post projects or bid on jobs — one account does both."}
            </p>
            {mode !== "forgot" && (
              <>
                <Button variant="soft" className="mt-6 w-full" onClick={google} type="button" disabled={googleBusy || busy}>
                  {googleBusy ? "Connecting…" : "Continue with Google"}
                </Button>
                <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" />
                </div>
              </>
            )}
            <form onSubmit={submit} className={mode === "forgot" ? "mt-6 space-y-4" : "space-y-4"} noValidate>
              {mode === "up" && (
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Your name or business name" autoComplete="name" aria-label="Name" className="field" />
              )}
              <input type="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="email" aria-label="Email" className="field" />
              {mode !== "forgot" && (
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    aria-label="Password"
                    autoComplete={mode === "in" ? "current-password" : "new-password"}
                    className="field pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              )}
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={busy || googleBusy} className="w-full">
                {busy ? "Please wait…" : mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Send reset link"}
              </Button>
            </form>
            {mode === "in" && (
              <button className="mt-3 w-full text-center text-sm text-muted-foreground hover:text-foreground" onClick={() => switchMode("forgot")}>
                Forgot password?
              </button>
            )}
            <button
              className="mt-3 w-full text-center text-sm text-muted-foreground hover:text-foreground"
              onClick={() => switchMode(mode === "in" ? "up" : "in")}
            >
              {mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
