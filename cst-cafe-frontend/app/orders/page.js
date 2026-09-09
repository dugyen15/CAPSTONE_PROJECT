"use client";

import { useState } from "react";
import CustomerNav from "@/components/CustomerNav";
import { sampleOrder, statusStyles, TAKEAWAY_FEE } from "@/lib/mock-data";

const steps = ["waiting", "preparing", "ready"];

export default function OrdersPage() {
  const order = sampleOrder;
  const currentStepIndex = steps.indexOf(order.status);
  const status = statusStyles[order.status];

  const [confirmingPickup, setConfirmingPickup] = useState(false);
  const [pickupConfirmed, setPickupConfirmed] = useState(false);
  const [orderType, setOrderType] = useState(order.orderType || "dine-in");
  const [orderTypeConfirmed, setOrderTypeConfirmed] = useState(false);

  const isReady = order.status === "ready";
  const takeawayFee = orderType === "takeaway" ? TAKEAWAY_FEE : 0;
  const finalTotal = order.total + takeawayFee;

  function handleConfirmPickup() {
    // In a real app, this would call an API to mark the order as picked up
    // e.g. await fetch(`/api/orders/${order.id}/pickup`, { method: "POST" })
    setPickupConfirmed(true);
    setConfirmingPickup(false);
  }

  // --- Pickup confirmed state ---
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
              {order.items.map((item) => (
                <li key={item.name} className="flex justify-between text-sm">
                  <span>
                    {item.qty} × {item.name}
                  </span>
                </li>
              ))}
            </ul>
            <div className="my-4 border-t border-border" />
            <div className="flex justify-between text-sm text-muted">
              <span>Subtotal</span>
              <span className="text-foreground">Nu. {order.total}</span>
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

        {/* Progress tracker */}
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

        {/* Dine in / takeaway toggle */}
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
          <div className="flex justify-between text-sm text-muted">
            <span>Subtotal</span>
            <span className="text-foreground">Nu. {order.total}</span>
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
      </main>
    </>
  );
}