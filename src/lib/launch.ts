/**
 * Launch stage. "waitlist" serves only the public pre-launch pages (landing, waitlist,
 * Vimeo guide, legal, copyright, sign-in for staff) so the site can go live with just
 * Supabase and Resend, before Stripe, Mux or Sightengine exist (D33, D68).
 */
export type LaunchStage = "waitlist" | "full";

export const launchStage: LaunchStage = process.env.NEXT_PUBLIC_LAUNCH_STAGE === "waitlist" ? "waitlist" : "full";

const WAITLIST_PATHS = [
  "/",
  "/waitlist",
  "/guides",
  "/legal",
  "/dmca",
  "/sign-in",
  "/auth",
  "/settings/security",
  "/staff/waitlist",
  "/api/cron",
  "/api/dev/outbox",
  "/robots.txt",
  "/opengraph-image",
  "/sitemap.xml",
];

/** Whether a path is served during the waitlist stage. */
export function openDuringWaitlist(pathname: string): boolean {
  return WAITLIST_PATHS.some((p) => pathname === p || (p !== "/" && pathname.startsWith(`${p}/`)));
}
