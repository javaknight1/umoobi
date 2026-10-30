"use client";

import { useActionState } from "react";

export interface FormState {
  status: "idle" | "ok" | "error";
  message: string;
}

/** A form bound to a server action that returns a status message, with one submit button. */
export function StatusForm({
  action,
  submit,
  pendingLabel = "Saving…",
  className = "grid gap-4",
  buttonClassName = "btn-primary justify-self-start",
  children,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  submit: string;
  pendingLabel?: string;
  className?: string;
  buttonClassName?: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, { status: "idle", message: "" } as FormState);
  return (
    <form action={formAction} className={className}>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className={buttonClassName}>
          {pending ? pendingLabel : submit}
        </button>
        {state.message ? (
          <p role={state.status === "error" ? "alert" : "status"} className={`text-sm ${state.status === "error" ? "text-bad" : "text-ok"}`}>
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
