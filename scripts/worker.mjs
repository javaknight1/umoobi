// Local stand-in for Vercel Cron: calls the worker every 5 s (and nightly with --nightly).
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n").map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2]]),
);
const base = env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100";
const headers = { authorization: `Bearer ${env.CRON_SECRET}` };

if (process.argv.includes("--nightly")) {
  console.log(await (await fetch(`${base}/api/cron/nightly`, { headers })).text());
}
const once = process.argv.includes("--once");
do {
  try {
    const r = await (await fetch(`${base}/api/cron/worker`, { headers })).json();
    if (r.ran) console.log(new Date().toISOString(), r);
  } catch (e) {
    console.error("worker:", e.message);
  }
  if (!once) await new Promise((r) => setTimeout(r, 5000));
} while (!once);
