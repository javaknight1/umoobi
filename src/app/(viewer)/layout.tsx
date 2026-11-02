import { MarketingShell } from "@/components/marketing/site-header";

/** Viewer side: dark navy, like a theater. No third-party scripts on these pages (VPPA, D38). */
export default function ViewerLayout({ children }: LayoutProps<"/">) {
  return <MarketingShell>{children}</MarketingShell>;
}
