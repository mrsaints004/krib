import { createClient } from "@supabase/supabase-js";

// Safe for browser use — relies entirely on RLS policies for security,
// never has elevated access. Uses the "publishable" key (Supabase's
// current naming for what used to be called "anon key").
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);
