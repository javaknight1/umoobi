import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip static files, images, webhooks and the worker (they authenticate themselves).
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|api/webhooks|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|vtt)$).*)",
  ],
};
