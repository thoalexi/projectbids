/** Returns a safe same-site path ("/..."), or "/" when the input could lead off-site or loop back to sign-in. */
export function safeRedirect(raw: unknown, fallback = "/"): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2048) return fallback;
  let decoded = raw;
  try {
    // Decode repeatedly to catch double-encoded tricks like %252F%252F.
    for (let i = 0; i < 3; i++) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {
    return fallback;
  }
  for (const s of [raw, decoded]) {
    if (!s.startsWith("/") || s.startsWith("//")) return fallback;
    if (s.includes("\\")) return fallback;
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u001f\u007f]/.test(s)) return fallback;
    if (/^\/[^/?#]*:/.test(s)) return fallback;
  }
  const base = "https://projectbids.invalid";
  let url: URL;
  try {
    url = new URL(raw, base);
  } catch {
    return fallback;
  }
  if (url.origin !== base) return fallback;
  if (url.pathname === "/auth" || url.pathname.startsWith("/auth/") || url.pathname === "/reset-password") return fallback;
  return url.pathname + url.search + url.hash;
}

export const POST_AUTH_KEY = "beam:post-auth-redirect";
