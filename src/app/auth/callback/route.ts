import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  // Validate `next` param to prevent open redirect attacks.
  // Parse through URL constructor and verify hostname matches our app.
  const rawNext = searchParams.get("next") ?? "/";
  let next = "/";
  if (rawNext.startsWith("/") && !rawNext.startsWith("//")) {
    // Additional safety: parse as full URL and verify hostname matches
    try {
      const parsed = new URL(rawNext, req.url);
      const appUrl = new URL(req.url);
      if (parsed.hostname === appUrl.hostname) {
        next = parsed.pathname + parsed.search + parsed.hash;
      }
    } catch {
      // Invalid URL — fall back to "/"
    }
  }

  // Validate env vars at runtime instead of using ! assertions
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (code) {
    let response = NextResponse.redirect(new URL(next, req.url));

    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              req.cookies.set(name, value)
            );
            response = NextResponse.redirect(new URL(next, req.url));
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Route based on role from user_metadata
      const role = (data.user.user_metadata?.role as string) ?? "student";
      let redirectTo = "/student/listings";
      if (role === "landlord") redirectTo = "/landlord/listings";
      else if (role === "admin") redirectTo = "/admin/verification-queue";

      // Check if profile exists; if not (first Google sign-in), create one
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", data.user.id)
        .single();

      if (!profile) {
        const { error: insertError } = await supabase.from("profiles").insert({
          id: data.user.id,
          full_name: data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? "",
          phone: "",
          role: "student",
        });

        if (insertError) {
          console.error("Failed to create profile on OAuth callback:", insertError.message);
        }
      }

      return NextResponse.redirect(new URL(redirectTo, req.url));
    }
  }

  // If something went wrong, redirect to login with an error hint
  return NextResponse.redirect(new URL("/login", req.url));
}
