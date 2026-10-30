import "server-only";
import { Resend } from "resend";

export interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const from = process.env.EMAIL_FROM ?? "Umoobi <hello@umoobi.com>";

/**
 * Last emails sent by the console fallback, so e2e tests can read links without a mailbox.
 * Kept on globalThis because route bundles don't share module instances in dev.
 */
const g = globalThis as typeof globalThis & { __umoobiOutbox?: Email[] };
export const devOutbox: Email[] = (g.__umoobiOutbox ??= []);

/**
 * Sends through Resend when RESEND_API_KEY is set; otherwise prints the email to the
 * server console (D49) so local and preview runs never email real people.
 */
export async function sendEmail(email: Email): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    devOutbox.unshift(email);
    devOutbox.length = Math.min(devOutbox.length, 50);
    console.info(`[email] to=${email.to} subject="${email.subject}"\n${email.text}`);
    return;
  }
  const { error } = await new Resend(key).emails.send({ from, ...email });
  if (error) throw new Error(`Email failed: ${error.message}`);
}
