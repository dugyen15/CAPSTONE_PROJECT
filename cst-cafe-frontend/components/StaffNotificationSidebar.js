"use client";

import { useState } from "react";

// Mock data for now — swap this for a real fetch/subscription (or a
// websocket push) once the backend can notify staff of new orders,
// cancellations, and stock changes in real time.
const initialNotifications = [
  {
    id: 1,
    title: "New order",
    message: "ORD-0144 placed for Table 2 — 3 items.",
    time: "2m ago",
    read: false,
  },
  {
    id: 2,
    title: "Order cancelled",
    message: "ORD-0138 was cancelled by the customer.",
    time: "8m ago",
    read: false,
  },
  {
    id: 3,
    title: "Order delayed",
    message: "ORD-0143 (takeaway) is running behind schedule.",
    time: "15m ago",
    read: false,
  },
  {
    id: 4,
    title: "Item sold out",
    message: "Cheese Sandwich was marked sold out.",
    time: "1h ago",
    read: true,
  },
];

export default function StaffNotificationSidebar() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function markOneRead(id) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  return (
    <aside className="w-72 shrink-0 border-l border-border bg-card px-5 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-lg text-pine">Notifications</p>
          {unreadCount > 0 && (
            <p className="mt-0.5 text-xs text-muted">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="text-xs text-pine hover:underline"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="mt-6 space-y-2">
        {notifications.length === 0 ? (
          <p className="text-sm text-muted">Nothing new right now.</p>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => markOneRead(n.id)}
              className={`w-full rounded-xl border border-border px-4 py-3 text-left transition-colors hover:bg-paper ${
                n.read ? "bg-paper" : "bg-pine/5"
              }`}
            >
              <div className="flex items-start gap-2">
                {!n.read && (
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pine" />
                )}
                <div className={n.read ? "pl-3.5" : ""}>
                  <p className="text-sm font-medium text-foreground">{n.title}</p>
                  <p className="text-xs text-muted mt-0.5">{n.message}</p>
                  <p className="text-[11px] text-muted/70 mt-1">{n.time}</p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}