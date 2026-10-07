import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const searchSchema = z.object({
  redirect: fallback(z.string(), "/").default("/"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Sign in — Quote Slip" },
      { name: "description", content: "Sign in or create an account to post projects or bid on jobs." },
      { property: "og:title", content: "Sign in — Quote Slip" },
      { property: "og:description", content: "Sign in or create an account to post projects or bid on jobs." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  name: z.string().trim().max(80),
});

function AuthPage() {
  const { user } = useAuth();
  const { redirect } = Route.useSearch();
  const target = redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (user) window.location.assign(target);
  }, [user, target]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password, name });
    if (!parsed.success) return void toast.error(parsed.error.issues[0]?.message);
    if (mode === "up" && !parsed.data.name) return void toast.error("Add your name");
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password });
      if (error) toast.error("Email or password is incorrect.");
    } else {
      const { error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password,
        options: { emailRedirectTo: window.location.origin, data: { display_name: parsed.data.name } },
      });
      if (error) toast.error(error.message);
      else setSent(true);
    }
    setBusy(false);
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + target });
    if (result.error) toast.error("Google sign-in failed.");
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <div className="frosted rounded-2xl p-8">
        {sent ? (
          <>
            <h1 className="font-display text-3xl">Check your email</h1>
            <p className="mt-2 text-sm text-muted-foreground">We sent a confirmation link to {email}. Click it to finish signing up.</p>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl">{mode === "in" ? "Welcome back" : "Create your account"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Post projects or bid on jobs — one account does both.</p>
            <Button variant="soft" className="mt-6 w-full" onClick={google} type="button">
              Continue with Google
            </Button>
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" />
            </div>
            <form onSubmit={submit} className="space-y-4">
              {mode === "up" && (
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Your name or business name" className="field" />
              )}
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="field" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="field" />
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
              </Button>
            </form>
            <button className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
              {mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
