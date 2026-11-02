import { ViewerFooter, ViewerHeader } from "@/components/app/viewer-header";

/** Marketing pages use the same dark header and footer as the viewer side (mockup 01). */
export function SiteHeader() {
  return <ViewerHeader />;
}

export function SiteFooter() {
  return <ViewerFooter />;
}

/** Dark page shell for marketing and legal pages: header, content, footer. */
export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="theater flex min-h-full flex-1 flex-col">
      <ViewerHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      <ViewerFooter />
    </div>
  );
}
