"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CustomerNav from "@/components/CustomerNav";
import { sampleOrder, statusStyles, TAKEAWAY_FEE } from "@/lib/mock-data";
import { useOrder } from "@/lib/OrderContext";

const steps = ["waiting", "preparing", "ready"];
const CANCEL_WINDOW_SECONDS = 180; // 3 minutes

function formatCountdown(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function OrdersPage() {
  const { orderItems, orderType: confirmedOrderType, hasOrder } = useOrder();
  // If the customer just confirmed an order on the menu page, show that —
  // otherwise fall back to the static demo order.
  const order = hasOrder
    ? {
        ...sampleOrder,
        items: orderItems,
        orderType: confirmedOrderType || sampleOrder.orderType,
      }
    : sampleOrder;
  const currentStepIndex = steps.indexOf(order.status);
  const status = statusStyles[order.status];

  const [items, setItems] = useState(order.items);
  const [confirmingPickup, setConfirmingPickup] = useState(false);
  const [pickupConfirmed, setPickupConfirmed] = useState(false);
  const [orderType, setOrderType] = useState(order.orderType || "dine-in");
  const [orderTypeConfirmed, setOrderTypeConfirmed] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(CANCEL_WINDOW_SECONDS);

  const isReady = order.status === "ready";
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const takeawayFee = orderType === "takeaway" ? TAKEAWAY_FEE : 0;
  const finalTotal = subtotal + takeawayFee;
  const canStillCancel = secondsLeft > 0;

  useEffect(() => {
    if (cancelled || pickupConfirmed) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cancelled, pickupConfirmed]);

  function removeItem(id) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function handleConfirmPickup() {
    setPickupConfirmed(true);
    setConfirmingPickup(false);
  }

  function handleCancelOrder() {
    setCancelled(true);
    setCancelling(false);
  }

  if (cancelled) {
    return (
      <>
        <CustomerNav />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-sm uppercase tracking-wide text-muted">
            Order cancelled
          </p>
          <h1 className="mt-2 font-display text-3xl text-pine">
            Order {order.id} has been cancelled
          </h1>
          <p className="mt-3 max-w-sm text-sm text-muted">
            No worries — you can place a new order any time from the menu.
          </p>
          <Link
            href="/menu"
            className="mt-8 rounded-full bg-amber px-5 py-2 text-sm text-paper hover:bg-amber-light"
          >
            Back to menu
          </Link>
        </main>
      </>
    );
  }

  if (pickupConfirmed) {
    return (
      <>
        <CustomerNav />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-sm uppercase tracking-wide text-amber">
            Order {order.id}
          </p>
          <h1 className="mt-2 font-display text-3xl text-pine">
            Enjoy your meal!
          </h1>
          <p className="mt-3 max-w-sm text-sm text-muted">
            {orderType === "takeaway"
              ? "Takeaway order confirmed. Thanks for ordering with us."
              : `Pickup confirmed for queue number ${order.queueNumber}. Thanks for ordering with us.`}
          </p>
          <div className="mt-8 w-full rounded-2xl border border-border bg-card p-6 text-left">
            <ul className="space-y-2">
              {items.map((item) => (
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
              <span className="text-foreground">Nu. {subtotal}</span>
            </div>
            {orderType === "takeaway" && (
              <div className="mt-1 flex justify-between text-sm text-muted">
                <span>Takeaway fee</span>
                <span className="text-foreground">Nu. {TAKEAWAY_FEE}</span>
              </div>
            )}
            <div className="my-4 border-t border-border" />
            <div className="flex justify-between font-display text-lg text-pine">
              <span>Total</span>
              <span>Nu. {finalTotal}</span>
            </div>
          </div>
          <Link
            href="/feedback"
            className="mt-6 text-sm text-muted hover:text-foreground hover:underline"
          >
            Have feedback about your order? Let us know
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <CustomerNav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-amber">
              Order {order.id}
            </p>
            <h1 className="mt-1 font-display text-3xl text-pine">
              Queue number {order.queueNumber}
            </h1>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${status.className}`}
          >
            {status.label}
          </span>
        </div>

        <p className="mt-3 text-muted">
          {order.status === "delayed"
            ? "Your order is slightly delayed. We'll notify you the moment it's ready."
            : isReady
            ? "Your order is ready for pickup!"
            : `${order.aheadInQueue} orders ahead of you.`}
        </p>

        <div className="mt-10 flex items-center">
          {steps.map((step, i) => (
            <div key={step} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm ${
                    i <= currentStepIndex
                      ? "bg-pine text-paper"
                      : "bg-card text-muted"
                  }`}
                >
                  {i + 1}
                </div>
                <p className="mt-2 w-20 text-center text-xs capitalize text-muted">
                  {step}
                </p>
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

        <div className="mt-10">
          <p className="mb-2 text-sm text-muted">Dine in or takeaway?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setOrderType("dine-in")}
              disabled={orderTypeConfirmed}
              className={`flex-1 rounded-full border px-4 py-1.5 text-sm transition-colors ${
                orderType === "dine-in"
                  ? "border-pine bg-pine text-paper"
                  : "border-border text-foreground/70 hover:border-pine/40"
              } ${orderTypeConfirmed ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              Dine in
            </button>
            <button
              onClick={() => setOrderType("takeaway")}
              disabled={orderTypeConfirmed}
              className={`flex-1 rounded-full border px-4 py-1.5 text-sm transition-colors ${
                orderType === "takeaway"
                  ? "border-pine bg-pine text-paper"
                  : "border-border text-foreground/70 hover:border-pine/40"
              } ${orderTypeConfirmed ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              Takeaway (+Nu. {TAKEAWAY_FEE})
            </button>
          </div>

          {orderTypeConfirmed ? (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-pine/30 bg-pine/5 px-4 py-2.5">
              <p className="text-sm text-foreground">
                Confirmed:{" "}
                <span className="font-medium">
                  {orderType === "takeaway"
                    ? `Takeaway (+Nu. ${TAKEAWAY_FEE})`
                    : "Dine in"}
                </span>
              </p>
              <button
                onClick={() => setOrderTypeConfirmed(false)}
                className="text-xs text-pine hover:underline"
              >
                Change
              </button>
            </div>
          ) : (
            <button
              onClick={() => setOrderTypeConfirmed(true)}
              className="mt-3 w-full rounded-full bg-pine py-2 text-sm text-paper transition-colors hover:bg-pine/90"
            >
              Confirm {orderType === "takeaway" ? "takeaway" : "dine in"}
            </button>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <div className="flex justify-between text-sm text-muted">
            <span>{orderType === "takeaway" ? "Order type" : "Table"}</span>
            <span className="text-foreground">
              {orderType === "takeaway" ? "Takeaway" : order.table}
            </span>
          </div>
          <div className="mt-2 flex justify-between text-sm text-muted">
            <span>Pickup time</span>
            <span className="text-foreground">{order.time}</span>
          </div>
          <div className="my-4 border-t border-border" />
          {items.length === 0 ? (
            <p className="text-sm text-muted">No items left in this order.</p>
          ) : (
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
          )}
          <div className="my-4 border-t border-border" />
          <div className="flex justify-between text-sm text-muted">
            <span>Subtotal</span>
            <span className="text-foreground">Nu. {subtotal}</span>
          </div>
          {orderType === "takeaway" && (
            <div className="mt-1 flex justify-between text-sm text-muted">
              <span>Takeaway fee</span>
              <span className="text-foreground">Nu. {TAKEAWAY_FEE}</span>
            </div>
          )}
          <div className="my-4 border-t border-border" />
          <div className="flex justify-between font-display text-lg text-pine">
            <span>Total</span>
            <span>Nu. {finalTotal}</span>
          </div>
        </div>

        {isReady ? (
          <div className="mt-8">
            <button
              onClick={() => {
                setConfirmingPickup(true);
                setCancelling(false);
              }}
              disabled={items.length === 0}
              className="w-full rounded-full bg-amber py-3 text-paper transition-colors hover:bg-amber-light disabled:cursor-not-allowed disabled:opacity-40"
            >
              Confirm pickup
            </button>

            {confirmingPickup && (
              <div className="mt-4 rounded-xl border border-border bg-card p-5 text-left">
                <p className="text-sm font-medium text-foreground">
                  Confirm you&apos;ve received your order?
                </p>
                <p className="mt-1 text-sm text-muted">
                  This marks order {order.id} as picked up and completes your
                  queue slot.
                </p>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleConfirmPickup}
                    className="rounded-full bg-pine px-4 py-1.5 text-sm text-paper hover:bg-pine/90"
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
          <p className="mt-6 text-center text-sm text-muted">
            You&apos;ll get a notification the moment your order is ready for
            pickup.
          </p>
        )}

        <div className="mt-6 text-center">
          {canStillCancel ? (
            <>
              <p className="mb-2 text-xs text-muted">
                You can cancel this order within {formatCountdown(secondsLeft)}
              </p>
              <button
                onClick={() => {
                  setCancelling(true);
                  setConfirmingPickup(false);
                }}
                className="rounded-full border border-red-300 px-5 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Cancel order
              </button>
            </>
          ) : (
            <p className="text-sm text-muted">
              The cancellation window for this order has closed.
            </p>
          )}
        </div>

        {cancelling && canStillCancel && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-5 text-left">
            <p className="text-sm font-medium text-red-700">
              Cancel this order?
            </p>
            <p className="mt-1 text-sm text-red-600/80">
              Order {order.id} ({items.length}{" "}
              {items.length === 1 ? "item" : "items"}, Nu. {finalTotal}) will
              be cancelled. This can&apos;t be undone.
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleCancelOrder}
                className="rounded-full bg-red-600 px-4 py-1.5 text-sm text-white hover:bg-red-700"
              >
                Yes, cancel it
              </button>
              <button
                onClick={() => setCancelling(false)}
                className="rounded-full border border-border px-4 py-1.5 text-sm hover:border-pine/40"
              >
                Keep order
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}