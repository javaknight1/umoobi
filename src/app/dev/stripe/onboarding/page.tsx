import { Suspense } from "react";
import { DevShell } from "../shell";
import { completeOnboarding } from "../actions";

export default function DevOnboarding({ searchParams }: PageProps<"/dev/stripe/onboarding">) {
  return (
    <DevShell title="Payout account (dev)">
      <Suspense>
        <Body searchParams={searchParams} />
      </Suspense>
    </DevShell>
  );
}

async function Body({ searchParams }: Pick<PageProps<"/dev/stripe/onboarding">, "searchParams">) {
  const { account, return: ret } = await searchParams;
  return (
    <form action={completeOnboarding} className="grid gap-3">
      <input type="hidden" name="account" value={String(account ?? "")} />
      <input type="hidden" name="return" value={String(ret ?? "")} />
      <p className="text-sm text-muted">Stands in for Stripe-hosted onboarding (bank account, tax details).</p>
      <button className="btn-primary justify-self-start">Finish payout setup</button>
    </form>
  );
}
