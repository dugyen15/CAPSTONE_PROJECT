"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CustomerNav from "@/components/CustomerNav";
import { api } from "@/lib/api";
import { useSession } from "@/lib/useSession";
import { useOrder } from "@/lib/OrderContext";
import { statusStyles } from "@/lib/status";
import { formatTime } from "@/lib/format";

const steps = ["waiting", "preparing", "ready"];

function PageShell({ children, narrow = false }) {
  return (
    <>
      <CustomerNav />
      <main
        className={`mx-auto w-full flex-1 px-6 py-10 ${
          narrow ? "max-w-md" : "max-w-2xl"
        }`}
      >
        {children}
      </main>
    </>
  );
}

export default function OrdersPage() {
  const { user, loading: sessionLoading } = useSession("customer");
  const { cartItems, clearCart } = useOrder();

  const [takeawayFee, setTakeawayFee] = useState(0);
  const [order, setOrder] = useState(null); // the placed order, from the database
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  // Checkout (before the order is placed)
  const [items, setItems] = useState(cartItems);
  const [orderType, setOrderType] = useState("dine-in");
  const [tables, setTables] = useState([]);
  const [bookedTable, setBookedTable] = useState(null);
  const [tableId, setTableId] = useState("");
  const [placing, setPlacing] = useState(false);

  // After the order is placed
  const [confirmingPickup, setConfirmingPickup] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [busy, setBusy] = useState(false);

  const checkingOut = !order && items.length > 0;

  // Load the fee, and the customer's current order if they are not mid-checkout
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    api("/settings")
      .then((s) => {
        if (!cancelled) setTakeawayFee(s.takeawayFee);
      })
      .catch(() => {});

    if (cartItems.length > 0) {
      setLoaded(true);
    } else {
      api("/orders?scope=active", { role: "customer" })
        .then((list) => {
          if (!cancelled) setOrder(list[0] || null);
        })
        .catch((err) => {
          if (!cancelled) setError(err.message);
        })
        .finally(() => {
          if (!cancelled) setLoaded(true);
        });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Dine-in needs a table: find free tables, and any table this customer has booked right now
  useEffect(() => {
    if (!checkingOut || orderType !== "dine-in") return;
    let cancelled = false;

    const now = new Date();
    Promise.all([
      api(`/tables?time=${encodeURIComponent(now.toISOString())}&duration=60`),
      api("/bookings", { role: "customer" }),
    ])
      .then(([tableList, bookings]) => {
        if (cancelled) return;
        setTables(tableList.filter((t) => t.available));
        const mine = bookings.find(
          (b) =>
            (b.status === "booked" || b.status === "seated") &&
            now >= new Date(new Date(b.time).getTime() - 30 * 60000) &&
            now <= new Date(b.endTime)
        );
        setBookedTable(mine ? mine.tableLabel : null);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [checkingOut, orderType]);

  // Keep the status fresh while the order is being made
  const orderId = order?.id;
  const orderStatus = order?.status;
  const finished = orderStatus === "completed" || orderStatus === "cancelled";
  useEffect(() => {
    if (!orderId || finished) return;
    let cancelled = false;
    const timer = setInterval(() => {
      api(`/orders/${orderId}`, { role: "customer" })
        .then((fresh) => {
          if (!cancelled) setOrder(fresh);
        })
        .catch(() => {});
    }, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [orderId, finished]);

  function removeItem(id) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const fee = orderType === "takeaway" ? takeawayFee : 0;

  async function placeOrder() {
    setError("");
    setPlacing(true);
    try {
      const body = {
        orderType,
        items: items.map((i) => ({ menuItemId: i.id, quantity: i.qty })),
      };
      if (orderType === "dine-in" && tableId) body.tableId = Number(tableId);
      const placed = await api("/orders", { method: "POST", role: "customer", body });
      setOrder(placed);
      setItems([]);
      clearCart();
    } catch (err) {
      setError(err.message);
    } finally {
      setPlacing(false);
    }
  }

  async function confirmPickup() {
    setError("");
    setBusy(true);
    try {
      const done = await api(`/orders/${order.id}/pickup`, { method: "POST", role: "customer" });
      setOrder(done);
      setConfirmingPickup(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function cancelOrder() {
    setError("");
    setBusy(true);
    try {
      const done = await api(`/orders/${order.id}/cancel`, { method: "POST", role: "customer" });
      setOrder(done);
      setCancelling(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (sessionLoading || !user || !loaded) {
    return (
      <PageShell>
        <p className="text-sm text-muted">Loading your order...</p>
      </PageShell>
    );
  }

  // ------------------------------------------------------------------
  // CHECKOUT: items chosen on the menu, order not placed yet
  // ------------------------------------------------------------------
  if (checkingOut) {
    const needsTable = orderType === "dine-in" && !tableId && !bookedTable;

    return (
      <PageShell>
        <h1 className="font-display text-3xl text-pine">Review your order</h1>
        <p className="mt-2 text-muted">
          Choose dine in or takeaway, then place your order.
        </p>

        <div className="mt-8">
          <p className="mb-2 text-sm text-muted">Dine in or takeaway?</p>
          <div className="flex gap-2">
            {["dine-in", "takeaway"].map((type) => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`flex-1 rounded-full border px-4 py-1.5 text-sm transition-colors ${
                  orderType === type
                    ? "border-pine bg-pine text-paper"
                    : "border-border text-foreground/70 hover:border-pine/40"
                }`}
              >
                {type === "dine-in" ? "Dine in" : `Takeaway (+Nu. ${takeawayFee})`}
              </button>
            ))}
          </div>

          {orderType === "dine-in" && (
            <div className="mt-4">
              <label htmlFor="table" className="mb-1 block text-sm text-muted">
                Your table
              </label>
              <select
                id="table"
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                className="w-full rounded-lg border border-border bg-paper px-3 py-2 text-sm text-foreground"
              >
                <option value="">
                  {bookedTable ? `My booked table (${bookedTable})` : "Choose a table"}
                </option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} · seats {t.capacity}
                  </option>
                ))}
              </select>
              {tables.length === 0 && !bookedTable && (
                <p className="mt-2 text-xs text-muted">
                  No free tables right now. You can switch to takeaway.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between text-sm">
                <span>
                  {item.qty} × {item.name}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-muted">Nu. {item.price * item.qty}</span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-xs text-delayed hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="my-4 border-t border-border" />

          <div className="flex justify-between text-sm text-muted">
            <span>Subtotal</span>
            <span className="text-foreground">Nu. {subtotal}</span>
          </div>
          {orderType === "takeaway" && (
            <div className="mt-1 flex justify-between text-sm text-muted">
              <span>Takeaway fee</span>
              <span className="text-foreground">Nu. {fee}</span>
            </div>
          )}

          <div className="my-4 border-t border-border" />

          <div className="flex justify-between font-display text-lg text-pine">
            <span>Total</span>
            <span>Nu. {subtotal + fee}</span>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-delayed/20 bg-delayed/10 px-3 py-2 text-sm text-delayed">
            {error}
          </p>
        )}

        <button
          onClick={placeOrder}
          disabled={placing || needsTable}
          className="mt-6 w-full rounded-full bg-amber py-3 text-paper transition-colors hover:bg-amber-light disabled:cursor-not-allowed disabled:opacity-40"
        >
          {placing ? "Placing order..." : "Place order"}
        </button>
        {needsTable && (
          <p className="mt-2 text-center text-xs text-muted">
            Choose a table, or switch to takeaway.
          </p>
        )}
      </PageShell>
    );
  }

  // ------------------------------------------------------------------
  // NO ORDER
  // ------------------------------------------------------------------
  if (!order) {
    return (
      <PageShell narrow>
        <div className="py-10 text-center">
          <h1 className="font-display text-3xl text-pine">No active order</h1>
          <p className="mt-3 text-sm text-muted">
            You don&apos;t have an order in the queue right now.
          </p>
          <Link
            href="/menu"
            className="mt-6 inline-block rounded-full bg-pine px-6 py-2 text-sm text-paper hover:bg-pine/90"
          >
            Browse the menu
          </Link>
          {error && <p className="mt-4 text-sm text-delayed">{error}</p>}
        </div>
      </PageShell>
    );
  }

  // ------------------------------------------------------------------
  // ORDER FINISHED
  // ------------------------------------------------------------------
  if (order.status === "cancelled") {
    return (
      <PageShell narrow>
        <div className="py-10 text-center">
          <p className="text-sm uppercase tracking-wide text-amber">Order {order.id}</p>
          <h1 className="mt-2 font-display text-3xl text-pine">Order cancelled</h1>
          <p className="mt-3 text-sm text-muted">This order has been cancelled.</p>
          <Link
            href="/menu"
            className="mt-6 inline-block rounded-full bg-pine px-6 py-2 text-sm text-paper hover:bg-pine/90"
          >
            Back to the menu
          </Link>
        </div>
      </PageShell>
    );
  }

  if (order.status === "completed") {
    return (
      <PageShell narrow>
        <div className="flex flex-col items-center py-6 text-center">
          <p className="text-sm uppercase tracking-wide text-amber">Order {order.id}</p>
          <h1 className="mt-2 font-display text-3xl text-pine">Enjoy your meal!</h1>
          <p className="mt-3 max-w-sm text-sm text-muted">
            {order.orderType === "takeaway"
              ? "Takeaway order confirmed. Thanks for ordering with us."
              : `Pickup confirmed for queue number ${order.queueNumber}. Thanks for ordering with us.`}
          </p>

          <div className="mt-8 w-full rounded-2xl border border-border bg-card p-6 text-left">
            <ul className="space-y-2">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.qty} × {item.name}
                  </span>
                  <span className="text-muted">Nu. {item.price * item.qty}</span>
                </li>
              ))}
            </ul>
            <div className="my-4 border-t border-border" />
            <div className="flex justify-between text-sm text-muted">
              <span>Subtotal</span>
              <span className="text-foreground">Nu. {order.subtotal}</span>
            </div>
            {order.takeawayFee > 0 && (
              <div className="mt-1 flex justify-between text-sm text-muted">
                <span>Takeaway fee</span>
                <span className="text-foreground">Nu. {order.takeawayFee}</span>
              </div>
            )}
            <div className="my-4 border-t border-border" />
            <div className="flex justify-between font-display text-lg text-pine">
              <span>Total</span>
              <span>Nu. {order.total}</span>
            </div>
          </div>

          <Link
            href="/feedback"
            className="mt-6 text-sm text-muted hover:text-foreground hover:underline"
          >
            Have feedback about your order? Let us know
          </Link>
        </div>
      </PageShell>
    );
  }

  // ------------------------------------------------------------------
  // ORDER IN PROGRESS: live status
  // ------------------------------------------------------------------
  const currentStepIndex = steps.indexOf(order.rawStatus);
  const status = statusStyles[order.status] || statusStyles.waiting;
  const isReady = order.status === "ready";

  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-amber">Order {order.id}</p>
          <h1 className="mt-1 font-display text-3xl text-pine">
            Queue number {order.queueNumber}
          </h1>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${status.className}`}>
          {status.label}
        </span>
      </div>

      <p className="mt-3 text-muted">
        {order.status === "delayed"
          ? "Your order is slightly delayed. We'll notify you the moment it's ready."
          : isReady
          ? "Your order is ready for pickup!"
          : `${order.aheadInQueue} ${order.aheadInQueue === 1 ? "order" : "orders"} ahead of you.`}
      </p>

      <div className="mt-10 flex items-center">
        {steps.map((step, i) => (
          <div key={step} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm ${
                  i <= currentStepIndex ? "bg-pine text-paper" : "bg-card text-muted"
                }`}
              >
                {i + 1}
              </div>
              <p className="mt-2 w-20 text-center text-xs capitalize text-muted">{step}</p>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`mx-2 h-0.5 flex-1 ${
                  i < currentStepIndex ? "bg-pine" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-card p-6">
        <div className="flex justify-between text-sm text-muted">
          <span>{order.orderType === "takeaway" ? "Order type" : "Table"}</span>
          <span className="text-foreground">
            {order.orderType === "takeaway" ? "Takeaway" : order.table}
          </span>
        </div>
        <div className="mt-2 flex justify-between text-sm text-muted">
          <span>Placed at</span>
          <span className="text-foreground">{formatTime(order.createdAt)}</span>
        </div>

        <div className="my-4 border-t border-border" />

        <ul className="space-y-2">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between text-sm">
              <span>
                {item.qty} × {item.name}
              </span>
              <span className="text-muted">Nu. {item.price * item.qty}</span>
            </li>
          ))}
        </ul>

        <div className="my-4 border-t border-border" />

        <div className="flex justify-between text-sm text-muted">
          <span>Subtotal</span>
          <span className="text-foreground">Nu. {order.subtotal}</span>
        </div>
        {order.takeawayFee > 0 && (
          <div className="mt-1 flex justify-between text-sm text-muted">
            <span>Takeaway fee</span>
            <span className="text-foreground">Nu. {order.takeawayFee}</span>
          </div>
        )}

        <div className="my-4 border-t border-border" />

        <div className="flex justify-between font-display text-lg text-pine">
          <span>Total</span>
          <span>Nu. {order.total}</span>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-delayed/20 bg-delayed/10 px-3 py-2 text-sm text-delayed">
          {error}
        </p>
      )}

      {isReady ? (
        <div className="mt-8">
          <button
            onClick={() => setConfirmingPickup(true)}
            className="w-full rounded-full bg-amber py-3 text-paper transition-colors hover:bg-amber-light"
          >
            Confirm pickup
          </button>

          {confirmingPickup && (
            <div className="mt-4 rounded-xl border border-border bg-card p-5 text-left">
              <p className="text-sm font-medium text-foreground">
                Confirm you&apos;ve received your order?
              </p>
              <p className="mt-1 text-sm text-muted">
                This marks order {order.id} as picked up and completes your queue slot.
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={confirmPickup}
                  disabled={busy}
                  className="rounded-full bg-pine px-4 py-1.5 text-sm text-paper hover:bg-pine/90 disabled:opacity-60"
                >
                  Yes, I have it
                </button>
                <button
                  onClick={() => setConfirmingPickup(false)}
                  className="rounded-full border border-border px-4 py-1.5 text-sm hover:border-pine/40"
                >
                  Not yet
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <p className="mt-6 text-center text-sm text-muted">
            You&apos;ll get a notification the moment your order is ready for pickup.
          </p>

          {order.rawStatus === "waiting" && (
            <div className="mt-4 text-center">
              {cancelling ? (
                <div className="inline-flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
                  <span className="text-sm text-foreground">Cancel this order?</span>
                  <button
                    onClick={cancelOrder}
                    disabled={busy}
                    className="rounded-full bg-delayed px-3 py-1 text-xs text-paper hover:opacity-90 disabled:opacity-60"
                  >
                    Yes, cancel
                  </button>
                  <button
                    onClick={() => setCancelling(false)}
                    className="rounded-full border border-border px-3 py-1 text-xs hover:border-pine/40"
                  >
                    Keep it
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCancelling(true)}
                  className="text-sm text-delayed hover:underline"
                >
                  Cancel order
                </button>
              )}
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
