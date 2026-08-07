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
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
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

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    return data as Profile | null;
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const p = await fetchProfile(s.user.id);
        setProfile(p);
      }
      setLoading(false);
    });

    // Listen for auth changes (login, logout, token refresh)
    const {
      data: { subscription },
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

    return () => subscription.unsubscribe();
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

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
