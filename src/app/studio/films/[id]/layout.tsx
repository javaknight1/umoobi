import Link from "next/link";
import { Suspense } from "react";

const TABS = [
  ["", "Details"],
  ["/uploads", "Uploads"],
  ["/credits", "Credits"],
  ["/pricing", "Pricing"],
  ["/publish", "Publish"],
] as const;

/** Tabs for one film. Each tab page loads the film itself (and checks ownership). */
export default function FilmLayout({ children, params }: LayoutProps<"/studio/films/[id]">) {
  return (
    <div className="grid gap-6">
      {/* params are request data under Cache Components, so the tab links stream in. */}
      <Suspense fallback={<div className="h-10 border-b border-line" />}>
        <Tabs params={params} />
      </Suspense>
      {children}
    </div>
  );
}

async function Tabs({ params }: Pick<LayoutProps<"/studio/films/[id]">, "params">) {
  const { id } = await params;
  return (
    <nav className="flex flex-wrap gap-2 border-b border-line pb-3 text-sm" aria-label="Film sections">
      {TABS.map(([path, label]) => (
        <Link key={label} href={`/studio/films/${id}${path}`} className="rounded-full border border-line px-3 py-1 hover:border-fg/40">
          {label}
        </Link>
      ))}
    </nav>
  );
}
