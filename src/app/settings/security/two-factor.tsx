"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Step =
  | { kind: "loading" }
  | { kind: "enroll"; factorId: string; qr: string; secret: string }
  | { kind: "challenge"; factorId: string }
  | { kind: "done" };

/** Enrolls a TOTP factor on first use, otherwise asks for a code to reach aal2. */
export function TwoFactor({ next }: { next: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "loading" });
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  // Strict Mode runs effects twice in dev; enrolling twice would show a stale QR code.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const supabase = createClient();
    (async () => {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === "aal2") return setStep({ kind: "done" });
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verified = factors?.totp.find((f) => f.status === "verified");
      if (verified) return setStep({ kind: "challenge", factorId: verified.id });
      // Clear half-finished enrollments so a fresh QR code can be issued.
      for (const f of factors?.all ?? []) if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator" });
      if (error || !data) return setError("Couldn't start setup. Sign in again and retry.");
      setStep({ kind: "enroll", factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    })();
  }, []);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (step.kind !== "enroll" && step.kind !== "challenge") return;
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: step.factorId, code: code.trim() });
    if (error) return setError("That code didn't match. Try the newest one.");
    router.push(next);
    router.refresh();
  }

  if (step.kind === "loading") return <div className="card mt-8 h-64" aria-busy />;
  if (step.kind === "done") {
    return (
      <div className="card mt-8 grid gap-3">
        <p>Two-factor sign-in is on for this session.</p>
        <a href={next} className="btn-primary self-start">
          Continue
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={verify} className="card mt-8 grid gap-4">
      {step.kind === "enroll" ? (
        <>
          <p className="text-sm">Scan this with your authenticator app, then enter the 6-digit code.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={step.qr} alt="QR code for your authenticator app" className="h-48 w-48 rounded bg-white p-2" />
          <p className="font-mono text-xs break-all text-muted">Or enter this key: {step.secret}</p>
        </>
      ) : (
        <p className="text-sm">Enter the 6-digit code from your authenticator app.</p>
      )}
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        aria-label="6-digit code"
        className="field font-mono tracking-widest"
        required
      />
      <button className="btn-primary">Verify</button>
      {error ? <p className="text-sm text-bad">{error}</p> : null}
    </form>
  );
}
