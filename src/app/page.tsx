import Link from "next/link";
import { launchStage } from "@/lib/launch";
import { Suspense } from "react";
import { Avatar, Poster } from "@/components/brand";
import { MarketingShell } from "@/components/marketing/site-header";
import { WaitlistForm } from "@/components/marketing/waitlist-form";
import { formatCents, previewSale } from "@/lib/money";

const purchase = previewSale(1299);
const rental = previewSale(499);
const foundingOffer = process.env.FOUNDING_OFFER === "true"; // D35, shown only once confirmed

/** Illustrative posters for the hero (sample titles, not live films). */
const HERO_POSTERS = [
  ["Salt & Static", "Maya Okafor", "mt-6"],
  ["Kiln", "Theo Vance", "mt-14"],
  ["Paper Moons", "Jun Park", ""],
  ["Dust Bowl Choir", "Ellen Marsh", "mt-6"],
  ["Harvest Moon Motel", "Carlos Mendez", "mt-14"],
  ["The Last Ferry to Ocracoke", "", ""],
] as const;

const COMPARISON = [
  ["Storefront", "TribuShare Audience plan, $199/yr", "Included"],
  ["Fee per sale", "10% + $0.50 per sale = $779", "10% = $429"],
  ["Card processing", "Included above", "2.9% + 30¢ per sale = $335"],
  ["Website for the film", "Squarespace Core = $348", "The film page is the website"],
  ["Link-in-bio page", "Linktree Pro = $144", "The film page is the link"],
  ["Cast and crew pages", "Not available", "Included"],
] as const;

const STEPS = [
  ["Apply in minutes", "Verify your ID and link your past work. Most filmmakers are approved automatically, the same day."],
  ["Upload and set your price", "Rent, buy or both. You pick the price and the rental window. Every film is checked for rights automatically."],
  ["Share one link", "Post your film's page anywhere. Fans rent in two taps, and you get paid out every month."],
] as const;

const CREW = ["Leilani Kahale · Actor", "Sam Ortiz · Cinematographer", "Priya Natarajan · Editor", "Eli Brandt · Composer"];

