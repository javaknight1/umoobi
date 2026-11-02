import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AboutForm } from "./about-form";
import { startIdentity, startPayouts } from "./actions";

export const metadata: Metadata = { title: "Apply as a filmmaker", robots: { index: false } };

const STEPS = ["About you", "Verification", "Payouts"] as const;

/** Filmmaker sign-up (mockup 02): light page, stepper in the top bar, confidence and limits on the right. */
export default function ApplyPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Suspense fallback={<TopBar step={1} />}>
        <Wizard />
      </Suspense>
    </div>
  );
}

function TopBar({ step }: { step: number }) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[90rem] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <Logo />
        <ol className="flex flex-wrap items-center gap-5" aria-label="Progress">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = step > n;
            return (
              <li key={label} aria-current={step === n ? "step" : undefined} className={`flex items-center gap-2 font-semibold ${step < n ? "text-muted" : ""}`}>
                <span
                  aria-hidden
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${done ? "bg-ok text-white" : step === n ? "bg-ink text-ink-fg" : "bg-line text-white"}`}
                >
                  {done ? "✓" : n}
                </span>
                {label}
              </li>
            );
          })}
        </ol>
        <p className="text-muted">Step {Math.min(step, 3)} of 3</p>
      </div>
    </header>
  );
}

async function Wizard() {
  const user = await requireUser("/filmmakers/apply");
  const supabase = await createClient();
  const { data: account } = await supabase.from("filmmaker_accounts").select("*").eq("owner_id", user.id).maybeSingle();
  const decided = account && account.status !== "applying";
  const step = decided ? 4 : !account ? 1 : account.identity_status !== "verified" ? 2 : 3;
  const { data: verification } = account
    ? await supabase.from("verifications").select("score, signals").eq("account_id", account.id).eq("subject", "account").order("created_at", { ascending: false }).limit(1).maybeSingle()
    : { data: null };
  const reasons = ((verification?.signals as { reasons?: string[] } | null)?.reasons ?? []).filter((r) => /\(\+\d+\)/.test(r));

  return (
    <>
      <TopBar step={step} />
      <main className="mx-auto grid w-full max-w-6xl flex-1 items-start gap-6 px-4 py-10 sm:px-8 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-8 sm:p-10">
          {decided ? (
            <Outcome status={account.status} name={account.display_name} tier={account.tier} reasons={reasons} />
          ) : step === 1 ? (
            <>
              <h2 className="mb-1 font-display text-4xl">About you</h2>
              <p className="mb-6 text-muted">Three steps: about you, an automatic ID and past-work check, and your payout account.</p>
              <AboutForm defaults={{}} />
            </>
          ) : step === 2 ? (
            <div className="grid gap-4">
              <h2 className="font-display text-4xl">Check your ID</h2>
              <p className="text-muted">
                Our payment partner checks a photo ID and a quick selfie. It takes about two minutes, and we never see or
                store your ID. We also look at the past work you listed.
              </p>
              {account!.identity_status === "requires_input" ? (
                <p className="rounded-xl bg-warn/10 px-4 py-3 text-warn">The last check couldn&apos;t be completed. Try again with a clear photo of your ID.</p>
              ) : null}
              <form action={startIdentity}>
                <button className="btn-dark px-6 py-3">{account!.identity_status === "pending" ? "Continue ID check" : "Start ID check"}</button>
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
              <h2 className="font-display text-4xl">Set up payouts</h2>
              <p className="text-muted">
                Add the bank account your earnings go to. Payouts are monthly, and each statement shows every sale with the
                Umoobi fee and card fee on their own lines.
              </p>
              <form action={startPayouts}>
                <button className="btn-dark px-6 py-3">{account!.stripe_account_id ? "Continue payout setup" : "Set up payouts"}</button>
              </form>
            </div>
          )}
        </section>

        <aside className="grid gap-6">
          {decided && account.vetting_score !== null ? <Confidence score={account.vetting_score} /> : null}
          <section className="card grid gap-3">
            <h2 className="font-display text-xl">What you can publish this year</h2>
            <dl className="grid">
              <div className="flex justify-between border-b border-line py-3">
                <dt>Feature films</dt>
                <dd className="font-semibold">{account?.tier === "established" ? 12 : 3}</dd>
              </div>
              <div className="flex justify-between py-3">
                <dt>Shorts (under 40 min)</dt>
                <dd className="font-semibold">{account?.tier === "established" ? "Unlimited" : 12}</dd>
              </div>
            </dl>
            <p className="text-sm text-muted">Limits rise to 12 features and unlimited shorts after 90 days, 10 sales and no strikes.</p>
          </section>
        </aside>
      </main>
    </>
  );
}

/** Score with the three bands (D11): under 50 rejected, 50–79 human review, 80+ approved. */
function Confidence({ score }: { score: number }) {
  return (
    <section className="card grid gap-3">
      <h2 className="font-display text-xl">Verification confidence</h2>
      <p>
        <span className={`font-display text-6xl ${score >= 80 ? "text-ok" : score >= 50 ? "text-warn" : "text-bad"}`}>{score}</span>
        <span className="ml-2 text-muted">out of 100</span>
      </p>
      <div className="relative h-3 overflow-hidden rounded-full" aria-hidden>
        <div className="absolute inset-0 flex">
          <span className="w-1/2 bg-bad" />
          <span className="w-[30%] bg-warn" />
          <span className="flex-1 bg-ok" />
        </div>
        <span className="absolute top-0 h-full w-1 -translate-x-1/2 bg-ink" style={{ left: `${score}%` }} />
      </div>
      <div className="flex justify-between text-sm text-muted">
        <span>Rejected</span>
        <span>Human review</span>
        <span>Approved</span>
      </div>
    </section>
  );
}

function Outcome({ status, name, tier, reasons }: { status: string; name: string; tier: string; reasons: string[] }) {
  if (status === "approved") {
    return (
      <div className="grid gap-4">
        <h2 className="font-display text-4xl">You&apos;re approved, {name}.</h2>
        <p className="text-muted">We checked everything automatically. Your yearly upload limits: {tier === "established" ? "12 features and unlimited shorts" : "3 features and 12 shorts"}.</p>
        {reasons.length ? (
          <ul className="grid">
            {reasons.map((r) => (
              <li key={r} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
                <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-ok text-sm text-white">
                  ✓
                </span>
                {r.replace(/\s*\(\+\d+\)/, "")}
              </li>
            ))}
          </ul>
        ) : null}
        <Link href="/studio" className="btn-dark justify-self-start px-6 py-3">
          Go to your studio
        </Link>
      </div>
    );
  }
  if (status === "review") {
    return (
      <div className="grid gap-2">
        <h2 className="font-display text-4xl">Almost there.</h2>
        <p className="text-muted">
          Our automatic checks weren&apos;t sure, so a person at Umoobi is taking a look. We answer within 24 hours and will
          email you.
        </p>
      </div>
    );
  }
  return (
    <div className="grid gap-2">
      <h2 className="font-display text-4xl">We couldn&apos;t approve this application.</h2>
      <p className="text-muted">If you think that&apos;s a mistake, reply to the email we sent and we&apos;ll look again.</p>
    </div>
  );
}
