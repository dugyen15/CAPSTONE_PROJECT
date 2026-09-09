"use client";

import { useState } from "react";
import CustomerNav from "@/components/CustomerNav";
import CafeHeroScene from "../../components/CafeHeroScene";
import { categories, menuItems } from "@/lib/mock-data";

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState("All");

  const visibleItems =
    activeCategory === "All"
      ? menuItems
      : menuItems.filter((item) => item.category === activeCategory);

  return (
    <>
      <CustomerNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <section className="relative mb-10 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-paper to-amber/10 px-6 py-14 text-center sm:px-10">
          <CafeHeroScene className="pointer-events-none absolute inset-0 h-full w-full" />
          <div className="relative z-10 mx-auto max-w-lg">
            <p className="text-sm uppercase tracking-[0.2em] text-amber">
              Welcome to
            </p>
            <h1 className="mt-2 font-display text-5xl leading-tight text-pine sm:text-6xl">
              CST Cafe
            </h1>
            <p className="mt-4 text-muted">
              Order ahead. Skip the line. Browse today&apos;s menu, book a
              table, and place your order before you even leave class.
            </p>
          </div>
        </section>

        <div className="mb-6 flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                activeCategory === cat
                  ? "border-pine bg-pine text-paper"
                  : "border-border text-foreground/70 hover:border-pine/40"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {visibleItems.map((item) => (
            <div
              key={item.id}
              className={`flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card ${
                !item.available ? "opacity-50" : ""
              }`}
            >
              <img
                src={item.image}
                alt={item.name}
                loading="lazy"
                className="h-40 w-full object-cover"
              />
              <div className="flex flex-1 flex-col justify-between p-5">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-lg text-foreground">
                      {item.name}
                    </h3>
                    <span className="whitespace-nowrap font-display text-lg text-pine">
                      Nu. {item.price}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{item.description}</p>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted">~{item.prepTime}</span>
                  {item.available ? (
                    <button className="rounded-full bg-amber px-4 py-1.5 text-sm text-paper hover:bg-amber-light">
                      Add to order
                    </button>
                  ) : (
                    <span className="text-delayed">Sold out</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}