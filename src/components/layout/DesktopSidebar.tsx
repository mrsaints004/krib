"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Calendar,
  Wrench,
  User,
  MessageCircle,
  LogOut,
  ShieldCheck,
  Plus,
} from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";

const STUDENT_LINKS = [
  { href: "/student/listings", label: "Browse", Icon: Home },
  { href: "/student/messages", label: "Messages", Icon: MessageCircle },
  { href: "/student/bookings", label: "Bookings", Icon: Calendar },
  { href: "/student/maintenance", label: "Maintenance", Icon: Wrench },
  { href: "/student/profile", label: "Profile", Icon: User },
];

const LANDLORD_LINKS = [
  { href: "/landlord/listings", label: "Listings", Icon: Home },
  { href: "/landlord/messages", label: "Messages", Icon: MessageCircle },
  { href: "/landlord/profile", label: "Profile", Icon: User },
];

const ADMIN_LINKS = [
  { href: "/admin/verification-queue", label: "Verification Queue", Icon: ShieldCheck },
];

export function DesktopSidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  const role = profile?.role ?? "student";
  const links =
    role === "admin"
      ? ADMIN_LINKS
      : role === "landlord"
      ? LANDLORD_LINKS
      : STUDENT_LINKS;

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:border-ink-900/10 md:bg-paper-50">
      <div className="flex h-full flex-col px-4 py-6">
        {/* Logo */}
        <Link href="/" className="px-3">
          <span className="font-display text-xl italic text-ink-950">
            UniNest
          </span>
        </Link>

        {/* Nav links */}
        <nav aria-label="Main navigation" className="mt-8 flex flex-1 flex-col gap-1">
          {links.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-verified-light text-verified-dark"
                    : "text-ink-800 hover:bg-ink-900/5 hover:text-ink-950"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.4 : 2} />
                {label}
              </Link>
            );
          })}

          {role === "landlord" && (
            <Link
              href="/landlord/listings/new"
              className="mt-3 flex items-center gap-2 rounded-md bg-verified px-3 py-2.5 text-sm font-medium text-paper-50 hover:bg-verified-dark"
            >
              <Plus size={16} />
              Add listing
            </Link>
          )}
        </nav>

        {/* User info + sign out */}
        <div className="border-t border-ink-900/10 pt-4">
          <div className="px-3">
            <p className="truncate text-sm font-medium text-ink-950">
              {profile?.full_name ?? "User"}
            </p>
            <p className="truncate text-xs text-ink-800/60 capitalize">
              {role}
            </p>
          </div>
          <button
            onClick={signOut}
            className="mt-3 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-ink-800/60 hover:bg-ink-900/5 hover:text-signal"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
