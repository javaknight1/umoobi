"use client";

import { useEffect } from "react";
import { sendPageEvent } from "./beacon";

/** Records one first-party "view" per film page load. */
export function PageView({ filmId }: { filmId: string }) {
  useEffect(() => {
    sendPageEvent(filmId, "view");
  }, [filmId]);
  return null;
}
