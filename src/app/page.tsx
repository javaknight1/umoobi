import Link from "next/link";
import { Suspense } from "react";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-header";
import { WaitlistForm } from "@/components/marketing/waitlist-form";
import { formatCents, previewSale } from "@/lib/money";

const rental = previewSale(499);
const purchase = previewSale(1299);
const foundingOffer = process.env.FOUNDING_OFFER === "true"; // D35, shown only once confirmed

const COMPARISON = [
  ["Storefront", "TribuShare Audience plan, $199/yr", "Included"],
  ["Fee per sale", "10% + $0.50 per sale = $779", "10% = $429"],
  ["Card processing", "Included above", "2.9% + 30¢ per sale = $335"],
  ["Website for the film", "Squarespace Core = $348", "The film page is the website"],
  ["Link-in-bio page", "Linktree Pro = $144", "The film page is the link"],
  ["Cast and crew pages", "Not available", "Included"],
] as const;

const STEPS = [
  ["Get verified", "Three steps: about you, an automatic ID and past-work check, and your payout account. Most filmmakers are approved the same day."],
  ["Upload and price", "Upload your master. Choose rent, buy or both, at prices from $0.99. Free trailers and clips bring viewers in."],
  ["Share one link", "Your film page is the link you post. Viewers rent in two taps and watch on the web or cast to their TV."],
  ["Get paid monthly", "Every sale line by line: price, Umoobi fee, card fee, what you earned. Payouts arrive monthly."],
] as const;

