import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "What you get when you rent or buy" };

/** AB 2426 (Cal. Bus. & Prof. Code §17500.6) and D39: buying is a license, not ownership. */
export default function LicensePage() {
  return (
    <LegalPage title="What you get when you rent or buy" updated="October 30, 2026">
      <p className="card text-lg">
        <strong>Buying a film on Umoobi gets you a license to watch it, not ownership of it.</strong> Your access can
        end if the filmmaker removes the film or if Umoobi closes.
      </p>
      <h2>Renting</h2>
      <ul>
        <li>You have 30 days to start watching. Once you press play, you can watch as often as you like for the rental window shown at checkout (for example, 48 hours).</li>
        <li>Rentals keep working even if the filmmaker removes the film while your rental is active.</li>
      </ul>
      <h2>Buying</h2>
      <ul>
        <li>A purchase is a personal, non-transferable license to stream the film on Umoobi for as long as Umoobi offers it.</li>
        <li>It isn&apos;t a download and doesn&apos;t give you a copy of the file.</li>
        <li>If the filmmaker removes the film within 30 days of your purchase, you&apos;re refunded automatically. After that, access ends without a refund.</li>
        <li>If Umoobi closes, rentals and purchases end and refunds aren&apos;t guaranteed. We&apos;d try to give notice and point you to where the film can be watched next, but we can&apos;t promise it.</li>
      </ul>
      <h2>What you can&apos;t do</h2>
      <ul>
        <li>Copy, record, share your account or re-stream the film.</li>
        <li>Show the film to a paying or public audience. Screening and education licenses are separate.</li>
      </ul>
    </LegalPage>
  );
}
