import type { Metadata } from "next";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, type WaitlistRole } from "@/lib/waitlist";

export const metadata: Metadata = { title: "Waitlist · Staff", robots: { index: false } };

export default function StaffWaitlistPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-4xl">Waitlist</h1>
        <a href="/staff/waitlist/export" className="btn-ghost">
          Export CSV
        </a>
      </div>
      <p className="mt-1 text-sm text-muted">First-party counts only. No ad pixels.</p>
      <Suspense fallback={<p className="mt-8 text-muted">Loading…</p>}>
        <Stats />
      </Suspense>
    </main>
  );
}

async function Stats() {
  await requireStaff("/staff/waitlist");
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("waitlist_signups")
    .select("email, role, film_title, film_kind, sells_today, source, confirmed_at, created_at")
    .order("created_at", { ascending: false });
  const all = rows ?? [];
  const confirmed = all.filter((r) => r.confirmed_at);
  const count = (key: (r: (typeof all)[number]) => string | null) =>
    Object.entries(
      confirmed.reduce<Record<string, number>>((acc, r) => {
        const k = key(r) ?? "(none)";
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {}),
    ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="mt-8 grid gap-8">
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Confirmed" value={confirmed.length} />
        <Stat label="Filmmakers" value={confirmed.filter((r) => r.role === "filmmaker").length} />
        <Stat label="Unconfirmed" value={all.length - confirmed.length} />
        <Stat label="Goal by Jan 31, 2027" value="300 filmmakers" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Breakdown title="By role" rows={count((r) => ROLE_LABELS[r.role as WaitlistRole])} />
        <Breakdown title="By source" rows={count((r) => r.source)} />
        <Breakdown title="Where filmmakers sell" rows={count((r) => (r.role === "filmmaker" ? r.sells_today : null)).filter(([k]) => k !== "(none)")} />
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-muted">
            <tr className="border-b border-line">
              {["Email", "Role", "Film", "Source", "Confirmed", "Joined"].map((h) => (
                <th key={h} className="px-4 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {all.slice(0, 200).map((r) => (
              <tr key={r.email} className="border-b border-line">
                <td className="px-4 py-2">{r.email}</td>
                <td className="px-4 py-2">{ROLE_LABELS[r.role as WaitlistRole]}</td>
                <td className="px-4 py-2">{r.film_title ? `${r.film_title} (${r.film_kind ?? "?"})` : "—"}</td>
                <td className="px-4 py-2">{r.source ?? "—"}</td>
                <td className="px-4 py-2">{r.confirmed_at ? "Yes" : "No"}</td>
                <td className="px-4 py-2">{r.created_at.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card">
      <p className="text-sm text-muted">{label}</p>
      <p className="font-display text-3xl">{value}</p>
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <div className="card">
      <p className="font-medium">{title}</p>
      <ul className="mt-2 grid gap-1 text-sm">
        {rows.length ? (
          rows.map(([k, n]) => (
            <li key={k} className="flex justify-between">
              <span className="text-muted">{k}</span>
              <span>{n}</span>
            </li>
          ))
        ) : (
          <li className="text-muted">Nothing yet</li>
        )}
      </ul>
    </div>
  );
}
