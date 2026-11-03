import type { Email } from "./index";
import { siteName } from "@/lib/site";

/** HTML-escapes text placed into email HTML. Every user-supplied value goes through this. */
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Minimal, accessible HTML wrapper shared by every transactional email. */
export function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#efeef5;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1730">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
<p style="font-size:22px;font-weight:700;margin:0 0 24px"><span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:#ffad33;margin-right:6px"></span>${siteName.toLowerCase()}</p>
<h1 style="font-size:20px;margin:0 0 16px">${title}</h1>
${bodyHtml}
<p style="color:#5d5a78;font-size:12px;margin-top:32px">You're getting this because this address was entered on ${siteName}. If that wasn't you, ignore it.</p>
</div></body></html>`;
}

export function button(href: string, label: string): string {
  return `<p><a href="${href}" style="display:inline-block;background:#ffad33;color:#1a1730;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600">${label}</a></p>`;
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

export function betaInviteEmail(to: string, applyUrl: string, filmTitle: string | null): Email {
  const film = filmTitle ? ` with ${esc(filmTitle)}` : "";
  const filmText = filmTitle ? ` with ${filmTitle}` : "";
  return {
    to,
    subject: "You're invited to the Umoobi closed beta",
    text: `You're one of the first filmmakers invited to sell on Umoobi${filmText}. Apply here (sign in with this email address): ${applyUrl}\n`,
    html: layout(
      "You're invited to the closed beta",
      `<p>You're one of the first filmmakers invited to sell on Umoobi${film}. The application takes about ten minutes: a few details, an ID check and your payout account.</p><p>Sign in with this email address so we can match your invite.</p>${button(applyUrl, "Start my application")}`,
    ),
  };
}
