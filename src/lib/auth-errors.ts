/** Maps auth errors to plain-language messages. Never reveals whether an account exists. */
export function friendlyAuthError(err: unknown, context: "signin" | "signup" | "reset" | "other" = "other"): string {
  const e = err as { message?: string; status?: number; code?: string } | null;
  const msg = (e?.message ?? "").toLowerCase();
  const code = e?.code ?? "";
  if (e?.status === 429 || code.includes("rate_limit") || msg.includes("rate limit") || msg.includes("too many"))
    return "Too many attempts. Please wait a few minutes and try again.";
  if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("load failed"))
    return "We couldn't reach ProjectBids. Check your connection and try again.";
  if (code === "email_not_confirmed" || msg.includes("email not confirmed"))
    return "Please confirm your email first — check your inbox for the link we sent.";
  if (code === "weak_password" || msg.includes("weak") || msg.includes("pwned") || msg.includes("leaked"))
    return "That password is too easy to guess. Try a longer, more unique one.";
  if (code === "same_password" || msg.includes("different from the old"))
    return "Choose a password different from your current one.";
  if (msg.includes("expired") || msg.includes("invalid") && context === "reset")
    return "This link has expired. Request a new one.";
  if (context === "signin") return "We couldn't sign you in with those details. Check your email and password and try again.";
  if (context === "signup")
    return "We couldn't create that account. If you already have one, sign in or reset your password.";
  return "Something went wrong. Please try again.";
}
