import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/** Supabase client for Client Components. Reads only what row-level security allows. */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
