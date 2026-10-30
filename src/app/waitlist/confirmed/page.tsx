import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SiteHeader } from "@/components/marketing/site-header";

export const metadata: Metadata = { title: "You're on the list", robots: { index: false } };

export default function ConfirmedPage({ searchParams }: PageProps<"/waitlist/confirmed">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-4 py-20">
        <Suspense fallback={<h1 className="font-display text-5xl">One moment…</h1>}>
          <Body searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function Body({ searchParams }: Pick<PageProps<"/waitlist/confirmed">, "searchParams">) {
  const { error, role } = await searchParams;
  if (error) {
    return (
      <>
        <h1 className="font-display text-5xl">That link didn&apos;t work.</h1>
        <p className="text-muted">It may have been mistyped. Join again and we&apos;ll send a fresh one.</p>
        <Link href="/#waitlist" className="btn-primary self-start">
          Back to the waitlist
        </Link>
      </>
    );
  }
  return (
    <>
      <h1 className="font-display text-5xl">You&apos;re on the list.</h1>
      {role === "filmmaker" ? (
        <p className="text-muted">
          We&apos;re opening a closed beta for 10 filmmakers first, then widening it. If your film is on Vimeo On
          Demand, download everything you need before November 20, 2026.
        </p>
      ) : (
        <p className="text-muted">We&apos;ll email you when Umoobi opens.</p>
      )}
      <Link href="/guides/leaving-vimeo-on-demand" className="btn-ghost self-start">
        Read the Vimeo On Demand guide
      </Link>
    </>
  );
}
