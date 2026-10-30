/** Public base URL (no trailing slash). The final name/domain is still open (D12), so it lives in one env var. */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100").replace(/\/$/, "");

export const siteName = "Umoobi";
