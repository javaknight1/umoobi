import { createServerClient } from "@supabase/ssr";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { launchStage, openDuringWaitlist } from "@/lib/launch";

/** Pages that need a signed-in user. Data is still protected by row-level security; this only saves a round trip. */
const MEMBER_PATHS = ["/library", "/studio", "/staff", "/settings", "/filmmakers/apply", "/watch"];

/** Refreshes the Supabase session cookie on every request so Server Components see a valid user. */
export async function updateSession(request: NextRequest) {
  // Before launch only the pre-launch pages exist; everything else goes to the landing page.
  if (launchStage === "waitlist" && !openDuringWaitlist(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const { pathname, search } = request.nextUrl;
  const memberPath = MEMBER_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Anonymous visitors (most traffic from shared film links) have no session to refresh, so
  // skip the auth round trip entirely.
  if (!request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) {
    if (memberPath) {
      const signIn = new URL("/sign-in", request.url);
      signIn.searchParams.set("next", pathname + search);
      return NextResponse.redirect(signIn);
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // Don't run code between createServerClient and getClaims: it validates and refreshes the token.
  const { data, error } = await supabase.auth.getClaims();

  // If the auth server is slow or unreachable, don't treat the visitor as signed out: the page's
  // own requireUser check decides, so a hiccup doesn't bounce signed-in users to sign-in.
  if (!data?.claims && !isAuthRetryableFetchError(error) && memberPath) {
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("next", pathname + search);
    return NextResponse.redirect(signIn);
  }

  return response;
}