export default function Home() {
  return (
    <MarketingShell>
      <div className="border-b border-line bg-surface px-4 py-2 text-center text-sm text-muted">
        Vimeo On Demand takes storefronts offline on <strong className="text-fg">November 20, 2026</strong>.{" "}
        <Link href="/guides/leaving-vimeo-on-demand" className="text-accent underline underline-offset-2">
          What to download before then →
        </Link>
      </div>

      <main className="mx-auto w-full max-w-[90rem] flex-1 px-4 sm:px-8">
        {/* Hero */}
        <section className="grid items-center gap-12 py-14 lg:grid-cols-[1.15fr_1fr] lg:py-20">
          <div className="grid content-center gap-7">
            <h1 className="font-display text-5xl leading-[0.98] sm:text-7xl lg:text-[5.4rem]">
              Your film is finished. Now let people watch it.
            </h1>
            <p className="max-w-xl text-lg text-muted sm:text-xl">
              Umoobi is where independent filmmakers rent and sell their films directly to their audience, at the
              price they choose.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="#waitlist" className="btn-primary px-7 py-3.5 text-base">
                Join the waitlist
              </Link>
              {launchStage === "full" ? (
                <Link href="/discover" className="btn-ghost px-7 py-3.5 text-base">
                  Browse films
                </Link>
              ) : (
                <Link href="/guides/leaving-vimeo-on-demand" className="btn-ghost px-7 py-3.5 text-base">
                  Leaving Vimeo On Demand?
                </Link>
              )}
            </div>
            <dl className="mt-2 grid max-w-xl grid-cols-2 gap-6">
              <div>
                <dt className="sr-only">Your share</dt>
                <dd className="font-display text-4xl">90%</dd>
                <dd className="text-sm text-muted">of every sale is yours, before card fees</dd>
              </div>
              <div>
                <dt className="sr-only">Lowest price</dt>
                <dd className="font-display text-4xl">$0.99</dd>
                <dd className="text-sm text-muted">is the lowest price, so every sale pays you</dd>
              </div>
            </dl>
          </div>
          <figure aria-label="Sample film posters" className="grid grid-cols-3 gap-4 sm:gap-5">
            {HERO_POSTERS.map(([title, by, offset]) => (
              <div key={title} className={offset}>
                <Poster title={title} url={null} slug={title} by={by || null} className="shadow-2xl" />
              </div>
            ))}
            <figcaption className="col-span-3 text-right text-xs text-muted">Sample films</figcaption>
          </figure>
        </section>

        {/* How it works */}
        <section className="grid gap-6 py-10">
          <h2 className="font-display text-4xl sm:text-5xl">How it works for filmmakers</h2>
          <ol className="grid gap-5 md:grid-cols-3">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="card grid content-start gap-2 p-8">
                <span className="font-display text-5xl text-accent">{i + 1}</span>
                <p className="font-display text-2xl">{title}</p>
                <p className="text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Every cent + crew pages */}
        <section id="fees" className="grid gap-5 py-10 lg:grid-cols-2">
          <div className="rounded-3xl bg-accent p-8 text-accent-fg sm:p-10">
            <h2 className="font-display text-4xl">You see every cent</h2>
            <p className="mt-1 text-lg">A {formatCents(purchase.priceCents)} purchase, as it shows up in your money page:</p>
            <dl className="mt-6 grid text-lg">
              <Line k="Buyer pays" v={`${formatCents(purchase.priceCents)} + sales tax`} />
              <Line k="Umoobi fee (10%)" v={`−${formatCents(purchase.feeCents)}`} />
              <Line k="Card processing" v={`−${formatCents(purchase.processingCents)}`} />
              <Line k="You get" v={formatCents(purchase.netCents)} strong />
            </dl>
            <p className="mt-4 text-sm opacity-80">
              A {formatCents(rental.priceCents)} rental earns you {formatCents(rental.netCents)}. The fee is 10% with a 25¢
              minimum; the card fee is an estimate (2.9% + 30¢).
            </p>
            {foundingOffer ? (
              <p className="mt-4 rounded-2xl bg-white/40 p-4 text-sm">
                <strong>Founding filmmakers:</strong> join the waitlist before January 31, 2027 and pay 5% instead of 10%
                for your first 12 months.
              </p>
            ) : null}
          </div>
          <div className="card grid content-start gap-5 p-8 sm:p-10">
            <h2 className="font-display text-4xl">Your cast and crew get pages too</h2>
            <p className="text-lg text-muted">
              Every credit becomes a public page that actors and crew can claim. Viewers follow the people they like and
              hear when their next film drops.
            </p>
            <ul className="flex flex-wrap gap-3">
              {CREW.map((c) => (
                <li key={c} className="flex items-center gap-2 rounded-full bg-surface-2 py-1.5 pl-1.5 pr-4 text-sm font-semibold">
                  <Avatar name={c.split(" · ")[0]} size={28} />
                  {c}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted">Sample names.</p>
          </div>
        </section>

        {/* Cost comparison */}
        <section className="card my-10 p-8 sm:p-10">
          <h2 className="font-display text-4xl">About $764 a year instead of $1,470.</h2>
          <p className="mt-3 max-w-3xl text-muted">
            For a film selling about $4,300 a year (600 rentals at $4.99 and 100 purchases at $12.99), compared with the
            stack you&apos;d assemble now that Vimeo On Demand is closing. Estimates; your email tool stays the same either
            way.
          </p>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="border-b border-line text-sm text-muted">
                  <th className="py-3 pr-4 font-medium">What you pay for</th>
                  <th className="py-3 pr-4 font-medium">Today&apos;s stack</th>
                  <th className="py-3 font-medium">With Umoobi</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map(([what, today, umoobi]) => (
                  <tr key={what} className="border-b border-line">
                    <td className="py-3.5 pr-4 font-semibold">{what}</td>
                    <td className="py-3.5 pr-4 text-muted">{today}</td>
                    <td className="py-3.5">{umoobi}</td>
                  </tr>
                ))}
                <tr className="font-display text-lg">
                  <td className="py-4 pr-4">Total for the year</td>
                  <td className="py-4 pr-4 text-muted">about $1,470</td>
                  <td className="py-4 text-accent">about $764</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Viewers */}
        <section className="grid gap-6 py-10 md:grid-cols-2">
          <div className="grid content-start gap-4">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent">For viewers</p>
            <h2 className="font-display text-4xl sm:text-5xl">Films you won&apos;t find on the big apps.</h2>
            <p className="text-lg text-muted">
              Rent or buy directly from the people who made them. No ads, no trackers on what you watch.
            </p>
          </div>
          <ul className="grid gap-3">
            {[
              "A library with rentals, purchases and your place in every film",
              "Cast to your TV with Chromecast or AirPlay",
              "Follow filmmakers and actors you love",
              "Reviews from people who actually watched",
            ].map((t) => (
              <li key={t} className="rounded-2xl border border-line bg-surface px-5 py-4">
                {t}
              </li>
            ))}
          </ul>
        </section>

        {/* Waitlist */}
        <section id="waitlist" className="grid gap-10 py-14 md:grid-cols-2">
          <div className="grid content-start gap-4">
            <h2 className="font-display text-4xl sm:text-5xl">Join the waitlist.</h2>
            <p className="text-lg text-muted">
              We&apos;re opening a closed beta for 10 filmmakers in 2027, then widening it. Tell us about your film and
              we&apos;ll be in touch. We&apos;ll only email you to confirm your address unless you tick the box.
            </p>
            {launchStage === "full" ? (
              <Link href="/filmmakers/apply" className="text-sm text-accent hover:underline">
                Already invited? Apply as a filmmaker →
              </Link>
            ) : null}
          </div>
          <Suspense fallback={<div className="card h-96" />}>
            <WaitlistForm />
          </Suspense>
        </section>
      </main>
    </MarketingShell>
  );
}

function Line({ k, v, strong = false }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 border-b border-accent-fg/15 py-3 last:border-0 ${strong ? "font-display text-2xl" : ""}`}>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
