import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { safeNextPath } from "@/lib/auth/next-path";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <Link href="/" className="font-display text-2xl">
        Umoobi
      </Link>
      <h1 className="font-display text-4xl">Sign in</h1>
      <Suspense fallback={<div className="h-40" />}>
        <SignInBody searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/** Reads the URL (error, next), so it streams in after the static page. */
async function SignInBody({ searchParams }: Pick<PageProps<"/sign-in">, "searchParams">) {
  const { error, next } = await searchParams;
  return (
    <>
      {error ? (
        <p className="text-sm text-bad">That link has expired or was already used. Request a new one.</p>
      ) : null}
      <SignInForm next={safeNextPath(typeof next === "string" ? next : null)} />
    </>
  );
}
