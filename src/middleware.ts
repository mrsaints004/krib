import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Server-side middleware for route protection.
 * Uses @supabase/ssr for reliable cookie handling (no manual parsing).
 * Reads role from user_metadata in the JWT to avoid a DB query per request.
 * Enforces email verification — unconfirmed users are sent to /verify.
 */

const PUBLIC_ROUTES = ["/", "/login", "/register", "/auth/callback"];

const ROLE_PREFIXES: Record<string, string[]> = {
  student: ["/student"],
  landlord: ["/landlord"],
  admin: ["/admin"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes, API routes, static files
  if (
    PUBLIC_ROUTES.includes(pathname) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  // Read role from user_metadata (set at signup, avoids DB query)
  const role = (user.user_metadata?.role as string) ?? "student";

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
