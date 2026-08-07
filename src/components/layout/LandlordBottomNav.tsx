"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, User } from "lucide-react";

const TABS = [
  { href: "/landlord/listings", label: "Listings", Icon: Home },
  { href: "/landlord/messages", label: "Messages", Icon: MessageCircle },
  { href: "/landlord/profile", label: "Profile", Icon: User },
];

export function LandlordBottomNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-20 border-t border-ink-900/10 bg-paper-50/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="flex flex-1 flex-col items-center gap-1 py-2.5"
            >
              <Icon
                size={20}
                className={active ? "text-verified" : "text-ink-800/40"}
                strokeWidth={active ? 2.4 : 2}
              />
              <span
                className={`text-[10px] font-medium ${
                  active ? "text-verified-dark" : "text-ink-800/40"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)] bg-paper-50/95" />
    </nav>
  );
}
