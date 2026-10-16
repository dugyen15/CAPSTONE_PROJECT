"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";

const READ_KEY = "cst-cafe-read-notifications";

function loadReadIds() {
  try {
    return JSON.parse(window.localStorage.getItem(READ_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveReadIds(ids) {
  try {
    window.localStorage.setItem(READ_KEY, JSON.stringify(ids.slice(-200)));
  } catch {}
}

// Customer notifications are worked out from the customer's own orders and bookings.
function buildNotifications(orders, bookings) {
  const list = [];

  for (const o of orders.slice(0, 5)) {
    const base = { id: `order-${o.id}-${o.status}`, time: o.readyAt || o.confirmedAt || o.createdAt };
    if (o.status === "ready") {
      list.push({ ...base, title: "Order ready", message: `${o.id} is ready for pickup!` });
    } else if (o.status === "preparing") {
      list.push({ ...base, title: "Order being prepared", message: `The kitchen has started ${o.id}.` });
    } else if (o.status === "delayed") {
      list.push({ ...base, title: "Order delayed", message: `${o.id} is running a little late. Thanks for your patience.` });
    } else if (o.status === "waiting") {
      list.push({ ...base, title: "Order received", message: `${o.id} is in the queue (number ${o.queueNumber}).` });
    } else if (o.status === "cancelled") {
      list.push({ ...base, time: o.cancelledAt || o.createdAt, title: "Order cancelled", message: `${o.id} was cancelled.` });
    }
  }

  for (const b of bookings.filter((b) => b.status === "booked").slice(0, 3)) {
    const when = new Date(b.time).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    list.push({
      id: `booking-${b.id}-${b.status}`,
      time: b.createdAt,
      title: "Booking confirmed",
      message: `Table ${b.tableLabel} for ${b.partySize} on ${when}.`,
    });
  }

  return list.sort((a, b) => new Date(b.time) - new Date(a.time));
}

function BellIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [readIds, setReadIds] = useState([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const notifications = items.map((n) => ({ ...n, read: readIds.includes(n.id) }));
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Check for news now, then every 15 seconds
  useEffect(() => {
    let cancelled = false;
    setReadIds(loadReadIds());

    async function load() {
      try {
        const [orders, bookings] = await Promise.all([
          api("/orders", { role: "customer" }),
          api("/bookings", { role: "customer" }),
        ]);
        if (!cancelled) setItems(buildNotifications(orders, bookings));
      } catch {}
    }

    load();
    const timer = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  // close the dropdown when clicking anywhere outside it
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function markAllRead() {
    const next = Array.from(new Set([...readIds, ...items.map((n) => n.id)]));
    setReadIds(next);
    saveReadIds(next);
  }

  function markOneRead(id) {
    if (readIds.includes(id)) return;
    const next = [...readIds, id];
    setReadIds(next);
    saveReadIds(next);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 hover:bg-card hover:text-foreground transition-colors"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-border bg-paper shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-medium text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-pine hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted">
                No notifications yet.
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markOneRead(n.id)}
                  className={`w-full text-left px-4 py-3 border-b border-border last:border-b-0 transition-colors hover:bg-card ${
                    n.read ? "" : "bg-card/60"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pine" />
                    )}
                    <div className={n.read ? "pl-3.5" : ""}>
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      <p className="text-xs text-muted mt-0.5">{n.message}</p>
                      <p className="text-[11px] text-muted/70 mt-1">{timeAgo(n.time)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}