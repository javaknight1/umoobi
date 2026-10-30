"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-renders the page every 2 s while the webhook confirms payment. */
export function Refresh() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 2000);
    return () => clearInterval(t);
  }, [router]);
  return null;
}
