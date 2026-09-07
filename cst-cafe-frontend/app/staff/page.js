"use client";

import { useState } from "react";
import { staffQueue, statusStyles, menuItems } from "@/lib/mock-data";

const tabs = ["Queue", "Menu"];
const nextStatus = {
  waiting: "preparing",
  preparing: "ready",
  ready: "ready",
  delayed: "preparing",
};

export default function StaffDashboard() {
  const [activeTab, setActiveTab] = useState("Queue");
  const [queue, setQueue] = useState(staffQueue);

  function advanceStatus(id) {
    setQueue((prev) =>
      prev.map((order) =>
        order.id === id ? { ...order, status: nextStatus[order.status] } : order
      )
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-border bg-card px-5 py-8">
        <p className="font-display text-lg text-pine">CST Cafe</p>
        <p className="mt-0.5 text-xs text-muted">Staff dashboard</p>
        <nav className="mt-8 flex flex-col gap-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-3 py-2 text-left text-sm ${
                activeTab === tab
                  ? "bg-pine text-paper"
                  : "text-foreground/70 hover:bg-paper"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 px-8 py-8">
        {activeTab === "Queue" && (
          <>
            <h1 className="font-display text-2xl text-pine">Active queue</h1>
            <p className="mt-1 text-sm text-muted">
              Update an order&apos;s status as it moves through preparation.
            </p>

            <div className="mt-6 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-card text-left text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Table</th>
                    <th className="px-4 py-3 font-medium">Items</th>
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((order) => {
                    const status = statusStyles[order.status];
                    return (
                      <tr key={order.id} className="border-t border-border">
                        <td className="px-4 py-3 font-medium">{order.id}</td>
                        <td className="px-4 py-3">{order.customer}</td>
                        <td className="px-4 py-3">{order.table}</td>
                        <td className="px-4 py-3">{order.items}</td>
                        <td className="px-4 py-3 text-muted">{order.time}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {order.status !== "ready" && (
                            <button
                              onClick={() => advanceStatus(order.id)}
                              className="rounded-full border border-border px-3 py-1 text-xs hover:border-pine/40"
                            >
                              Mark {nextStatus[order.status]}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === "Menu" && (
          <>
            <h1 className="font-display text-2xl text-pine">Menu items</h1>
            <p className="mt-1 text-sm text-muted">
              Toggle availability as items sell out.
            </p>
            <div className="mt-6 space-y-2">
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted">
                      {item.category} · Nu. {item.price}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      item.available
                        ? "bg-ready/15 text-ready"
                        : "bg-delayed/15 text-delayed"
                    }`}
                  >
                    {item.available ? "Available" : "Sold out"}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
