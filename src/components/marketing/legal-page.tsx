import { SiteFooter, SiteHeader } from "./site-header";

/** Shared shell for legal pages. Drafts until the lawyer review (T029). */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-14">
        <h1 className="font-display text-5xl">{title}</h1>
        <p className="mt-2 text-sm text-muted">Last updated {updated}. Draft pending legal review.</p>
        <div className="legal mt-8 grid gap-4 leading-relaxed [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-2xl [&_li]:ml-5 [&_li]:list-disc [&_a]:underline">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
