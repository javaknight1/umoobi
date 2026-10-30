import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "AI policy" };

/** D42 and D46. */
export default function AiPolicyPage() {
  return (
    <LegalPage title="AI-generated films" updated="October 30, 2026">
      <p>
        Films made with generative AI are welcome on Umoobi, but viewers deserve to know. If even one frame or scene
        is clearly AI-generated, the film is labeled &ldquo;AI-generated&rdquo; on its page, poster and checkout, and
        viewers can hide labeled films in Discover.
      </p>
      <h2>What counts</h2>
      <ul>
        <li>Any frame, shot or scene whose picture was created by a generative model: text-to-video or image-to-video, generated characters, sets or backgrounds, generative face or body swaps, and de-aging.</li>
      </ul>
      <h2>What doesn&apos;t count</h2>
      <ul>
        <li>Tools that only enhance real footage: upscaling, noise reduction, stabilization, color, rotoscope masks and auto-captions.</li>
      </ul>
      <h2>How it&apos;s enforced</h2>
      <ul>
        <li>Filmmakers declare AI use before uploading.</li>
        <li>We scan sampled frames for AI-generated imagery, and viewers can report undisclosed AI.</li>
        <li>Before publishing, a flag on an undeclared film blocks it until it&apos;s labeled or a person at Umoobi clears it.</li>
        <li>After publishing, a flag or report hides the film from sale right away. Staff confirm within 24 hours, because scanners can be wrong. Confirmed undeclared AI is removed with a strike, recent buyers are refunded, and the filmmaker can re-upload it labeled.</li>
      </ul>
    </LegalPage>
  );
}
