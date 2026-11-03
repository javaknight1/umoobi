import type { Instrumentation } from "next";

/**
 * Server-side error reporting to Sentry, only when SENTRY_DSN is set. No browser SDK, so no
 * third-party script on film or watch pages (VPPA); every event is scrubbed of identity first.
 */
export async function register() {
  if (!process.env.SENTRY_DSN || process.env.NEXT_RUNTIME !== "nodejs") return;
  const Sentry = await import("@sentry/node");
  const { scrubEvent } = await import("@/lib/monitoring/scrub");
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0,
    beforeSend: (event) => scrubEvent(event),
  });
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (!process.env.SENTRY_DSN || process.env.NEXT_RUNTIME !== "nodejs") return;
  const Sentry = await import("@sentry/node");
  const { scrubPath } = await import("@/lib/monitoring/scrub");
  Sentry.captureException(err, {
    tags: { routerKind: context.routerKind, routeType: context.routeType, route: context.routePath },
    extra: { method: request.method, path: scrubPath(request.path) },
  });
  await Sentry.flush(2000);
};
