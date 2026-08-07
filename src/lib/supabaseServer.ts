import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the secret/service-role key.
 * This BYPASSES all RLS policies — never import this into any file
 * that ships to the browser (no "use client" components, no
 * client-side hooks). Only use inside API routes / route handlers,
 * e.g. the message filter route, or admin-only server actions.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);
