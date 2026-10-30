"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function NewListForm({ filmId }: { filmId: string | null }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <form
      className="card mt-6 grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        start(async () => {
          const res = await fetch("/api/lists", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              title: form.get("title"),
              description: form.get("description"),
              isPublic: form.get("is_public") === "on",
              filmId,
            }),
          });
          const body = await res.json().catch(() => null);
          if (!res.ok) return setError(body?.error ?? "Couldn't create the list.");
          router.push(`/lists/${body.id}`);
        });
      }}
    >
      <div className="grid gap-1">
        <label htmlFor="title" className="label">
          Title
        </label>
        <input id="title" name="title" required maxLength={120} className="field" placeholder="Island films" />
      </div>
      <div className="grid gap-1">
        <label htmlFor="description" className="label">
          Description <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea id="description" name="description" rows={3} maxLength={1000} className="field" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_public" defaultChecked /> Public: anyone with the link can see it
      </label>
      <button disabled={pending} className="btn-primary justify-self-start">
        Create list
      </button>
      {error ? <p className="text-sm text-bad">{error}</p> : null}
    </form>
  );
}
