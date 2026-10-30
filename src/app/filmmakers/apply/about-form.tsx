"use client";

import { useActionState } from "react";
import { saveAbout, type AboutState } from "./actions";

interface Defaults {
  display_name?: string | null;
  legal_name?: string | null;
  website?: string | null;
  past_work?: string | null;
}

export function AboutForm({ defaults }: { defaults: Defaults }) {
  const [state, action, pending] = useActionState(saveAbout, { status: "idle", message: "" } as AboutState);
  const err = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4">
      <Field id="display_name" label="Filmmaker or company name" hint="Shown on your films, e.g. Low Tide Pictures" defaultValue={defaults.display_name} error={err.display_name} />
      <Field id="legal_name" label="Your legal name" hint="As on your ID. Used for the ID check and tax forms, never shown publicly." defaultValue={defaults.legal_name} error={err.legal_name} />
      <Field id="website" label="Website" optional defaultValue={defaults.website} />
      <div className="grid gap-1">
        <label htmlFor="past_work" className="label">
          Past work
        </label>
        <p className="text-xs text-muted">Links to your films, IMDb, festival pages or trailers. One per line.</p>
        <textarea id="past_work" name="past_work" rows={4} defaultValue={defaults.past_work ?? ""} className="field" />
      </div>
      <button disabled={pending} className="btn-primary justify-self-start">
        {pending ? "Saving…" : "Save and continue"}
      </button>
      {state.status === "error" ? <p className="text-sm text-bad">{state.message}</p> : null}
    </form>
  );
}

function Field(props: { id: string; label: string; hint?: string; optional?: boolean; defaultValue?: string | null; error?: string }) {
  return (
    <div className="grid gap-1">
      <label htmlFor={props.id} className="label">
        {props.label} {props.optional ? <span className="font-normal text-muted">(optional)</span> : null}
      </label>
      {props.hint ? <p className="text-xs text-muted">{props.hint}</p> : null}
      <input id={props.id} name={props.id} defaultValue={props.defaultValue ?? ""} className="field" />
      {props.error ? <p className="text-sm text-bad">{props.error}</p> : null}
    </div>
  );
}
