import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/** Cookie-free client for data anyone may read (the catalog), so responses can be cached. */
export function createPublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
