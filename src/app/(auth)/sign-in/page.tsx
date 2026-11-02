import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand";
import { safeNextPath } from "@/lib/auth/next-path";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <div className="theater flex min-h-full flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-16">
        <Logo />
        <div className="card grid gap-5 p-8">
          <h1 className="font-display text-4xl">Sign in</h1>
          <Suspense fallback={<div className="h-40" />}>
            <SignInBody searchParams={searchParams} />
          </Suspense>
        </div>
        <p className="text-center text-sm text-muted">
          New here? Enter your email and we&apos;ll set up your account. <Link href="/" className="underline">What is Umoobi?</Link>
        </p>
      </main>
    </div>
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
