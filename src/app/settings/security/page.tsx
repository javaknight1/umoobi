import type { Metadata } from "next";
import { Suspense } from "react";
import { safeNextPath } from "@/lib/auth/next-path";
import { TwoFactor } from "./two-factor";

export const metadata: Metadata = { title: "Two-factor sign-in", robots: { index: false } };

export default function SecurityPage({ searchParams }: PageProps<"/settings/security">) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-16">
      <h1 className="font-display text-4xl">Two-factor sign-in</h1>
      <p className="mt-2 text-muted">
        Staff tools need a second step at sign-in: a 6-digit code from an authenticator app.
      </p>
      <Suspense fallback={<div className="card mt-8 h-64" />}>
        <Body searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Body({ searchParams }: Pick<PageProps<"/settings/security">, "searchParams">) {
  const { next } = await searchParams;
  return <TwoFactor next={safeNextPath(typeof next === "string" ? next : "/staff/waitlist")} />;
}
