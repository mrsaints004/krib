import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { checkRateLimitMulti } from "@/lib/rateLimit";

const IP_RATE_LIMIT = {
  prefix: "auth:login:ip",
  maxRequests: 10,
  windowSeconds: 60,
} as const;

const EMAIL_RATE_LIMIT = {
  prefix: "auth:login:email",
  maxRequests: 5,
  windowSeconds: 300, // 5 failed attempts per 5 minutes per email
} as const;

const loginSchema = z.object({
  email: z.string().email("Invalid email").max(254),
  password: z.string().min(1, "Password required").max(256, "Password too long"),
});

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  // Parse body first so we can rate limit by email too
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  // Rate limit by both IP and email
  const rl = checkRateLimitMulti([
    { key: ip, config: IP_RATE_LIMIT },
    { key: normalizedEmail, config: EMAIL_RATE_LIMIT },
  ]);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds) },
      }
    );
  }

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error || !data.session) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  // Fetch role — treat missing profile as an error, not a silent default
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile) {
    console.error("Profile not found for authenticated user:", data.user.id);
    return NextResponse.json(
      { error: "Account configuration error. Please contact support." },
      { status: 500 }
    );
  }

  // Return only the access token — NOT the refresh token.
  // The refresh token is managed via Supabase's cookie-based auth.
  return NextResponse.json(
    {
      access_token: data.session.access_token,
      expires_at: data.session.expires_at,
      role: profile.role,
    },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}
