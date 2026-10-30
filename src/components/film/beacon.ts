"use client";

/** First-party page event (D38): film id + event + source only; the server adds a session cookie. */
export function sendPageEvent(filmId: string, event: "view" | "trailer_play") {
  const params = new URLSearchParams(window.location.search);
  const body = JSON.stringify({
    filmId,
    event,
    ref: params.get("ref"),
    utmSource: params.get("utm_source"),
    referrer: document.referrer || null,
  });
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/events/page", new Blob([body], { type: "application/json" }));
  } else {
    void fetch("/api/events/page", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
  }
}
