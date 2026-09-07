"use client";

import { useState } from "react";
import CustomerNav from "@/components/CustomerNav";
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
        <section className="mb-10">
          <p className="text-sm uppercase tracking-wide text-amber">
            CST Cafe
          </p>
          <h1 className="mt-2 max-w-lg font-display text-4xl leading-tight text-pine">
            Order ahead. Skip the line.
          </h1>
          <p className="mt-3 max-w-md text-muted">
            Browse today&apos;s menu, book a table, and place your order before
            you even leave class.
          </p>
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
              className={`flex flex-col justify-between rounded-2xl border border-border bg-card p-5 ${
                !item.available ? "opacity-50" : ""
              }`}
            >
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
          ))}
        </div>
      </main>
    </>
  );
}
