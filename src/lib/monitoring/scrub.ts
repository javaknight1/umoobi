/**
 * Error reports must never tie a person to a film (VPPA, D38): drop user identity, cookies and
 * IPs, and replace film/person slugs in URLs with placeholders.
 */
export function scrubPath(path: string): string {
  return path
    .replace(/\/(f|watch|p|c|claim|lists)\/[^/?#]+/g, "/$1/[id]")
    .replace(/\/checkout\/[^/?#]+/g, "/checkout/[id]")
    .replace(/[?#].*$/, "");
}

export interface ScrubbableEvent {
  user?: unknown;
  request?: { url?: string; cookies?: unknown; headers?: Record<string, string>; query_string?: unknown; data?: unknown };
}

export function scrubEvent<E extends ScrubbableEvent>(event: E): E {
  delete event.user;
  if (event.request) {
    if (event.request.url) {
      try {
        const u = new URL(event.request.url);
        event.request.url = `${u.origin}${scrubPath(u.pathname)}`;
      } catch {
        event.request.url = scrubPath(event.request.url);
      }
    }
    delete event.request.cookies;
    delete event.request.query_string;
    delete event.request.data;
    if (event.request.headers) {
      const keep = ["user-agent", "content-type", "accept"];
      event.request.headers = Object.fromEntries(Object.entries(event.request.headers).filter(([k]) => keep.includes(k.toLowerCase())));
    }
  }
  return event;
}
