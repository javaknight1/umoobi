import type { Email } from "./index";
import { siteName } from "@/lib/site";

/** Minimal, accessible HTML wrapper shared by every transactional email. */
export function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f6f3ec;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#17140f">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
<p style="font-family:Georgia,serif;font-size:22px;margin:0 0 24px">${siteName}</p>
<h1 style="font-size:20px;margin:0 0 16px">${title}</h1>
${bodyHtml}
<p style="color:#6b645a;font-size:12px;margin-top:32px">You're getting this because this address was entered on ${siteName}. If that wasn't you, ignore it.</p>
</div></body></html>`;
}

export function button(href: string, label: string): string {
  return `<p><a href="${href}" style="display:inline-block;background:#c2410c;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600">${label}</a></p>`;
}

export function waitlistConfirmEmail(to: string, confirmUrl: string, role: string): Email {
  const filmmaker = role === "filmmaker";
  const intro = filmmaker
    ? "Thanks for putting your film on the list. Confirm your email and we'll invite you to the closed beta as places open."
    : "Thanks for joining. Confirm your email and we'll let you know when Umoobi opens.";
  return {
    to,
    subject: "Confirm your spot on the Umoobi waitlist",
    text: `${intro}\n\nConfirm: ${confirmUrl}\n`,
    html: layout("Confirm your spot", `<p>${intro}</p>${button(confirmUrl, "Confirm my email")}`),
  };
}
