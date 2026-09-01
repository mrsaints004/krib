"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

interface Profile {
  id: string;
  full_name: string;
  phone: string;
  role: "student" | "landlord" | "admin";
  matric_number: string | null;
  university: string | null;
  is_verified: boolean;
  is_premium: boolean;
  verified_properties_count: number;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  profileError: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  profileError: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = ["/", "/login", "/register"];

// Role-based home pages
function homeForRole(role: string): string {
  switch (role) {
    case "landlord":
      return "/landlord/listings";
    case "admin":
      return "/admin/verification-queue";
    default:
      return "/student/listings";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);

  async function fetchProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Failed to fetch profile:", error.message);
      setProfileError(true);
      return null;
    }

    setProfileError(false);
    return data as Profile | null;
  }

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    async function initAuth() {
      try {
        // Use getUser() instead of getSession() to validate JWT server-side.
        // Race against a timeout so the app doesn't hang forever if Supabase
        // is unreachable (e.g. placeholder credentials during development).
        const userResult = await Promise.race([
          supabase.auth.getUser(),
          new Promise<{ data: { user: null }; error: Error }>((resolve) =>
            setTimeout(
              () => resolve({ data: { user: null }, error: new Error("Auth timeout") }),
              5000
            )
          ),
        ]);

        const u = userResult.data.user;
        if (u) {
          setUser(u);
          const { data: { session: s } } = await supabase.auth.getSession();
          setSession(s);
          const p = await fetchProfile(u.id);
          setProfile(p);
        }
      } catch (err) {
        console.warn("Auth initialization failed — running in unauthenticated mode:", err);
      } finally {
        setLoading(false);
      }
    }

    initAuth();

    // Listen for auth changes (login, logout, token refresh)
    try {
      const {
        data: { subscription: sub },
      } = supabase.auth.onAuthStateChange(async (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          const p = await fetchProfile(s.user.id);
          setProfile(p);
        } else {
          setProfile(null);
        }
      });
      subscription = sub;
    } catch {
      // If Supabase is unreachable, skip the realtime listener
    }

    return () => subscription?.unsubscribe();
  }, []);

  // Route protection
  useEffect(() => {
    if (loading) return;

    const isPublic = PUBLIC_ROUTES.includes(pathname);
    const isAuthRoute = pathname === "/login" || pathname === "/register";
    const isVerifyRoute = pathname === "/verify";

    if (!user && !isPublic && !isVerifyRoute) {
      // Not logged in, trying to access protected route
      router.replace("/login");
    } else if (user && isAuthRoute && profile) {
      // Logged in, on login/register page — redirect to dashboard
      router.replace(homeForRole(profile.role));
    }
  }, [user, profile, loading, pathname, router]);

  async function refreshProfile() {
    if (user) {
      const p = await fetchProfile(user.id);
      setProfile(p);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    router.replace("/login");
  }

  // For public routes, render children immediately even while auth is loading.
  // This prevents the landing page, login, and register from being blocked
  // behind an auth check (especially when Supabase is unreachable).
  // Protected routes are guarded by middleware on the server side anyway.
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname) || pathname === "/verify";

  if (loading && !isPublicRoute) {
    return (
      <AuthContext.Provider value={{ user, profile, session, loading, profileError, signOut, refreshProfile }}>
        <div className="flex min-h-screen items-center justify-center bg-paper-50">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink-900/10 border-t-verified" />
        </div>
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, profileError, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
