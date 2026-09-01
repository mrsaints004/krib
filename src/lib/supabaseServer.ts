import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the secret/service-role key.
 * This BYPASSES all RLS policies — never import this into any file
 * that ships to the browser (no "use client" components, no
 * client-side hooks). Only use inside API routes / route handlers,
 * e.g. the message filter route, or admin-only server actions.
 *
 * Uses lazy initialization to avoid crashing the entire process
 * on import when env vars are missing (e.g. during build or CI).
 */

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL environment variable. " +
      "Set it in .env.local or your deployment environment."
    );
  }

  if (!supabaseSecretKey) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY environment variable. " +
      "Set it in .env.local or your deployment environment."
    );
  }

  _client = createClient(supabaseUrl, supabaseSecretKey);
  return _client;
}

// Export a proxy that lazily initializes on first access
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    const value = client[prop as keyof SupabaseClient];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
