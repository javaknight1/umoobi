"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { joinWaitlist, type WaitlistState } from "@/app/waitlist/actions";
import { ROLE_LABELS, SELLS_TODAY, type WaitlistRole } from "@/lib/waitlist";

const initial: WaitlistState = { status: "idle", message: "" };

export function WaitlistForm() {
  const [state, action, pending] = useActionState(joinWaitlist, initial);
  const [role, setRole] = useState<WaitlistRole>("filmmaker");
  const params = useSearchParams();
  const source = params.get("ref") ?? params.get("utm_source") ?? "";
  const err = state.fieldErrors ?? {};

  if (state.status === "done") {
    return (
      <div role="status" className="card border-ok/40">
        <p className="font-display text-2xl">You&apos;re nearly on the list.</p>
        <p className="mt-2 text-muted">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="card grid gap-4" noValidate>
      <input type="hidden" name="source" value={source} />
      <div aria-hidden className="hidden">
        <label>
          Company <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <fieldset className="grid gap-2">
        <legend className="label mb-2">I&apos;m a…</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ROLE_LABELS) as WaitlistRole[]).map((r) => (
            <label
              key={r}
              className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm ${role === r ? "border-accent bg-accent text-accent-fg" : "border-line"}`}
            >
              <input
                type="radio"
                name="role"
                value={r}
                checked={role === r}
                onChange={() => setRole(r)}
                className="sr-only"
              />
              {ROLE_LABELS[r]}
            </label>
          ))}
        </div>
        {err.role ? <p className="text-sm text-bad">{err.role}</p> : null}
      </fieldset>

      <div className="grid gap-1">
        <label htmlFor="wl-email" className="label">
          Email
        </label>
        <input id="wl-email" name="email" type="email" autoComplete="email" required className="field" />
        {err.email ? <p className="text-sm text-bad">{err.email}</p> : null}
      </div>

      {role === "filmmaker" ? (
        <>
          <div className="grid gap-1">
            <label htmlFor="wl-title" className="label">
              Film title
            </label>
            <input id="wl-title" name="film_title" className="field" placeholder="Salt & Static" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1">
              <label htmlFor="wl-kind" className="label">
                Feature or short
              </label>
              <select id="wl-kind" name="film_kind" className="field" defaultValue="">
                <option value="">Choose…</option>
                <option value="feature">Feature (40 min or more)</option>
                <option value="short">Short</option>
              </select>
            </div>
            <div className="grid gap-1">
              <label htmlFor="wl-sells" className="label">
                Where you sell today
              </label>
              <select id="wl-sells" name="sells_today" className="field" defaultValue="">
                <option value="">Choose…</option>
                {SELLS_TODAY.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-1">
            <label htmlFor="wl-trailer" className="label">
              Trailer link <span className="font-normal text-muted">(optional)</span>
            </label>
            <input id="wl-trailer" name="trailer_url" inputMode="url" className="field" placeholder="vimeo.com/…" />
            {err.trailer_url ? <p className="text-sm text-bad">{err.trailer_url}</p> : null}
          </div>
        </>
      ) : null}

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="launch_emails" className="mt-1" />
        <span>Email me about the launch and beta invites. You can unsubscribe any time.</span>
      </label>

      <button disabled={pending} className="btn-primary">
        {pending ? "Joining…" : "Join the waitlist"}
      </button>
      {state.status === "error" ? <p className="text-sm text-bad">{state.message}</p> : null}
    </form>
  );
}
