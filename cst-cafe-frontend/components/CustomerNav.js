"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NotificationBell from "@/components/NotificationBell";
const links = [
  { href: "/", label: "Menu" },
  { href: "/booking", label: "Book a table" },
  { href: "/orders", label: "My order" },
  { href: "/feedback", label: "Feedback" },
];

export default function CustomerNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-paper">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-xl text-pine">
          CST Cafe
        </Link>
        <nav className="flex gap-1">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
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
        <div className="flex items-center gap-4">
          <NotificationBell />
          <Link
            href="/login"
            className="text-sm text-foreground/70 hover:text-foreground"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-pine px-4 py-1.5 text-sm text-paper transition-colors hover:opacity-90"
          >
            Sign up
          </Link>
          <Link
            href="/staff"
            className="text-sm text-muted hover:text-foreground"
          >
            Staff login
          </Link>
        </div>
      </div>
    </header>
  );
}