
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CustomerNav from "@/components/CustomerNav";
import { api, getToken, imageSrc } from "@/lib/api";
import { useOrder } from "@/lib/OrderContext";

export default function MenuPage() {
  const router = useRouter();
  const { startCheckout } = useOrder();

  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState(["All"]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [quantities, setQuantities] = useState({});

  // Fetch menu items and categories from the backend.
  useEffect(() => {
    let cancelled = false;

    async function loadMenu() {
      setLoading(true);
      setLoadError("");

      try {
        const [items, cats] = await Promise.all([
          api("/menu"),
          api("/menu/categories"),
        ]);

        if (cancelled) return;

        setMenuItems(Array.isArray(items) ? items : []);

        setCategories([
          "All",
          ...(Array.isArray(cats) ? cats.map((c) => c.name) : []),
        ]);
      } catch (err) {
        if (!cancelled) {
          console.error("Menu loading error:", err);
          setLoadError(err.message || "Unable to load the menu.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMenu();

    return () => {
      cancelled = true;
    };
  }, []);

  // Filter menu items by selected category.
  const visibleItems =
    activeCategory === "All"
      ? menuItems
      : menuItems.filter(
          (item) => item.category === activeCategory
        );

  // Add an item to the order.
  function addItem(id) {
    setQuantities((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
  }

  // Increase item quantity.
  function incrementItem(id) {
    setQuantities((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
  }

  // Decrease item quantity.
  function decrementItem(id) {
    setQuantities((prev) => {
      const current = prev[id] || 0;

      if (current <= 1) {
        const { [id]: removed, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [id]: current - 1,
      };
    });
  }

  // Calculate total quantity.
  const totalCount = Object.values(quantities).reduce(
    (sum, quantity) => sum + quantity,
    0
  );

  // Calculate subtotal.
  const subtotal = Object.entries(quantities).reduce(
    (sum, [id, quantity]) => {
      const item = menuItems.find(
        (menuItem) => String(menuItem.id) === String(id)
      );

      return sum + (item ? Number(item.price) * quantity : 0);
    },
    0
  );

  // Confirm order and proceed to checkout.
  function handleConfirmOrder() {
    const orderedItems = Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([id, quantity]) => {
        const item = menuItems.find(
          (menuItem) => String(menuItem.id) === String(id)
        );

        return {
          id: item.id,
          name: item.name,
          price: Number(item.price),
          qty: quantity,
        };
      });

    if (orderedItems.length === 0) return;

    startCheckout(orderedItems);

    router.push(
      getToken("customer") ? "/orders" : "/login"
    );
  }

  return (
    <>
      <CustomerNav />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 pb-28">

        {/* Page Heading */}
        <section className="mb-10 text-center">
          <h1 className="font-display text-4xl font-bold uppercase tracking-wide text-pine sm:text-5xl">
            Welcome to CST Cafe
          </h1>
        </section>

        {/* Loading */}
        {loading && (
          <p className="text-center text-sm text-muted">
            Loading the menu...
          </p>
        )}

        {/* Error Message */}
        {loadError && (
          <div className="mb-6 rounded-lg border border-delayed/20 bg-delayed/10 px-4 py-3 text-center text-sm text-delayed">
            {loadError}

            <button
              onClick={() => window.location.reload()}
              className="ml-2 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Categories */}
        {!loading && !loadError && (
          <div className="mb-6 flex flex-wrap gap-2">
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
        )}

        {/* Menu Items */}
        {!loading && !loadError && (
          <>
            {visibleItems.length === 0 ? (
              <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
                <h2 className="font-display text-xl text-pine">
                  No menu items available
                </h2>

                <p className="mt-2 text-sm text-muted">
                  There are currently no items in this category.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {visibleItems.map((item) => {
                  const qty = quantities[item.id] || 0;

                  return (
                    <div
                      key={item.id}
                      className={`flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card ${
                        !item.available ? "opacity-50" : ""
                      }`}
                    >
                      {/* Menu Image */}
                      {item.image ? (
                        <img
                          src={imageSrc(item.image)}
                          alt={item.name}
                          loading="lazy"
                          className="h-40 w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="flex h-24 w-full items-center justify-center bg-pine/5 font-display text-3xl text-pine/40">
                          {item.name?.charAt(0) || "C"}
                        </div>
                      )}

                      {/* Menu Details */}
                      <div className="flex flex-1 flex-col justify-between p-5">
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-display text-lg text-foreground">
                              {item.name}
                            </h3>

                            <span className="whitespace-nowrap font-display text-lg text-pine">
                              Nu. {Number(item.price).toFixed(2)}
                            </span>
                          </div>

                          <p className="mt-1 text-sm text-muted">
                            {item.description || ""}
                          </p>
                        </div>

                        {/* Item Controls */}
                        <div className="mt-4 flex items-center justify-between text-sm">
                          <span className="text-muted">
                            {item.prepTime
                              ? `~${item.prepTime}`
                              : ""}
                          </span>

                          {item.available ? (
                            qty > 0 ? (
                              <div className="flex items-center gap-3 rounded-full border border-pine/30 bg-pine/5 px-1.5 py-1">
                                <button
                                  onClick={() => decrementItem(item.id)}
                                  aria-label={`Remove one ${item.name}`}
                                  className="flex h-6 w-6 items-center justify-center rounded-full text-pine transition-colors hover:bg-pine/10"
                                >
                                  −
                                </button>

                                <span className="w-4 text-center text-sm font-medium text-pine">
                                  {qty}
                                </span>

                                <button
                                  onClick={() => incrementItem(item.id)}
                                  aria-label={`Add one more ${item.name}`}
                                  className="flex h-6 w-6 items-center justify-center rounded-full text-pine transition-colors hover:bg-pine/10"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addItem(item.id)}
                                className="rounded-full bg-amber px-4 py-1.5 text-sm text-paper hover:bg-amber-light"
                              >
                                Add to order
                              </button>
                            )
                          ) : (
                            <span className="text-delayed">
                              Sold out
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* Order Summary */}
      {totalCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
            <p className="text-sm text-foreground">
              {totalCount} {totalCount === 1 ? "item" : "items"} ·{" "}
              <span className="font-medium text-pine">
                Nu. {subtotal.toFixed(2)}
              </span>
            </p>

            <button
              onClick={handleConfirmOrder}
              className="rounded-full bg-pine px-6 py-2 text-sm text-paper transition-colors hover:bg-pine/90"
            >
              Confirm order
            </button>
          </div>
        </div>
      )}
    </>
  );
}
