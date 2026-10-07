"use client";

import { useState } from "react";

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
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    );
  }

  function markOneRead(id) {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
    );
  }

  return (
    <div className="w-full px-8 py-8">

      {/* Header */}
      <div className="flex items-end justify-between border-b border-border pb-5">
        <div>
          <h1 className="font-display text-2xl text-pine">
            Notifications
          </h1>

          {unreadCount > 0 && (
            <p className="mt-1 text-sm text-muted">
              {unreadCount} unread
            </p>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="text-sm text-pine hover:underline"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Stacked notification feed */}
      <div className="mt-2">

        {notifications.length === 0 ? (
          <p className="py-8 text-sm text-muted">
            Nothing new right now.
          </p>
        ) : (
          notifications.map((n, index) => (
            <button
              key={n.id}
              type="button"
              onClick={() => markOneRead(n.id)}
              className="group flex w-full items-start gap-4 border-b border-border px-2 py-5 text-left transition-colors hover:bg-card/60"
            >

              {/* Timeline / notification dot */}
              <div className="relative flex w-5 shrink-0 justify-center">

                {!n.read && (
                  <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-pine" />
                )}

                {index < notifications.length - 1 && (
                  <span className="absolute left-1/2 top-4 h-full w-px -translate-x-1/2 bg-border" />
                )}

              </div>

              {/* Notification content */}
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">

                  <div>
                    <p
                      className={`text-sm ${
                        n.read
                          ? "font-medium text-foreground"
                          : "font-semibold text-foreground"
                      }`}
                    >
                      {n.title}
                    </p>

                    <p className="mt-1 text-sm text-muted">
                      {n.message}
                    </p>
                  </div>

                  <span className="shrink-0 text-xs text-muted/70">
                    {n.time}
                  </span>

                </div>
              </div>

            </button>
          ))
        )}

      </div>
    </div>
  );
}