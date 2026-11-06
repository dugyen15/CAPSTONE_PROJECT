
"use client";

import Link from "next/link";

const features = [
  {
    number: "01",
    title: "Order Ahead",
    description:
      "Browse the cafe menu and place your order before arriving. Save time and enjoy a smoother ordering experience.",
  },
  {
    number: "02",
    title: "Book a Table",
    description:
      "Reserve a table in advance so you can enjoy your meal without worrying about finding a seat.",
  },
  {
    number: "03",
    title: "Track Your Queue",
    description:
      "Keep track of your queue position and order progress, making your cafe visit easier and more convenient.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-paper text-foreground">
      {/* Navigation */}
      <header className="absolute left-0 top-0 z-20 w-full">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-pine/20">
              <span className="font-display text-xl font-bold text-pine">
                C
              </span>
            </div>

            <div>
              <h1 className="font-display text-xl font-semibold text-pine">
                CST Cafe
              </h1>
              <p className="text-xs tracking-wider text-muted">
                A BETTER CAFE EXPERIENCE
              </p>
            </div>
          </Link>

          <div className="hidden items-center gap-8 text-sm font-medium text-foreground md:flex">
            <a href="#home" className="transition hover:text-amber">
              Home
            </a>
            <a href="#features" className="transition hover:text-amber">
              Features
            </a>
            <a href="#about" className="transition hover:text-amber">
              About
            </a>
            <Link href="/menu" className="transition hover:text-amber">
              Menu
            </Link>
          </div>

          <Link
            href="/login"
            className="rounded-full border border-pine px-5 py-2.5 text-sm font-semibold text-pine transition hover:bg-pine hover:text-paper"
          >
            Sign In
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section
        id="home"
        className="relative flex min-h-screen items-center overflow-hidden bg-gradient-to-br from-card via-paper to-amber/10 px-6 pb-16 pt-32"
      >
        <div className="pointer-events-none absolute -right-32 top-20 h-96 w-96 rounded-full bg-amber/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-pine/10 blur-3xl" />

        <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-16 lg:grid-cols-2">
          {/* Hero Content */}
          <div className="text-center lg:text-left">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber/30 bg-amber/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-amber">
              <span className="h-2 w-2 rounded-full bg-amber" />
              Welcome to CST Cafe
            </span>

            <h2 className="font-display text-5xl font-bold leading-tight text-pine sm:text-6xl lg:text-7xl">
              Your favourite cafe,
              <span className="block text-amber">
                made simpler.
              </span>
            </h2>

            <p className="mx-auto mt-7 max-w-xl text-base leading-8 text-muted sm:text-lg lg:mx-0">
              Order ahead, book a table, and skip the line. Enjoy a
              convenient cafe experience designed to make every visit
              easier.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
              <Link
                href="/signup"
                className="rounded-full bg-pine px-8 py-4 text-sm font-semibold text-paper shadow-lg shadow-pine/20 transition duration-300 hover:-translate-y-1 hover:bg-pine/90"
              >
                Get Started
              </Link>

              <Link
                href="/login"
                className="rounded-full border border-pine/30 bg-card px-8 py-4 text-sm font-semibold text-pine transition duration-300 hover:-translate-y-1 hover:border-pine"
              >
                Customer Login
              </Link>
            </div>

            <Link
              href="/menu"
              className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-amber"
            >
              Just browsing?
              <span className="font-semibold text-pine underline underline-offset-4">
                Explore our menu
              </span>
            </Link>
          </div>

          {/* Decorative Visual */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-5 rounded-[3rem] bg-amber/10 blur-2xl" />

            <div className="relative overflow-hidden rounded-[2.5rem] border border-border bg-card p-8 shadow-2xl shadow-pine/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted">
                  The CST Cafe experience
                </span>
                <span className="rounded-full bg-pine/10 px-3 py-1 text-xs font-semibold text-pine">
                  Simple. Convenient.
                </span>
              </div>

              <div className="my-10 flex items-center justify-center">
                <div className="flex h-56 w-56 items-center justify-center rounded-full border border-amber/30 bg-amber/10">
                  <div className="flex h-40 w-40 items-center justify-center rounded-full border border-amber/40 bg-amber/20">
                    <div className="h-20 w-20 rounded-full border-[12px] border-pine/70" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-paper p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber/10">
                      <div className="h-4 w-4 rounded-sm border-2 border-amber" />
                    </div>
                    <div>
                      <p className="font-semibold text-pine">
                        Order ahead
                      </p>
                      <p className="text-xs text-muted">
                        Place your order at your convenience.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-paper p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pine/10">
                      <div className="h-4 w-4 rounded-full border-2 border-pine" />
                    </div>
                    <div>
                      <p className="font-semibold text-pine">
                        Track your order
                      </p>
                      <p className="text-xs text-muted">
                        Stay updated on your order progress.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-5 -left-5 hidden rounded-2xl border border-border bg-card px-5 py-4 shadow-xl sm:block">
              <p className="text-sm font-semibold text-pine">
                A smoother cafe visit
              </p>
              <p className="mt-1 text-xs text-muted">
                Every order, made easier.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-amber">
              What you can do
            </span>

            <h2 className="mt-4 font-display text-4xl font-bold text-pine sm:text-5xl">
              Cafe visits, reimagined.
            </h2>

            <p className="mt-5 leading-7 text-muted">
              Everything you need for a more convenient and enjoyable
              cafe experience, all in one place.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.number}
                className="group rounded-3xl border border-border bg-card p-8 transition duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-pine/10"
              >
                <div className="mb-7 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber/30 bg-amber/10">
                    <span className="font-display text-lg font-semibold text-amber">
                      {feature.number}
                    </span>
                  </div>

                  <span className="text-sm font-medium tracking-widest text-muted">
                    CST CAFE
                  </span>
                </div>

                <h3 className="font-display text-2xl font-bold text-pine">
                  {feature.title}
                </h3>

                <p className="mt-4 text-sm leading-7 text-muted">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="bg-card px-6 py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-amber">
              About the project
            </span>

            <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-pine sm:text-5xl">
              A little more convenience in every visit.
            </h2>
          </div>

          <div className="space-y-5 text-base leading-8 text-muted">
            <p>
              CST Cafe is designed to improve the everyday cafe
              experience for students and visitors at the College of
              Science and Technology.
            </p>

            <p>
              Instead of spending extra time waiting just to place an
              order or find a table, customers can browse the menu,
              order ahead, reserve a table, and follow their queue
              progress through one convenient platform.
            </p>

            <p>
              Developed as a capstone project for the BE Software
              Engineering programme at CST, the platform aims to make
              campus cafe life simpler, smoother, and more accessible.
            </p>

            <Link
              href="/menu"
              className="inline-flex items-center gap-2 font-semibold text-pine transition hover:text-amber"
            >
              Explore the menu →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-pine px-6 py-10 text-paper">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
          <div>
            <h2 className="font-display text-2xl font-bold">
              CST Cafe
            </h2>
            <p className="mt-1 text-sm text-paper/70">
              A better cafe experience starts here.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-paper/80">
            <Link href="/" className="transition hover:text-amber">
              Home
            </Link>
            <Link href="/menu" className="transition hover:text-amber">
              Menu
            </Link>
            <Link href="/login" className="transition hover:text-amber">
              Customer Login
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-7xl border-t border-paper/20 pt-6 text-center text-xs text-paper/60">
          © {new Date().getFullYear()} CST Cafe. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
