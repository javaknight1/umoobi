import { NextResponse, type NextRequest } from "next/server";
import { devOutbox } from "@/lib/email";

/** Dev only: the console email fallback's recent messages, for e2e tests. 404 everywhere else. */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development" || process.env.RESEND_API_KEY) {
    return new NextResponse("Not found", { status: 404 });
  }
  const to = request.nextUrl.searchParams.get("to");
  return NextResponse.json(devOutbox.filter((e) => !to || e.to === to));
}
