"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { LICENSE_STATEMENT } from "@/lib/library/format";
import { startCheckout, type CheckoutState } from "../actions";

export function CheckoutForm({ offerId, kind, free, label }: { offerId: string; kind: "rent" | "buy"; free: boolean; label: string }) {
  const [state, action, pending] = useActionState(startCheckout, { error: null } as CheckoutState);
  const [ack, setAck] = useState(false);
  const needsAck = kind === "buy";

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="offer_id" value={offerId} />
      {needsAck ? (
        <>
          <p className="rounded-xl border border-marquee/60 bg-marquee/10 p-4 text-sm">
            <strong className="block text-base">You&apos;re buying a license, not the film.</strong>
            {LICENSE_STATEMENT}{" "}
            <Link href="/legal/license" className="underline underline-offset-2">
              Read the license terms
            </Link>
            .
          </p>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="license_ack" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-1" />
            <span>I understand I&apos;m buying a license to stream this film, not ownership of it.</span>
          </label>
        </>
      ) : null}
      <button disabled={pending || (needsAck && !ack)} className="btn-primary">
        {pending ? "One moment…" : free ? "Add to my library" : label}
      </button>
      {!free ? <p className="text-xs text-muted">Pay with Apple Pay, Google Pay or card on the next page. Sales tax is added there.</p> : null}
      {state.error ? (
        <p role="alert" className="text-sm text-bad">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
