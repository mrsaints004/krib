import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { checkRateLimit } from "@/lib/rateLimit";
import { validatePassword, validatePhone } from "@/lib/validation";

const AUTH_RATE_LIMIT = {
  prefix: "auth:register",
  maxRequests: 3,
  windowSeconds: 60,
} as const;

const registerSchema = z.object({
  email: z.string().email("Invalid email").max(254),
  password: z.string().min(1, "Password required").max(256, "Password too long"),
  fullName: z.string().min(1, "Name required").max(100),
  phone: z.string().min(1, "Phone required"),
  role: z.enum(["student", "landlord"]),
  university: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const rl = checkRateLimit(ip, AUTH_RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds) },
      }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { email, password, fullName, phone, role, university } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  // Server-side password validation
  const pwResult = validatePassword(password);
  if (!pwResult.valid) {
    return NextResponse.json({ error: pwResult.error }, { status: 400 });
  }

  // Server-side phone validation
  if (!validatePhone(phone)) {
    return NextResponse.json(
      { error: "Enter a valid Nigerian phone number." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: false,
    user_metadata: { full_name: fullName.trim(), phone, role, university },
  });

  if (error) {
    // Return generic error for all cases to prevent email enumeration.
    // Both "already exists" and other errors return the same response.
    console.error("Registration error:", error.message);
    return NextResponse.json(
      { error: "Registration failed. If you already have an account, try logging in." },
      { status: 400 }
    );
  }

  // Send verification email (without re-sending password)
  if (data.user) {
    const { error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
    });
    if (linkError) {
      console.error("Failed to send verification email:", linkError.message);
    }
  }

  return NextResponse.json({ success: true });
}
