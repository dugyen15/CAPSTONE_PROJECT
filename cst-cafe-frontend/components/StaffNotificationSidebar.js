"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";

export default function StaffNotificationSidebar() {
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");

  // Load now, then check for new ones every 10 seconds
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await api("/notifications", { role: "staff" });
        if (!cancelled) setNotifications(data.items);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }

    load();
    const timer = setInterval(load, 10000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api("/notifications/read-all", { method: "POST", role: "staff" });
    } catch (err) {
      setError(err.message);
    }
  }

  async function markOneRead(id) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await api(`/notifications/${id}/read`, { method: "PATCH", role: "staff" });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="w-full px-0 py-2 sm:px-0">

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

      {error && <p className="mt-3 text-sm text-delayed">{error}</p>}

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
                    {timeAgo(n.createdAt)}
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