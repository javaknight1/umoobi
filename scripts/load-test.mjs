// Load test (T020). Usage: node scripts/load-test.mjs https://<preview-or-prod> [seconds] [connections]
// Read-only pages plus the analytics beacon. Never point this at production during real traffic
// without telling anyone, and never at third-party services.
import autocannon from "autocannon";

const base = (process.argv[2] ?? "http://localhost:3100").replace(/\/$/, "");
const duration = Number(process.argv[3] ?? 30);
const connections = Number(process.argv[4] ?? 25);

// Budgets from the Technical Requirements (film pages render fast from social links).
const BUDGET = { p95: 800, errorRate: 0.01 };

const scenarios = [
  { name: "landing", path: "/" },
  { name: "film page", path: "/f/salt-and-static" },
  { name: "discover", path: "/discover" },
  { name: "share card", path: "/opengraph-image" },
  {
    name: "page-view beacon",
    path: "/api/events/page",
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ filmId: "c0000000-0000-0000-0000-000000000001", event: "view", ref: "loadtest" }),
  },
];

let failed = false;
for (const s of scenarios) {
  const r = await autocannon({ url: `${base}${s.path}`, method: s.method ?? "GET", headers: s.headers, body: s.body, duration, connections });
  const total = r.requests.total || 1;
  const errors = r.errors + r.timeouts + (r.non2xx ?? 0);
  const errorRate = errors / total;
  const ok = r.latency.p97_5 <= BUDGET.p95 && errorRate <= BUDGET.errorRate;
  failed ||= !ok;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${s.name.padEnd(17)} ${String(Math.round(r.requests.average)).padStart(5)} req/s  p50 ${r.latency.p50} ms  p97.5 ${r.latency.p97_5} ms  p99 ${r.latency.p99} ms  errors ${(errorRate * 100).toFixed(2)}%`,
  );
}
console.log(`\nBudget: p97.5 <= ${BUDGET.p95} ms, errors <= ${BUDGET.errorRate * 100}% (${duration}s × ${connections} connections each)`);
process.exit(failed ? 1 : 0);
