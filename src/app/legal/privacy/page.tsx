import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Privacy" };

/** VPPA (18 U.S.C. §2710), D38. */
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="October 30, 2026">
      <p className="card">
        What you watch is private. Umoobi doesn&apos;t use advertising pixels or third-party trackers on film or watch
        pages, and never shares what you watched with advertisers.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>Your email, birth year (to confirm you&apos;re 13 or older) and display name.</li>
        <li>Your rentals, purchases, library, reviews, follows and lists, so the service works.</li>
        <li>Payment details are handled by our payment processor; we never see your full card number.</li>
        <li>Anonymous viewing statistics (which part of a film is played) are kept under a random session id, not your account.</li>
      </ul>
      <h2>What filmmakers see</h2>
      <p>
        Filmmakers see totals: visits, plays, sales, where visitors came from and which states they&apos;re in. They don&apos;t
        see who bought or watched, unless you choose to share your name and email with that filmmaker on a separate
        consent form. That consent lasts at most two years and you can withdraw it any time in{" "}
        <Link href="/settings/sharing">sharing settings</Link>.
      </p>
      <h2>Who we share with</h2>
      <ul>
        <li>Service providers that run Umoobi for us (payments, video hosting, email, error reporting), only to provide the service.</li>
        <li>Law enforcement only with a valid warrant, court order or as the law requires.</li>
      </ul>
      <h2>Keeping and deleting data</h2>
      <p>
        If you close your account, we delete your viewing and purchase history within a year, except records we must
        keep for tax and accounting.
      </p>
    </LegalPage>
  );
}
