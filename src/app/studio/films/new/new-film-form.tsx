"use client";

import { useActionState } from "react";
import { createFilm, type FormState } from "../actions";

export function NewFilmForm() {
  const [state, action, pending] = useActionState(createFilm, { status: "idle", message: "" } as FormState);
  return (
    <form action={action} className="card grid gap-4">
      <div className="grid gap-1">
        <label htmlFor="title" className="label">
          Title
        </label>
        <input id="title" name="title" required className="field" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1">
          <label htmlFor="runtime_minutes" className="label">
            Runtime (minutes)
          </label>
          <input id="runtime_minutes" name="runtime_minutes" inputMode="decimal" required className="field" />
        </div>
        <div className="grid gap-1">
          <label htmlFor="kind" className="label">
            Feature or short
          </label>
          <select id="kind" name="kind" className="field" defaultValue="feature">
            <option value="feature">Feature (40 min or more)</option>
            <option value="short">Short</option>
          </select>
        </div>
      </div>
      <button disabled={pending} className="btn-primary justify-self-start">
        {pending ? "Creating…" : "Create film"}
      </button>
      {state.status === "error" ? (
        <p role="alert" className="text-sm text-bad">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
