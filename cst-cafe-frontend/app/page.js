"use client";

import Link from "next/link";
import CafeHeroScene from "../components/CafeHeroScene";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-card via-paper to-amber/10 px-6 text-center">
      <CafeHeroScene className="pointer-events-none absolute inset-0 h-full w-full" />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <p className="text-sm uppercase tracking-[0.2em] text-amber">
          Welcome to
        </p>
        <h1 className="mt-2 font-display text-5xl leading-tight text-pine sm:text-6xl">
          CST Cafe
        </h1>
        <p className="mt-4 text-muted">
          Order ahead, book a table, and skip the line. Log in or create an
          account to get started.
        </p>

        <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="rounded-full border border-pine px-6 py-2.5 text-sm font-medium text-pine hover:bg-pine/5 transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-pine px-6 py-2.5 text-sm font-medium text-paper hover:bg-pine/90 transition-colors"
          >
            Sign up
          </Link>
        </div>

        <Link
          href="/menu"
          className="mt-6 text-sm text-muted hover:text-foreground hover:underline"
        >
          Just browsing? View the menu
        </Link>

        <Link
          href="/staff/login"
          className="mt-10 text-xs text-muted/70 hover:text-foreground"
        >
          Staff portal
        </Link>
      </div>
    </main>
  );
}