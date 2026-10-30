import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-header";

export const metadata: Metadata = {
  title: "Leaving Vimeo On Demand: what to download before November 20",
  description:
    "Vimeo On Demand stopped new sales on September 21, 2026 and takes storefronts offline on November 20, 2026. Here's what to save and how moving to Umoobi will work.",
};

const DOWNLOAD = [
  ["Your master file", "The highest-quality source you uploaded. If you no longer have it locally, download the original from each video's settings."],
  ["Trailers and extras", "Every trailer, teaser, clip and bonus video attached to your page."],
  ["Artwork", "Poster, thumbnails and background images, at full size."],
  ["Subtitles and captions", "Every caption file (usually .vtt or .srt), one per language."],
  ["Sales reports", "Export every sales and payout report you can. You'll want them for taxes and to know your audience."],
  ["Buyer communication", "Vimeo doesn't hand over buyer emails. If you emailed buyers through Vimeo, save copies of what you sent."],
  ["Page copy and reviews", "Your synopsis, credits, press quotes and laurels, so you can rebuild the page anywhere."],
];

export default function Guide() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16">
        <p className="text-sm font-medium uppercase tracking-widest text-accent">Guide</p>
        <h1 className="mt-2 font-display text-5xl leading-tight">Leaving Vimeo On Demand</h1>
        <p className="mt-4 text-lg text-muted">
          Vimeo On Demand stopped new sales on <strong>September 21, 2026</strong> and takes storefronts offline on{" "}
          <strong>November 20, 2026</strong>. After that, buyers lose access to films they paid for. Here&apos;s what to
          save now, and how moving to Umoobi will work.
        </p>

        <h2 className="mt-12 font-display text-3xl">Download before November 20</h2>
        <ol className="mt-6 grid gap-4">
          {DOWNLOAD.map(([t, b], i) => (
            <li key={t} className="card grid grid-cols-[2rem_1fr] gap-3">
              <span className="font-display text-2xl text-accent">{i + 1}</span>
              <div>
                <p className="font-medium">{t}</p>
                <p className="text-sm text-muted">{b}</p>
              </div>
            </li>
          ))}
        </ol>

        <h2 className="mt-12 font-display text-3xl">Tell your buyers</h2>
        <p className="mt-4 text-muted">
          Your buyers will lose access when the storefront closes. Post on your channels where the film will live next,
          and keep the link you share the same once you&apos;ve moved, so word of mouth keeps working.
        </p>

        <h2 className="mt-12 font-display text-3xl">Moving to Umoobi</h2>
        <ul className="mt-4 grid list-disc gap-2 pl-5 text-muted">
          <li>Get verified in three steps: about you, an automatic ID and past-work check, and your payout account.</li>
          <li>Upload your master, trailers and subtitles. We encode them and run rights and content checks.</li>
          <li>Set your prices (rent, buy or both, from $0.99) and add your cast and crew.</li>
          <li>Share your film page. It&apos;s your storefront, website and link page in one.</li>
        </ul>
        <p className="mt-4 text-muted">
          Umoobi is opening a closed beta in 2027. Buyers from Vimeo won&apos;t carry over automatically, because buyer
          identities belong to them, not to either platform.
        </p>
        <Link href="/#waitlist" className="btn-primary mt-8">
          Join the waitlist
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
