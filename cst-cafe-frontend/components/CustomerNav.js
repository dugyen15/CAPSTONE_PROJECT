"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NotificationBell from "@/components/NotificationBell";
import ProfileMenu from "@/components/ProfileMenu";
import SettingsMenu from "@/components/SettingsMenu";
import { useSession } from "@/lib/useSession";

const links = [
  { href: "/menu", label: "Menu" },
  { href: "/booking", label: "Book a table" },
  { href: "/orders", label: "My order" },
  { href: "/feedback", label: "Feedback" },
];

export default function CustomerNav() {
  const pathname = usePathname();
  // Guests may browse, so this does not force a login redirect.
  const { user, loading } = useSession("customer", false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-paper">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-y-2 px-4 py-3 sm:px-6 sm:py-4">
        
        <Link href="/menu" className="font-display text-xl text-pine">
          CST Cafe
        </Link>

        <nav className="order-last flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
          {links.map((link) => {
            const active = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-pine text-paper"
                    : "text-foreground/70 hover:bg-card"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <NotificationBell />
              <ProfileMenu user={user} profileHref="/profile" />
            </>
          ) : (
            !loading && (
              <Link
                href="/login"
                className="rounded-full bg-pine px-4 py-1.5 text-sm text-paper hover:bg-pine/90"
              >
                Log in
              </Link>
            )
          )}
          <SettingsMenu logoutHref="/" role="customer" />
        </div>

      </div>
    </header>
  );
}