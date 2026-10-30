import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" updated="October 30, 2026">
      <p>
        These terms cover your use of Umoobi, a marketplace where independent filmmakers rent and sell their films to
        viewers in the United States. By creating an account you agree to them.
      </p>
      <h2>Accounts</h2>
      <ul>
        <li>You must be 13 or older. Accounts are for one person; keep your sign-in link private.</li>
        <li>Umoobi is available in the United States only.</li>
      </ul>
      <h2>Viewers</h2>
      <ul>
        <li>Rentals and purchases are licenses to watch, not ownership. See <Link href="/legal/license">what you get when you rent or buy</Link>.</li>
        <li>Prices are set by filmmakers. Sales tax is added at checkout and paid by Umoobi to each state.</li>
        <li>Reviews are open only to people who bought or rented the film. Don&apos;t post anything unlawful or misleading.</li>
      </ul>
      <h2>Filmmakers</h2>
      <ul>
        <li>You must be verified before uploading. You confirm you own or control the rights to everything you upload, including music, footage and likenesses.</li>
        <li>Umoobi takes 10% of each sale, with a minimum of $0.25, and the card processing fee is deducted from your share. Each is shown on its own line. Earnings are paid monthly.</li>
        <li>Prices start at $0.99. Films can be free only if they run under 5 minutes. Free trailers and clips are limited to 15% of the runtime.</li>
        <li>No sexually explicit content. Films that use AI-generated imagery must be declared and are labeled; undeclared AI is removed with a strike. See the <Link href="/legal/ai-policy">AI policy</Link>.</li>
        <li>You can remove a film at any time. Purchases from the last 30 days are refunded from your share.</li>
        <li>Uploads are limited each calendar year: 3 features and 12 shorts for new accounts, 12 features and unlimited shorts for established ones.</li>
      </ul>
      <h2>Copyright</h2>
      <p>
        We respond to notices of claimed infringement under the DMCA and end the accounts of repeat infringers. See{" "}
        <Link href="/dmca">copyright and takedowns</Link>.
      </p>
      <h2>If Umoobi closes</h2>
      <p>
        We make no promise that Umoobi will keep operating. If it closes, rentals and purchases end and refunds
        aren&apos;t guaranteed. Filmmakers are paid the balance they&apos;re owed under these terms.
      </p>
      <h2>Liability</h2>
      <p>
        Umoobi is provided as is. To the extent the law allows, our liability is limited to the amount you paid us in
        the 12 months before a claim.
      </p>
    </LegalPage>
  );
}
