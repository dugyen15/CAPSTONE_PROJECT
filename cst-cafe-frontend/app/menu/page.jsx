"use client";

import { useState } from "react";
import CustomerNav from "@/components/CustomerNav";
import { categories, menuItems, tables, timeSlots } from "@/lib/mock-data";

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState({}); // { [itemId]: qty }
  const [table, setTable] = useState(tables[0]?.id ?? null);
  const [time, setTime] = useState(timeSlots[0] ?? null);
  const [step, setStep] = useState("browsing"); // browsing | reviewing | confirmed
  const [placing, setPlacing] = useState(false);
  const [order, setOrder] = useState(null);

  const visibleItems =
    activeCategory === "All"
      ? menuItems
      : menuItems.filter((item) => item.category === activeCategory);

  const cartItems = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({ ...menuItems.find((m) => m.id === id), qty }));

  const total = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const itemCount = cartItems.reduce((sum, item) => sum + item.qty, 0);

  function addToCart(item) {
    if (!item.available) return;
    setCart((prev) => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
  }

  function removeFromCart(id) {
    setCart((prev) => {
      const nextQty = (prev[id] || 0) - 1;
      const next = { ...prev, [id]: nextQty };
      if (nextQty <= 0) delete next[id];
      return next;
    });
  }

  function handlePlaceOrder() {
    // In a real app: POST to the Express/Postgres API (see mock-data.js note, section 5.1)
    // e.g. const res = await fetch("/api/orders", { method: "POST", body: JSON.stringify(payload) })
    const newOrder = {
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      queueNumber: Math.floor(10 + Math.random() * 90),
      aheadInQueue: Math.floor(Math.random() * 4),
      status: "waiting",
      table: tables.find((t) => t.id === table)?.label ?? "—",
      time,
      items: cartItems.map(({ name, qty }) => ({ name, qty })),
      total,
    };
    setOrder(newOrder);
    setStep("confirmed");
    setPlacing(false);
  }

  function startNewOrder() {
    setCart({});
    setStep("browsing");
    setOrder(null);
    setActiveCategory("All");
  }

  // --- Confirmed state ---
  if (step === "confirmed" && order) {
    return (
      <>
        <CustomerNav />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-sm uppercase tracking-wide text-amber">
            Order placed
          </p>
          <h1 className="mt-2 font-display text-3xl text-pine">
            Order {order.id} confirmed
          </h1>
          <p className="mt-3 text-muted">
            Queue number {order.queueNumber} · {order.table} · {order.time}
          </p>
          <div className="mt-8 w-full rounded-2xl border border-border bg-card p-6 text-left">
            <ul className="space-y-2">
              {order.items.map((item) => (
                <li key={item.name} className="flex justify-between text-sm">
                  <span>
                    {item.qty} × {item.name}
                  </span>
                </li>
              ))}
            </ul>
            <div className="my-4 border-t border-border" />
            <div className="flex justify-between font-display text-lg text-pine">
              <span>Total</span>
              <span>Nu. {order.total}</span>
            </div>
          </div>
          <p className="mt-6 max-w-sm text-sm text-muted">
            Track your order status from the Orders tab.
          </p>
          <button
            onClick={startNewOrder}
            className="mt-8 rounded-full border border-border px-5 py-2 text-sm hover:border-pine/40"
          >
            Start a new order
          </button>
        </main>
      </>
    );
  }

  // --- Review state ---
  if (step === "reviewing") {
    return (
      <>
        <CustomerNav />
        <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
          <button
            onClick={() => setStep("browsing")}
            className="text-sm text-muted hover:text-pine"
          >
            ← Back to menu
          </button>

          <h1 className="mt-3 font-display text-3xl text-pine">
            Review your order
          </h1>

          <div className="mt-8 rounded-2xl border border-border bg-card p-6">
            <ul className="space-y-3">
              {cartItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted">Nu. {item.price} each</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-border hover:border-pine/40"
                    >
                      −
                    </button>
                    <span className="w-4 text-center text-sm">{item.qty}</span>
                    <button
                      onClick={() => addToCart(item)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-border hover:border-pine/40"
                    >
                      +
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="my-4 border-t border-border" />
            <div className="flex justify-between font-display text-lg text-pine">
              <span>Total</span>
              <span>Nu. {total}</span>
            </div>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="mb-3 text-sm font-medium text-foreground">Table</h2>
              <div className="flex flex-wrap gap-2">
                {tables.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTable(t.id)}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      table === t.id
                        ? "border-pine bg-pine text-paper"
                        : "border-border hover:border-pine/40"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h2 className="mb-3 text-sm font-medium text-foreground">
                Pickup time
              </h2>
              <div className="flex flex-wrap gap-2">
                {timeSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setTime(slot)}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      time === slot
                        ? "border-pine bg-pine text-paper"
                        : "border-border hover:border-pine/40"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => setPlacing(true)}
            disabled={itemCount === 0 || !table || !time}
            className="mt-10 w-full rounded-full bg-amber py-3 text-paper transition-colors hover:bg-amber-light disabled:cursor-not-allowed disabled:opacity-40"
          >
            Place order · Nu. {total}
          </button>

          {placing && (
            <div className="mt-4 rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-medium text-foreground">
                Confirm your order?
              </p>
              <p className="mt-1 text-sm text-muted">
                {itemCount} {itemCount === 1 ? "item" : "items"} for Nu. {total}
                , pickup at {time}. This can&apos;t be changed after placing.
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handlePlaceOrder}
                  className="rounded-full bg-pine px-4 py-1.5 text-sm text-paper hover:bg-pine/90"
                >
                  Yes, place order
                </button>
                <button
                  onClick={() => setPlacing(false)}
                  className="rounded-full border border-border px-4 py-1.5 text-sm hover:border-pine/40"
                >
                  Go back
                </button>
              </div>
            </div>
          )}
        </main>
      </>
    );
  }

  // --- Browsing state ---
  return (
    <>
      <CustomerNav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10 pb-28">
        <h1 className="font-display text-3xl text-pine">Menu</h1>
        <p className="mt-2 text-muted">
          Add items to your cart, then review and confirm your order.
        </p>

        {/* Category filter */}
        <div className="mt-6 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full border px-4 py-1.5 text-sm ${
                activeCategory === cat
                  ? "border-pine bg-pine text-paper"
                  : "border-border hover:border-pine/40"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          {visibleItems.map((item) => {
            const qty = cart[item.id] || 0;
            return (
              <div
                key={item.id}
                className={`rounded-xl border border-border bg-card p-4 ${
                  !item.available ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{item.name}</p>
                      {!item.available && (
                        <span className="rounded-full bg-border px-2 py-0.5 text-xs text-muted">
                          Sold out
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {item.description}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Nu. {item.price} · {item.prepTime}
                    </p>
                  </div>

                  {item.available &&
                    (qty === 0 ? (
                      <button
                        onClick={() => addToCart(item)}
                        className="shrink-0 rounded-full border border-pine px-4 py-1.5 text-sm text-pine hover:bg-pine/5"
                      >
                        Add
                      </button>
                    ) : (
                      <div className="flex shrink-0 items-center gap-3">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-border hover:border-pine/40"
                        >
                          −
                        </button>
                        <span className="w-4 text-center text-sm">{qty}</span>
                        <button
                          onClick={() => addToCart(item)}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-border hover:border-pine/40"
                        >
                          +
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>

        {itemCount > 0 && (
          <div className="fixed inset-x-0 bottom-0 border-t border-border bg-paper px-6 py-4">
            <div className="mx-auto flex w-full max-w-2xl items-center justify-between">
              <p className="text-sm text-muted">
                {itemCount} {itemCount === 1 ? "item" : "items"} · Nu. {total}
              </p>
              <button
                onClick={() => setStep("reviewing")}
                className="rounded-full bg-amber px-6 py-2.5 text-sm text-paper hover:bg-amber-light"
              >
                Review order
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}