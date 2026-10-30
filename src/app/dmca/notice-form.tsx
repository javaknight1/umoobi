"use client";

import { useActionState } from "react";
import { submitNotice, type DmcaState } from "./actions";

export function NoticeForm() {
  const [state, action, pending] = useActionState(submitNotice, { status: "idle", message: "" } as DmcaState);
  if (state.status === "done") return <p role="status" className="card text-ok">{state.message}</p>;
  return (
    <form action={action} className="card grid gap-4">
      <F name="claimant_name" label="Your full name" />
      <F name="claimant_email" label="Email" type="email" />
      <div className="grid gap-1">
        <label htmlFor="work_described" className="label">The copyrighted work</label>
        <textarea id="work_described" name="work_described" rows={3} className="field" />
      </div>
      <F name="infringing_url" label="Link to the material on Umoobi" />
      <label className="flex gap-2 text-sm">
        <input type="checkbox" name="good_faith" className="mt-1" />
        I have a good-faith belief that use of the material is not authorized by the copyright owner, its agent or the law.
      </label>
      <label className="flex gap-2 text-sm">
        <input type="checkbox" name="accurate" className="mt-1" />
        The information in this notice is accurate and, under penalty of perjury, I am the owner or authorized to act for the owner.
      </label>
      <F name="signature" label="Signature (type your full name)" />
      <button disabled={pending} className="btn-primary justify-self-start">{pending ? "Sending…" : "Send notice"}</button>
      {state.status === "error" ? <p className="text-sm text-bad">{state.message}</p> : null}
    </form>
  );
}

function F({ name, label, type = "text" }: { name: string; label: string; type?: string }) {
  return (
    <div className="grid gap-1">
      <label htmlFor={name} className="label">{label}</label>
      <input id={name} name={name} type={type} className="field" />
    </div>
  );
}
