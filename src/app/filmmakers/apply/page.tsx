import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SiteHeader } from "@/components/marketing/site-header";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AboutForm } from "./about-form";
import { startIdentity, startPayouts } from "./actions";

export const metadata: Metadata = { title: "Apply as a filmmaker", robots: { index: false } };

export default function ApplyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <p className="text-sm font-medium uppercase tracking-widest text-accent">Filmmaker sign-up</p>
        <h1 className="mt-2 font-display text-5xl">Sell on Umoobi</h1>
        <Suspense fallback={<div className="card mt-8 h-80" />}>
          <Wizard />
        </Suspense>
      </main>
    </>
  );
}

const STEPS = ["About you", "ID and past work", "Payout account"] as const;

async function Wizard() {
  const user = await requireUser("/filmmakers/apply");
  const supabase = await createClient();
  const { data: account } = await supabase.from("filmmaker_accounts").select("*").eq("owner_id", user.id).maybeSingle();

  if (account && account.status !== "applying") return <Outcome status={account.status} name={account.display_name} tier={account.tier} />;

  const step = !account ? 1 : account.identity_status !== "verified" ? 2 : !account.payouts_enabled ? 3 : 3;

  return (
    <div className="mt-8 grid gap-6">
      <ol className="flex flex-wrap gap-2 text-sm" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={step === i + 1 ? "step" : undefined}
            className={`rounded-full border px-3 py-1 ${step === i + 1 ? "border-accent bg-accent text-accent-fg" : step > i + 1 ? "border-ok text-ok" : "border-line text-muted"}`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>
      <section className="card">
        {step === 1 ? (
          <>
            <h2 className="mb-4 font-display text-3xl">About you</h2>
            <AboutForm defaults={{}} />
          </>
        ) : step === 2 ? (
          <div className="grid gap-4">
            <h2 className="font-display text-3xl">Check your ID</h2>
            <p className="text-muted">
              Our payment partner checks a photo ID and a quick selfie. It takes about two minutes, and we never see
              or store your ID. We also look at the past work you listed.
            </p>
            {account!.identity_status === "requires_input" ? (
              <p className="rounded-lg bg-warn/10 px-3 py-2 text-sm text-warn">
                The last check couldn&apos;t be completed. Try again with a clear photo of your ID.
              </p>
            ) : null}
            <form action={startIdentity}>
              <button className="btn-primary">{account!.identity_status === "pending" ? "Continue ID check" : "Start ID check"}</button>
            </form>
            <details className="text-sm">
              <summary className="cursor-pointer text-muted">Edit your details</summary>
              <div className="mt-4">
                <AboutForm defaults={account!} />
              </div>
            </details>
          </div>
        ) : (
          <div className="grid gap-4">
            <h2 className="font-display text-3xl">Set up payouts</h2>
            <p className="text-muted">
              Add the bank account your earnings go to. Payouts are monthly, and each statement shows every sale with
              the Umoobi fee and card fee on their own lines.
            </p>
            <form action={startPayouts}>
              <button className="btn-primary">{account!.stripe_account_id ? "Continue payout setup" : "Set up payouts"}</button>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}

function Outcome({ status, name, tier }: { status: string; name: string; tier: string }) {
  if (status === "approved") {
    return (
      <div className="card mt-8 grid gap-4">
        <h2 className="font-display text-3xl">You&apos;re approved, {name}.</h2>
        <p className="text-muted">
          Your yearly upload limits: {tier === "established" ? "12 features and unlimited shorts" : "3 features and 12 shorts"}.
          Accounts become established after 90 days with 10 sales and no strikes.
        </p>
        <Link href="/studio" className="btn-primary justify-self-start">
          Go to your studio
        </Link>
      </div>
    );
  }
  if (status === "review") {
    return (
      <div className="card mt-8 grid gap-2">
        <h2 className="font-display text-3xl">Almost there.</h2>
        <p className="text-muted">
          Our automatic checks weren&apos;t sure, so a person at Umoobi is taking a look. We answer within 24 hours and
          will email you.
        </p>
      </div>
    );
  }
  return (
    <div className="card mt-8 grid gap-2">
      <h2 className="font-display text-3xl">We couldn&apos;t approve this application.</h2>
      <p className="text-muted">If you think that&apos;s a mistake, reply to the email we sent and we&apos;ll look again.</p>
    </div>
  );
}
