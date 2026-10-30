"use client";

import { useActionState } from "react";
import { sendSignInLink, type SignInState } from "./actions";

const initialState: SignInState = { status: "idle", message: "" };

export function SignInForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(sendSignInLink, initialState);

  if (state.status === "sent") {
    return (
      <p aria-live="polite" className="rounded-lg bg-ok/10 px-4 py-3 text-ok">
        {state.message}
      </p>
    );
  }
  if (state.status === "too_young") {
    return (
      <p aria-live="polite" className="rounded-lg bg-bad/10 px-4 py-3 text-bad">
        {state.message}
      </p>
    );
  }

  const askBirthYear = state.status === "needs_birth_year";

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <label htmlFor="email" className="label">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.email}
        className="field"
      />
      {askBirthYear ? (
        <>
          <label htmlFor="birth_year" className="label">
            What year were you born?
          </label>
          <input
            id="birth_year"
            name="birth_year"
            inputMode="numeric"
            pattern="[0-9]{4}"
            placeholder="YYYY"
            required
            className="field"
          />
        </>
      ) : null}
      <button disabled={pending} className="btn-primary">
        {pending ? "Sending…" : askBirthYear ? "Create account and email me a link" : "Email me a sign-in link"}
      </button>
      <p aria-live="polite" className={`text-sm ${state.status === "error" ? "text-bad" : "text-muted"}`}>
        {state.status === "error" || askBirthYear ? state.message : ""}
      </p>
    </form>
  );
}
