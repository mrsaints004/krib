"use client";

import { usePathname } from "next/navigation";
import { DesktopSidebar } from "./DesktopSidebar";
import { BottomNav } from "./BottomNav";
import { LandlordBottomNav } from "./LandlordBottomNav";
import { useAuth } from "@/lib/AuthProvider";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const role = profile?.role ?? "student";

  const isLandlord = pathname.startsWith("/landlord") || role === "landlord";
  const isAdmin = pathname.startsWith("/admin") || role === "admin";

  return (
    <div className="flex min-h-screen">
      <DesktopSidebar />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl">
          {children}
        </div>
        {/* Mobile bottom nav — hidden on desktop (sidebar takes over) */}
        {!isAdmin && (
          <div className="md:hidden">
            {isLandlord ? <LandlordBottomNav /> : <BottomNav />}
          </div>
        )}
      </main>
    </div>
  );
}
