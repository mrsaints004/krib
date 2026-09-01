import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Server-side middleware for route protection.
 * Uses @supabase/ssr for reliable cookie handling (no manual parsing).
 * DB-verifies role for ALL protected routes to prevent JWT spoofing.
 * Enforces email verification — unconfirmed users are sent to /verify.
 */

const PUBLIC_ROUTES = ["/", "/login", "/register", "/auth/callback"];

const ROLE_PREFIXES: Record<string, string[]> = {
  student: ["/student"],
  landlord: ["/landlord"],
  admin: ["/admin"],
};

// Known static file extensions to bypass (instead of overly broad dot-file check)
const STATIC_EXTENSIONS = new Set([
  ".css", ".js", ".map", ".json", ".ico", ".png", ".jpg", ".jpeg",
  ".gif", ".svg", ".webp", ".woff", ".woff2", ".ttf", ".eot",
]);

function hasStaticExtension(pathname: string): boolean {
  const lastDot = pathname.lastIndexOf(".");
  if (lastDot < 0) return false;
  return STATIC_EXTENSIONS.has(pathname.slice(lastDot).toLowerCase());
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes, API routes, static files
  if (
    PUBLIC_ROUTES.includes(pathname) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    hasStaticExtension(pathname)
  ) {
    return NextResponse.next();
  }

  // Create a response we can modify (for cookie refresh)
  let response = NextResponse.next({
    request: { headers: req.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Apply cookies to the request (for downstream server components)
          cookiesToSet.forEach(({ name, value }) =>
            req.cookies.set(name, value)
          );
          // Re-create response with updated request headers
          response = NextResponse.next({
            request: { headers: req.headers },
          });
          // Apply cookies to the response (for the browser)
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Race getUser() against a timeout so the middleware doesn't hang forever
  // when Supabase is unreachable (e.g. placeholder credentials during dev).
  let user = null;
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<{ data: { user: null }; error: Error }>((resolve) =>
        setTimeout(
          () => resolve({ data: { user: null }, error: new Error("Auth timeout") }),
          5000
        )
      ),
    ]);
    user = result.data.user;
  } catch {
    // Supabase unreachable — treat as unauthenticated
  }

  // If no user, redirect to login for protected routes
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // /verify is accessible to any authenticated user
  if (pathname === "/verify") {
    return response;
  }

  // Enforce email verification — redirect unconfirmed users
  if (!user.email_confirmed_at && pathname !== "/verify") {
    return NextResponse.redirect(new URL("/verify", req.url));
  }

  // DB-verify role for ALL protected routes (not just admin) to prevent
  // JWT metadata spoofing. One DB query per page navigation.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // If profile lookup fails, redirect to verify page instead of
  // granting default access. This prevents access on DB errors.
  if (!profile?.role) {
    return NextResponse.redirect(new URL("/verify", req.url));
  }
  const role = profile.role;

  // Check if the user is accessing a route they're allowed to access
  for (const [allowedRole, prefixes] of Object.entries(ROLE_PREFIXES)) {
    for (const prefix of prefixes) {
      if (pathname.startsWith(prefix) && role !== allowedRole) {
        const homeUrl =
          role === "landlord"
            ? "/landlord/listings"
            : role === "admin"
              ? "/admin/verification-queue"
              : "/student/listings";
        return NextResponse.redirect(new URL(homeUrl, req.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
