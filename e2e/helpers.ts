import { expect, type APIRequestContext } from "@playwright/test";

export const MAILPIT = "http://127.0.0.1:55424";

export function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@umoobi.test`;
}

/** Latest app email (console fallback) to an address. */
export async function appEmail(request: APIRequestContext, to: string) {
  let found: { subject: string; text: string } | undefined;
  await expect
    .poll(async () => {
      const res = await request.get(`/api/dev/outbox?to=${encodeURIComponent(to)}`);
      found = (await res.json())[0];
      return !!found;
    })
    .toBe(true);
  return found!;
}

/** Latest Supabase auth email in Mailpit, and the first link in it. */
export async function authLink(request: APIRequestContext, to: string): Promise<string> {
  let link = "";
  await expect
    .poll(
      async () => {
        const res = await request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
        const { messages } = await res.json();
        if (!messages?.length) return false;
        const msg = await (await request.get(`${MAILPIT}/api/v1/message/${messages[0].ID}`)).json();
        link = (msg.Text as string).match(/https?:\/\/\S+/)?.[0]?.replace(/\)$/, "") ?? "";
        return !!link;
      },
      { timeout: 15_000 },
    )
    .toBe(true);
  return link;
}
