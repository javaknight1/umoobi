"use client";

import { useEffect, useState, useTransition } from "react";
import { percentToBps, sharesState } from "@/lib/credits/shares";
import { createPerson, saveCredits, searchPeople, type PersonOption } from "./actions";

interface Row {
  person: PersonOption;
  role: string;
  share: string;
}

export function CreditsEditor({ filmId, initial }: { filmId: string; initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const bps = rows.map((r) => percentToBps(r.share || "0") ?? 0);
  const { total, state } = sharesState(bps);

  function update(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
    setStatus(null);
  }
  function move(i: number, d: -1 | 1) {
    setRows((rs) => {
      const j = i + d;
      if (j < 0 || j >= rs.length) return rs;
      const next = [...rs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function save() {
    start(async () => {
      const res = await saveCredits(
        filmId,
        rows.map((r) => ({ personId: r.person.id, role: r.role, share: r.share })),
      );
      setStatus("error" in res ? { kind: "error", text: res.error } : { kind: "ok", text: "Credits saved." });
    });
  }

  return (
    <div className="grid gap-4">
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-muted">
            <tr className="border-b border-line">
              <th className="px-3 py-2 font-medium">Person</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Revenue share</th>
              <th className="px-3 py-2 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.person.id}-${i}`} className="border-b border-line align-top">
                <td className="px-3 py-2">
                  <p className="font-medium">{r.person.name}</p>
                  <p className="text-xs text-muted">{r.person.claimed ? "Claimed" : "Not claimed yet"}</p>
                  {r.person.canInvite ? <InviteButton personId={r.person.id} name={r.person.name} /> : null}
                </td>
                <td className="px-3 py-2">
                  <input
                    aria-label={`Role for ${r.person.name}`}
                    value={r.role}
                    onChange={(e) => update(i, { role: e.target.value })}
                    className="field"
                    placeholder="Director"
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <input
                      aria-label={`Revenue share for ${r.person.name}`}
                      value={r.share}
                      onChange={(e) => update(i, { share: e.target.value })}
                      inputMode="decimal"
                      className="field w-24"
                      placeholder="0"
                    />
                    <span className="text-muted">%</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <button type="button" onClick={() => move(i, -1)} aria-label={`Move ${r.person.name} up`} className="px-1 text-muted hover:text-fg">
                    ↑
                  </button>
                  <button type="button" onClick={() => move(i, 1)} aria-label={`Move ${r.person.name} down`} className="px-1 text-muted hover:text-fg">
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                    className="px-1 text-bad"
                    aria-label={`Remove ${r.person.name}`}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-muted">
                  No credits yet. Add your cast and crew below.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p
        data-testid="share-total"
        className={`text-sm ${state === "incomplete" ? "text-bad" : state === "complete" ? "text-ok" : "text-muted"}`}
      >
        Shares total {total / 100}%
        {state === "incomplete" ? " — must be exactly 100%, or all empty" : state === "complete" ? " ✓" : " (none recorded)"}
      </p>

      <AddPerson filmId={filmId} onAdd={(p) => setRows((rs) => [...rs, { person: p, role: "", share: "" }])} />

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={pending || state === "incomplete"} className="btn-primary">
          {pending ? "Saving…" : "Save credits"}
        </button>
        {status ? (
          <p role="status" className={`text-sm ${status.kind === "ok" ? "text-ok" : "text-bad"}`}>
            {status.text}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function AddPerson({ filmId, onAdd }: { filmId: string; onAdd: (p: PersonOption) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PersonOption[]>([]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    const query = q.trim();
    const t = setTimeout(() => {
      if (query.length < 2) {
        setResults([]);
        return;
      }
      searchPeople(filmId, query).then(setResults);
    }, 250);
    return () => clearTimeout(t);
  }, [q, filmId]);

  function pick(p: PersonOption) {
    onAdd(p);
    setQ("");
    setResults([]);
  }

  return (
    <div className="card grid gap-2">
      <label htmlFor="add-person" className="label">
        Add a person
      </label>
      <input
        id="add-person"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setError("");
        }}
        placeholder="Search by name"
        className="field"
        autoComplete="off"
      />
      {results.length ? (
        <ul className="grid gap-1" aria-label="Matching people">
          {results.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => pick(p)} className="w-full rounded-lg px-2 py-1 text-left hover:bg-bg">
                {p.name} <span className="text-xs text-muted">/p/{p.slug}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {q.trim().length >= 2 ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await createPerson(filmId, q);
              if ("error" in res) setError(res.error);
              else pick(res);
            })
          }
          className="btn-ghost justify-self-start"
        >
          + Add “{q.trim()}” as a new person
        </button>
      ) : null}
      {error ? <p className="text-sm text-bad">{error}</p> : null}
    </div>
  );
}

function InviteButton({ personId, name }: { personId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-1 text-xs text-accent underline">
        Invite to claim
      </button>
    );
  }
  return (
    <form
      className="mt-1 flex flex-wrap items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await fetch(`/api/people/${personId}/invite`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email }),
          });
          setMsg(res.ok ? "Invite sent." : ((await res.json().catch(() => null))?.error ?? "Couldn't send."));
        });
      }}
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label={`Email for ${name}`}
        placeholder="email@example.com"
        className="field w-48 py-1 text-xs"
      />
      <button disabled={pending} className="btn-ghost px-3 py-1 text-xs">
        Send
      </button>
      <span aria-live="polite" className="text-xs text-muted">
        {msg}
      </span>
    </form>
  );
}
