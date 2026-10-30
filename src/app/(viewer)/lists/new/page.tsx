import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { NewListForm } from "./new-list-form";

export const metadata: Metadata = { title: "New list", robots: { index: false } };

export default function NewListPage({ searchParams }: PageProps<"/lists/new">) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-12">
      <h1 className="font-display text-4xl">New list</h1>
      <Suspense fallback={<div className="card mt-6 h-48" />}>
        <Body searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Body({ searchParams }: Pick<PageProps<"/lists/new">, "searchParams">) {
  const { film } = await searchParams;
  await requireUser(`/lists/new${typeof film === "string" ? `?film=${film}` : ""}`);
  return <NewListForm filmId={typeof film === "string" ? film : null} />;
}
