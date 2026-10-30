"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

/** Adds a film to one of the viewer's lists, or starts a new list with it. */
export function AddToList({ filmId, lists }: { filmId: string; lists: { id: string; title: string }[] }) {
  const [listId, setListId] = useState(lists[0]?.id ?? "");
  const [status, setStatus] = useState("");
  const [pending, start] = useTransition();

  if (!lists.length) {
    return (
      <Link href={`/lists/new?film=${filmId}`} className="text-sm text-muted hover:text-fg">
        + Start a list with this film
      </Link>
    );
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await fetch(`/api/lists/${listId}/items`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ filmId }),
          });
          setStatus(res.ok ? "Added." : "Couldn't add.");
        });
      }}
    >
      <label htmlFor="add-to-list" className="text-muted">
        Add to list
      </label>
      <select id="add-to-list" value={listId} onChange={(e) => setListId(e.target.value)} className="field w-auto py-1">
        {lists.map((l) => (
          <option key={l.id} value={l.id}>
            {l.title}
          </option>
        ))}
      </select>
      <button disabled={pending} className="btn-ghost px-3 py-1">
        Add
      </button>
      <Link href={`/lists/new?film=${filmId}`} className="text-muted hover:text-fg">
        New list
      </Link>
      <span aria-live="polite" className="text-muted">
        {status}
      </span>
    </form>
  );
}
