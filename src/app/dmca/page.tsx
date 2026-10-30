import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { NoticeForm } from "./notice-form";

export const metadata: Metadata = { title: "Copyright and takedowns" };

export default function DmcaPage() {
  return (
    <LegalPage title="Copyright and takedowns" updated="October 30, 2026">
      <p>
        If you believe something on Umoobi infringes your copyright, send a notice below. We remove material when we
        receive a valid notice, tell the filmmaker, and restore it 10 to 14 business days after a valid counter-notice
        unless you tell us you&apos;ve filed a court action. Accounts that repeatedly infringe are closed.
      </p>
      <p className="text-sm text-muted">Designated agent registration with the U.S. Copyright Office is pending.</p>
      <NoticeForm />
    </LegalPage>
  );
}