export default function Home() {
  return (
    <>
      <SiteHeader />
      <div className="bg-fg px-4 py-2 text-center text-sm text-bg">
        Vimeo On Demand takes storefronts offline on <strong>November 20, 2026</strong>.{" "}
        <Link href="/guides/leaving-vimeo-on-demand" className="underline underline-offset-2">
          What to download before then →
        </Link>
      </div>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1.2fr_1fr] md:py-24">
          <div className="flex flex-col justify-center gap-6">
            <p className="text-sm font-medium uppercase tracking-widest text-accent">For independent filmmakers</p>
            <h1 className="font-display text-5xl leading-[1.05] md:text-7xl">
              Sell your film from one link, at your price.
            </h1>
            <p className="max-w-xl text-lg text-muted">
              Umoobi lets any verified independent filmmaker in the US rent or sell their film directly to their own
              audience. One page replaces the storefront, the website and the link page, and every sale brings a new
              viewer onto a platform built to help them find your next film.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="#waitlist" className="btn-primary">
                Join the waitlist
              </Link>
              <Link href="#fees" className="btn-ghost">
                See the fee math
              </Link>
            </div>
          </div>

          {/* Mini film page preview (sample data) */}
          <div className="theater overflow-hidden rounded-3xl border border-line shadow-2xl">
            <div className="aspect-video bg-[radial-gradient(circle_at_30%_30%,#3b2f22,#0f0e0c_70%)] p-5">
              <span className="rounded-full bg-black/50 px-3 py-1 text-xs text-fg">▶ Trailer · 2:10</span>
            </div>
            <div className="grid gap-3 p-5">
              <p className="text-xs uppercase tracking-widest text-muted">Low Tide Pictures · 2026 · 94 min</p>
              <p className="font-display text-3xl">Salt &amp; Static</p>
              <p className="text-sm text-muted">
                A radio operator on a dying island station picks up a signal that shouldn&apos;t exist.
              </p>
              <div className="flex gap-2">
                <span className="btn-primary px-4 py-2">Rent {formatCents(499)} · 48 h</span>
                <span className="btn-ghost px-4 py-2">Buy {formatCents(1299)}</span>
              </div>
              <p className="text-xs text-muted">
                Buying gets you a license to watch, not ownership. Sample film and filmmaker.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="font-display text-4xl">How it works</h2>
            <ol className="mt-8 grid gap-6 md:grid-cols-4">
              {STEPS.map(([title, body], i) => (
                <li key={title} className="grid content-start gap-2">
                  <span className="font-display text-3xl text-accent">{i + 1}</span>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-muted">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Fee math */}
        <section id="fees" className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2">
          <div className="grid content-start gap-4">
            <h2 className="font-display text-4xl">One fee, shown on every line.</h2>
            <p className="text-muted">
              Umoobi takes 10% of each sale (at least 25¢), and the card processor takes its fee. That&apos;s it: no
              monthly plan, no setup fee, nothing when your film isn&apos;t selling. Buyers pay your price plus sales
              tax, which Umoobi collects and pays to each state.
            </p>
            {foundingOffer ? (
              <p className="card border-marquee/60 text-sm">
                <strong>Founding filmmakers:</strong> join the waitlist before January 31, 2027 and pay 5% instead of
                10% for your first 12 months.
              </p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["A $4.99 rental", rental],
              ["A $12.99 purchase", purchase],
            ].map(([label, s]) => {
              const sale = s as typeof rental;
              return (
                <div key={label as string} className="card grid gap-2 font-mono text-sm">
                  <p className="font-sans font-medium">{label as string}</p>
                  <Row k="Your price" v={formatCents(sale.priceCents)} />
                  <Row k="Umoobi fee (10%)" v={`−${formatCents(sale.feeCents)}`} />
                  <Row k="Card processing" v={`−${formatCents(sale.processingCents)}`} />
                  <div className="border-t border-line pt-2">
                    <Row k="You earn" v={formatCents(sale.netCents)} strong />
                  </div>
                  <p className="font-sans text-xs text-muted">Card fee is an estimate (2.9% + 30¢).</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Cost comparison */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="font-display text-4xl">About $764 a year instead of $1,470.</h2>
            <p className="mt-3 max-w-2xl text-muted">
              For a film selling about $4,300 a year (600 rentals at $4.99 and 100 purchases at $12.99), compared with
              the stack you&apos;d assemble now that Vimeo On Demand is closing. Estimates; your email tool stays the
              same either way.
            </p>
            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className="py-2 pr-4 font-medium">What you pay for</th>
                    <th className="py-2 pr-4 font-medium">Today&apos;s stack</th>
                    <th className="py-2 font-medium">With Umoobi</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map(([what, today, umoobi]) => (
                    <tr key={what} className="border-b border-line">
                      <td className="py-3 pr-4 font-medium">{what}</td>
                      <td className="py-3 pr-4 text-muted">{today}</td>
                      <td className="py-3">{umoobi}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className="py-3 pr-4">Total for the year</td>
                    <td className="py-3 pr-4">about $1,470</td>
                    <td className="py-3 text-accent">about $764</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* What you get */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-4xl">More than a storefront.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["Cast and crew pages", "Everyone in your credits gets a public page they can claim. Viewers follow actors to hear about their next film. Revenue shares are recorded now; automatic split payouts come next."],
              ["Know who watched", "Visits, trailer plays and sales; where viewers came from; top states; where viewers stop watching. Totals only, never a list of who watched, unless a buyer chooses to share."],
              ["Discovery that sells", "Trending, new this week, genre shelves, shorts and “because you watched”. Every sale starts a viewer's library, and the next film they find might be yours."],
              ["Watch on the TV", "Viewers stream on the web and cast to the TV with Chromecast or AirPlay. Rentals start when they press play."],
              ["Fair rules, enforced", "Prices from $0.99. Free only for films under 5 minutes. No sexually explicit content. AI-generated imagery is allowed, but labeled."],
              ["Pull a film any time", "Remove a film whenever you like. New sales stop and recent buyers are refunded automatically."],
            ].map(([t, b]) => (
              <div key={t} className="card grid content-start gap-2">
                <p className="font-medium">{t}</p>
                <p className="text-sm text-muted">{b}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Viewers */}
        <section className="theater">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 md:grid-cols-2">
            <div className="grid content-start gap-4">
              <p className="text-sm font-medium uppercase tracking-widest text-accent">For viewers</p>
              <h2 className="font-display text-4xl">Films you won&apos;t find on the big apps.</h2>
              <p className="text-muted">
                Rent or buy directly from the people who made them. Your money goes to the filmmaker, not an
                aggregator. No ads, no trackers on what you watch.
              </p>
            </div>
            <ul className="grid gap-3 text-sm">
              {["A library with rentals, purchases and your place in every film", "Cast to your TV with Chromecast or AirPlay", "Follow filmmakers and actors you love", "Reviews from people who actually watched"].map((t) => (
                <li key={t} className="rounded-xl border border-line bg-surface px-4 py-3">
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Waitlist */}
        <section id="waitlist" className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2">
          <div className="grid content-start gap-4">
            <h2 className="font-display text-4xl">Join the waitlist.</h2>
            <p className="text-muted">
              We&apos;re opening a closed beta for 10 filmmakers in 2027, then widening it. Tell us about your film and
              we&apos;ll be in touch. We&apos;ll only email you to confirm your address unless you tick the box.
            </p>
          </div>
          <Suspense fallback={<div className="card h-96" />}>
            <WaitlistForm />
          </Suspense>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Row({ k, v, strong = false }: { k: string; v: string; strong?: boolean }) {
  return (
    <p className={`flex justify-between ${strong ? "font-semibold" : ""}`}>
      <span className="font-sans text-muted">{k}</span>
      <span>{v}</span>
    </p>
  );
}
