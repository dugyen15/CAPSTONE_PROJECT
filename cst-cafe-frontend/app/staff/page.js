"use client";

import { useState } from "react";
import { staffQueue, statusStyles, menuItems, categories, feedbackEntries } from "@/lib/mock-data";
import StaffNotificationSidebar from "@/components/StaffNotificationSidebar";
const tabs = ["Queue", "Menu", "Feedback"];
const nextStatus = {
  waiting: "preparing",
  preparing: "ready",
  ready: "ready",
  delayed: "preparing",
};

const orderTypeStyles = {
  "dine-in": { label: "Dine in", className: "bg-pine/10 text-pine" },
  takeaway: { label: "Takeaway", className: "bg-amber/15 text-amber" },
};

const menuCategories = categories.filter((c) => c !== "All");

const emptyForm = {
  name: "",
  category: menuCategories[0] || "Meals",
  price: "",
  prepTime: "",
  description: "",
};

export default function StaffDashboard() {
  const [activeTab, setActiveTab] = useState("Queue");
  const [queue, setQueue] = useState(staffQueue);

  // --- Menu management state ---
  const [items, setItems] = useState(menuItems);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [removingId, setRemovingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);

  const averageRating =
    feedbackEntries.length > 0
      ? (
          feedbackEntries.reduce((sum, f) => sum + f.rating, 0) /
          feedbackEntries.length
        ).toFixed(1)
      : null;

  function advanceStatus(id) {
    setQueue((prev) =>
      prev.map((order) =>
        order.id === id ? { ...order, status: nextStatus[order.status] } : order
      )
    );
  }

  function toggleAvailability(id) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, available: !item.available } : item
      )
    );
  }

  function startEdit(item) {
    setShowAddForm(false);
    setRemovingId(null);
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      category: item.category,
      price: item.price,
      prepTime: item.prepTime,
      description: item.description,
    });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function saveEdit(id) {
    if (!editForm.name.trim()) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              name: editForm.name.trim(),
              category: editForm.category,
              price: Number(editForm.price) || 0,
              prepTime: editForm.prepTime.trim(),
              description: editForm.description.trim(),
            }
          : item
      )
    );
    setEditingId(null);
  }

  function confirmRemove(id) {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setRemovingId(null);
  }

  function addItem(e) {
    e.preventDefault();
    if (!addForm.name.trim()) return;
    const newItem = {
      id: `m${Date.now()}`,
      name: addForm.name.trim(),
      category: addForm.category,
      price: Number(addForm.price) || 0,
      prepTime: addForm.prepTime.trim() || "5 min",
      available: true,
      description: addForm.description.trim(),
    };
    setItems((prev) => [...prev, newItem]);
    setAddForm(emptyForm);
    setShowAddForm(false);
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
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Items</th>
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((order) => {
                    const status = statusStyles[order.status];
                    const type = orderTypeStyles[order.orderType] || orderTypeStyles["dine-in"];
                    return (
                      <tr key={order.id} className="border-t border-border">
                        <td className="px-4 py-3 font-medium">{order.id}</td>
                        <td className="px-4 py-3">{order.customer}</td>
                        <td className="px-4 py-3">{order.table}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${type.className}`}
                          >
                            {type.label}
                          </span>
                        </td>
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
            <div className="flex items-start justify-between">
              <div>
                <h1 className="font-display text-2xl text-pine">Menu items</h1>
                <p className="mt-1 text-sm text-muted">
                  Toggle availability, edit details, or add and remove items.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddForm((prev) => !prev);
                  setEditingId(null);
                  setRemovingId(null);
                }}
                className="rounded-full bg-pine px-4 py-1.5 text-sm text-paper hover:bg-pine/90"
              >
                {showAddForm ? "Cancel" : "+ Add item"}
              </button>
            </div>

            {showAddForm && (
              <form
                onSubmit={addItem}
                className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2"
              >
                <input
                  type="text"
                  placeholder="Item name"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="rounded-lg border border-border bg-paper px-3 py-2 text-sm"
                  required
                />
                <select
                  value={addForm.category}
                  onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                  className="rounded-lg border border-border bg-paper px-3 py-2 text-sm"
                >
                  {menuCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  placeholder="Price (Nu.)"
                  value={addForm.price}
                  onChange={(e) => setAddForm({ ...addForm, price: e.target.value })}
                  className="rounded-lg border border-border bg-paper px-3 py-2 text-sm"
                  required
                />
                <input
                  type="text"
                  placeholder="Prep time (e.g. 10 min)"
                  value={addForm.prepTime}
                  onChange={(e) => setAddForm({ ...addForm, prepTime: e.target.value })}
                  className="rounded-lg border border-border bg-paper px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={addForm.description}
                  onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                  className="rounded-lg border border-border bg-paper px-3 py-2 text-sm sm:col-span-2"
                />
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="rounded-full bg-amber px-4 py-1.5 text-sm text-paper hover:bg-amber-light"
                  >
                    Add to menu
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6 space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-border bg-card px-4 py-3"
                >
                  {editingId === item.id ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="rounded-lg border border-border bg-paper px-3 py-2 text-sm"
                      />
                      <select
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="rounded-lg border border-border bg-paper px-3 py-2 text-sm"
                      >
                        {menuCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0"
                        value={editForm.price}
                        onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                        className="rounded-lg border border-border bg-paper px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        value={editForm.prepTime}
                        onChange={(e) => setEditForm({ ...editForm, prepTime: e.target.value })}
                        className="rounded-lg border border-border bg-paper px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="rounded-lg border border-border bg-paper px-3 py-2 text-sm sm:col-span-2"
                      />
                      <div className="flex gap-2 sm:col-span-2">
                        <button
                          onClick={() => saveEdit(item.id)}
                          className="rounded-full bg-pine px-4 py-1.5 text-xs text-paper hover:bg-pine/90"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded-full border border-border px-4 py-1.5 text-xs hover:border-pine/40"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : removingId === item.id ? (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-foreground">
                        Remove <span className="font-medium">{item.name}</span> from the menu?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => confirmRemove(item.id)}
                          className="rounded-full bg-delayed px-3 py-1 text-xs text-paper hover:opacity-90"
                        >
                          Yes, remove
                        </button>
                        <button
                          onClick={() => setRemovingId(null)}
                          className="rounded-full border border-border px-3 py-1 text-xs hover:border-pine/40"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted">
                          {item.category} · Nu. {item.price} · {item.prepTime}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleAvailability(item.id)}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            item.available
                              ? "bg-ready/15 text-ready hover:bg-ready/25"
                              : "bg-delayed/15 text-delayed hover:bg-delayed/25"
                          }`}
                        >
                          {item.available ? "Available" : "Sold out"}
                        </button>
                        <button
                          onClick={() => startEdit(item)}
                          className="rounded-full border border-border px-3 py-1 text-xs hover:border-pine/40"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setRemovingId(item.id);
                            setEditingId(null);
                          }}
                          className="rounded-full border border-border px-3 py-1 text-xs text-delayed hover:border-delayed/40"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "Feedback" && (
          <>
            <h1 className="font-display text-2xl text-pine">Customer feedback</h1>
            <p className="mt-1 text-sm text-muted">
              Anonymous ratings and comments left by customers — no names are
              attached to any entry.
            </p>

            {feedbackEntries.length > 0 && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-lg text-amber">★</span>
                <span className="font-display text-lg text-pine">
                  {averageRating}
                </span>
                <span className="text-sm text-muted">
                  average from {feedbackEntries.length}{" "}
                  {feedbackEntries.length === 1 ? "review" : "reviews"}
                </span>
              </div>
            )}

            <div className="mt-6 space-y-2">
              {feedbackEntries.length === 0 ? (
                <p className="text-sm text-muted">No feedback yet.</p>
              ) : (
                feedbackEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span
                            key={n}
                            className={
                              n <= entry.rating ? "text-amber" : "text-border"
                            }
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="text-xs text-muted">{entry.time}</span>
                    </div>
                    <p className="mt-2 text-sm text-foreground">
                      {entry.comment ? (
                        entry.comment
                      ) : (
                        <span className="italic text-muted">
                          No comment left.
                        </span>
                      )}
                    </p>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>

      <StaffNotificationSidebar />
    </div>
  );
}