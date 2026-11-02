/**
 * Only same-site paths are allowed after sign-in, so a crafted link can't bounce members to
 * another site. Parsing with URL catches tricks like "/\t/evil.example" that browsers
 * normalise into a protocol-relative URL.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || /[\\\t\r\n]/.test(next)) return "/";
  try {
    const base = "https://x.invalid";
    const u = new URL(next, base);
    return u.origin === base ? `${u.pathname}${u.search}${u.hash}` : "/";
  } catch {
    return "/";
  }
}
