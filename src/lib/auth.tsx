import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { POST_AUTH_KEY, safeRedirect } from "@/lib/safe-redirect";

export type AuthStatus = "loading" | "authed" | "anon";
type AuthState = { user: User | null; loading: boolean; status: AuthStatus; displayName: string; signOut: () => Promise<void> };
const AuthContext = createContext<AuthState>({ user: null, loading: true, status: "loading", displayName: "", signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [displayName, setDisplayName] = useState("");
  const redirected = useRef(false);

  useEffect(() => {
    let ready = false;

    // Runs at most once per page load: consumes the saved destination before navigating.
    const consumeRedirect = () => {
      if (redirected.current) return;
      const raw = sessionStorage.getItem(POST_AUTH_KEY);
      if (!raw) return;
      sessionStorage.removeItem(POST_AUTH_KEY);
      redirected.current = true;
      const next = safeRedirect(raw);
      const here = window.location.pathname + window.location.search;
      if (next !== "/" && next !== here) router.navigate({ to: next, replace: true });
    };

    const apply = (u: User | null) => {
      setUser((prev) => (prev?.id === u?.id && prev?.updated_at === u?.updated_at ? prev : u));
      setStatus(u ? "authed" : "anon");
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        if (ready) apply(session?.user ?? null);
        return;
      }
      apply(session?.user ?? null);
      if (event === "SIGNED_IN" && ready && session?.user) consumeRedirect();
    });

    supabase.auth
      .getSession()
      .then(({ data }) => {
        ready = true;
        apply(data.session?.user ?? null);
        if (data.session?.user) consumeRedirect();
      })
      .catch(() => {
        ready = true;
        setStatus("anon");
      });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return setDisplayName("");
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setDisplayName(data?.display_name ?? user.email?.split("@")[0] ?? "Member"));
  }, [user]);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/", replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, loading: status === "loading", status, displayName, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

/** Quiet placeholder shown while the saved session is being restored. */
export function AuthChecking() {
  return (
    <main className="mx-auto max-w-xl px-6 py-16" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-2/3 animate-pulse rounded-lg bg-muted" />
      <div className="mt-4 h-4 w-full animate-pulse rounded bg-muted" />
      <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-muted" />
    </main>
  );
}
