"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { startCheckout, type CheckoutState } from "../actions";

/** License acknowledgment (AB 2426, D39) and the hand-off to Stripe-hosted payment (D43). */
export function CheckoutForm({ offerId, kind, free }: { offerId: string; kind: "rent" | "buy"; free: boolean }) {
  const [state, action, pending] = useActionState(startCheckout, { error: null } as CheckoutState);
  const [ack, setAck] = useState(false);
  const needsAck = kind === "buy";

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="offer_id" value={offerId} />
      {needsAck ? (
        <label className="flex items-start gap-3 rounded-2xl border border-accent bg-accent/10 p-4 text-[0.95rem]">
          <input
            type="checkbox"
            name="license_ack"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
            className="mt-1 h-4 w-4 accent-[#1a1730]"
          />
          <span>
            I understand I&apos;m buying a <strong>license to stream</strong>, not ownership. The filmmaker can remove this
            film; if that happens within 30 days I&apos;m refunded. If Umoobi closes, access can end.{" "}
            <Link href="/legal/license" className="underline underline-offset-2">
              License terms
            </Link>
          </span>
        </label>
      ) : null}
      <button disabled={pending || (needsAck && !ack)} className="btn-primary py-4 text-lg">
        {pending ? "One moment…" : free ? "Add to my library" : "Continue to payment"}
      </button>
      {!free ? <p className="text-sm text-muted">Apple Pay, Google Pay or card on the next step. Sales tax is added there.</p> : null}
      {state.error ? (
        <p role="alert" className="text-sm text-bad">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
