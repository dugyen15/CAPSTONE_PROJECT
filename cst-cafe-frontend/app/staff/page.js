"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/useSession";
import { statusStyles } from "@/lib/status";
import { formatTime, formatDateTime } from "@/lib/format";
import StaffNotificationSidebar from "@/components/StaffNotificationSidebar";
import ProfileMenu from "@/components/ProfileMenu";
import SettingsMenu from "@/components/SettingsMenu";

const tabs = ["Queue", "Menu", "Feedback", "Notifications"];

// The next step for an order, based on where it really is in the kitchen
const nextStep = {
  waiting: "preparing",
  preparing: "ready",
  ready: "completed",
};

const orderTypeStyles = {
  "dine-in": {
    label: "Dine in",
    className: "bg-pine/10 text-pine",
  },
  takeaway: {
    label: "Takeaway",
    className: "bg-amber/15 text-amber",
  },
};

const emptyForm = {
  name: "",
  category: "",
  price: "",
  prepTime: "",
  description: "",
};

export default function StaffDashboard() {
  const { user, loading } = useSession("staff");
  const [activeTab, setActiveTab] = useState("Queue");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [queue, setQueue] = useState([]);

  // --- Menu management state ---
  const [items, setItems] = useState([]);
  const [categoryList, setCategoryList] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [removingId, setRemovingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);

  const [feedback, setFeedback] = useState({ count: 0, average: null, items: [] });

  const menuCategories = categoryList.map((c) => c.name);
  const feedbackEntries = feedback.items;
  const averageRating = feedback.average === null ? null : feedback.average.toFixed(1);

  // Runs a request, shows its error (if any) at the top of the page
  async function run(fn) {
    setError("");
    try {
      return await fn();
    } catch (err) {
      setError(err.message);
      return undefined;
    }
  }

  const loadQueue = useCallback(async () => {
    try {
      setQueue(await api("/orders", { role: "staff" }));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // Live queue: load now, then every 8 seconds
  useEffect(() => {
    if (!user) return;
    loadQueue();
    const timer = setInterval(loadQueue, 8000);
    return () => clearInterval(timer);
  }, [user, loadQueue]);

  // Menu and categories
  useEffect(() => {
    if (!user) return;
    Promise.all([api("/menu"), api("/menu/categories")])
      .then(([menu, cats]) => {
        setItems(menu);
        setCategoryList(cats);
      })
      .catch((err) => setError(err.message));
  }, [user]);

  // Feedback: refresh whenever that tab is opened
  useEffect(() => {
    if (!user || activeTab !== "Feedback") return;
    api("/feedback", { role: "staff" })
      .then(setFeedback)
      .catch((err) => setError(err.message));
  }, [user, activeTab]);

  function replaceOrder(updated) {
    setQueue((prev) =>
      updated.status === "completed" || updated.status === "cancelled"
        ? prev.filter((o) => o.id !== updated.id)
        : prev.map((o) => (o.id === updated.id ? updated : o))
    );
  }

  async function advanceStatus(order) {
    const updated = await run(() =>
      api(`/orders/${order.id}/status`, {
        method: "PATCH",
        role: "staff",
        body: { status: nextStep[order.rawStatus] },
      })
    );
    if (updated) replaceOrder(updated);
    else loadQueue();
  }

  async function toggleDelay(order) {
    const updated = await run(() =>
      api(`/orders/${order.id}/delayed`, {
        method: "PATCH",
        role: "staff",
        body: { isDelayed: !order.isDelayed },
      })
    );
    if (updated) replaceOrder(updated);
  }

  // Staff can change whether an order has been paid
  async function togglePayment(order) {
    const updated = await run(() =>
      api(`/orders/${order.id}/payment`, {
        method: "PATCH",
        role: "staff",
        body: { isPaid: !order.isPaid },
      })
    );
    if (updated) replaceOrder(updated);
  }

  function replaceItem(updated) {
    setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  }

  async function toggleAvailability(item) {
    const updated = await run(() =>
      api(`/menu/${item.id}`, {
        method: "PUT",
        role: "staff",
        body: { available: !item.available },
      })
    );
    if (updated) replaceItem(updated);
  }

  function startEdit(item) {
    setShowAddForm(false);
    setRemovingId(null);
    setEditingId(item.id);

    setEditForm({
      name: item.name,
      category: item.category,
      price: item.price,
      prepTime: item.prepTime || "",
      description: item.description || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id) {
    if (!editForm.name.trim()) return;

    const updated = await run(() =>
      api(`/menu/${id}`, {
        method: "PUT",
        role: "staff",
        body: {
          name: editForm.name.trim(),
          category: editForm.category,
          price: Number(editForm.price) || 0,
          prepTime: editForm.prepTime.trim(),
          description: editForm.description.trim(),
        },
      })
    );
    if (updated) {
      replaceItem(updated);
      setEditingId(null);
    }
  }

  async function confirmRemove(id) {
    const result = await run(() => api(`/menu/${id}`, { method: "DELETE", role: "staff" }));
    if (!result) return;
    if (result.removed) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    } else {
      // Items that appear in past orders are hidden (sold out) instead of deleted
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, available: false } : item))
      );
      setNotice(result.message);
    }
    setRemovingId(null);
  }

  async function addItem(e) {
    e.preventDefault();

    if (!addForm.name.trim()) return;

    const created = await run(() =>
      api("/menu", {
        method: "POST",
        role: "staff",
        body: {
          name: addForm.name.trim(),
          category: addForm.category || menuCategories[0],
          price: Number(addForm.price) || 0,
          prepTime: addForm.prepTime.trim() || "5 min",
          description: addForm.description.trim(),
        },
      })
    );
    if (created) {
      setItems((prev) => [...prev, created]);
      setAddForm(emptyForm);
      setShowAddForm(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        Loading the dashboard...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-6">
        <div>
          <p className="font-display text-lg text-pine">CST Cafe</p>
          <p className="text-xs text-muted">Staff dashboard</p>
        </div>

        <div className="flex items-center gap-3">
          <ProfileMenu
            user={user}
            profileHref="/staff/profile"
          />

          <SettingsMenu logoutHref="/staff/login" role="staff" />
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="w-full shrink-0 border-b border-border bg-card px-3 py-3 lg:w-56 lg:border-b-0 lg:border-r lg:px-5 lg:py-8">
          <nav className="flex gap-1 overflow-x-auto lg:flex-col">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm ${
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

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
          {error && (
            <p className="mb-4 rounded-lg border border-delayed/20 bg-delayed/10 px-3 py-2 text-sm text-delayed">
              {error}
            </p>
          )}
          {notice && (
            <p className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground">
              <span>{notice}</span>
              <button onClick={() => setNotice("")} className="text-xs text-muted hover:underline">
                Dismiss
              </button>
            </p>
          )}
          {/* ================= QUEUE ================= */}
          {activeTab === "Queue" && (
            <>
              <h1 className="font-display text-2xl text-pine">
                Active queue
              </h1>

              <p className="mt-1 text-sm text-muted">
                Update an order&apos;s status and payment as it moves through
                preparation.
              </p>

              <div className="mt-6 hidden overflow-x-auto rounded-xl border border-border lg:block">
                <table className="w-full text-sm">
                  <thead className="bg-card text-left text-muted">
                    <tr>
                      <th className="px-3 py-3 font-medium">
                        Order
                      </th>

                      <th className="px-3 py-3 font-medium">
                        Customer
                      </th>

                      <th className="px-3 py-3 font-medium">
                        Table
                      </th>

                      <th className="px-3 py-3 font-medium">
                        Type
                      </th>

                      <th className="px-3 py-3 font-medium">
                        Items
                      </th>

                      <th className="px-3 py-3 font-medium">
                        Time
                      </th>

                      <th className="px-3 py-3 font-medium">
                        Status
                      </th>

                      {/* STAFF-ONLY PAYMENT COLUMN */}
                      <th className="px-3 py-3 font-medium">
                        Payment
                      </th>

                      <th className="px-3 py-3 font-medium"></th>
                    </tr>
                  </thead>

                  <tbody>
                    {queue.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-3 py-6 text-center text-muted">
                          No active orders right now.
                        </td>
                      </tr>
                    )}
                    {queue.map((order) => {
                      const status = statusStyles[order.status] || statusStyles.waiting;

                      const type =
                        orderTypeStyles[order.orderType] ||
                        orderTypeStyles["dine-in"];

                      return (
                        <tr
                          key={order.id}
                          className="border-t border-border"
                        >
                          <td className="px-3 py-3 font-medium">
                            {order.id}
                          </td>

                          <td className="px-3 py-3">
                            {order.customer}
                          </td>

                          <td className="px-3 py-3">
                            {order.table || "—"}
                          </td>

                          <td className="px-3 py-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${type.className}`}
                            >
                              {type.label}
                            </span>
                          </td>

                          <td className="px-3 py-3">
                            {order.items.reduce((sum, i) => sum + i.qty, 0)}
                          </td>

                          <td className="px-3 py-3 text-muted">
                            {formatTime(order.createdAt)}
                          </td>

                          <td className="px-3 py-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </td>

                          {/* ================= PAYMENT ================= */}
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                  order.isPaid
                                    ? "bg-ready/15 text-ready"
                                    : "bg-delayed/15 text-delayed"
                                }`}
                              >
                                {order.isPaid ? "Paid" : "Unpaid"}
                              </span>

                              <button
                                onClick={() =>
                                  togglePayment(order)
                                }
                                className="rounded-full border border-border px-3 py-1 text-xs hover:border-pine/40"
                              >
                                {order.isPaid
                                  ? "Mark unpaid"
                                  : "Mark paid"}
                              </button>
                            </div>
                          </td>

                          {/* STATUS BUTTON */}
                          <td className="px-3 py-3 text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              {order.rawStatus !== "ready" && (
                                <button
                                  onClick={() => toggleDelay(order)}
                                  className="rounded-full border border-border px-3 py-1 text-xs hover:border-pine/40"
                                >
                                  {order.isDelayed ? "Clear delay" : "Delay"}
                                </button>
                              )}
                              <button
                                onClick={() => advanceStatus(order)}
                                className="rounded-full border border-border px-3 py-1 text-xs hover:border-pine/40"
                              >
                                Mark {nextStep[order.rawStatus]}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Small screens: one card per order */}
              <div className="mt-6 space-y-3 lg:hidden">
                {queue.length === 0 && (
                  <p className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted">
                    No active orders right now.
                  </p>
                )}
                {queue.map((order) => {
                  const status = statusStyles[order.status] || statusStyles.waiting;
                  const type = orderTypeStyles[order.orderType] || orderTypeStyles["dine-in"];
                  return (
                    <div
                      key={order.id}
                      className="rounded-xl border border-border bg-card p-4 text-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{order.id}</p>
                          <p className="text-muted">
                            {order.customer} · {formatTime(order.createdAt)}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-muted">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${type.className}`}
                        >
                          {type.label}
                        </span>
                        <span>Table: {order.table || "—"}</span>
                        <span>
                          · {order.items.reduce((sum, i) => sum + i.qty, 0)}{" "}
                          {order.items.reduce((sum, i) => sum + i.qty, 0) === 1 ? "item" : "items"}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            order.isPaid
                              ? "bg-ready/15 text-ready"
                              : "bg-delayed/15 text-delayed"
                          }`}
                        >
                          {order.isPaid ? "Paid" : "Unpaid"}
                        </span>
                        <button
                          onClick={() => togglePayment(order)}
                          className="rounded-full border border-border px-3 py-1 text-xs hover:border-pine/40"
                        >
                          {order.isPaid ? "Mark unpaid" : "Mark paid"}
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                        {order.rawStatus !== "ready" && (
                          <button
                            onClick={() => toggleDelay(order)}
                            className="rounded-full border border-border px-3 py-1 text-xs hover:border-pine/40"
                          >
                            {order.isDelayed ? "Clear delay" : "Delay"}
                          </button>
                        )}
                        <button
                          onClick={() => advanceStatus(order)}
                          className="rounded-full border border-border px-3 py-1 text-xs hover:border-pine/40"
                        >
                          Mark {nextStep[order.rawStatus]}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ================= MENU ================= */}
          {activeTab === "Menu" && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="font-display text-2xl text-pine">
                    Menu items
                  </h1>

                  <p className="mt-1 text-sm text-muted">
                    Toggle availability, edit details, or add and remove
                    items.
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
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        name: e.target.value,
                      })
                    }
                    className="rounded-lg border border-border bg-paper px-3 py-2 text-sm"
                    required
                  />

                  <select
                    value={addForm.category || menuCategories[0] || ""}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        category: e.target.value,
                      })
                    }
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
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        price: e.target.value,
                      })
                    }
                    className="rounded-lg border border-border bg-paper px-3 py-2 text-sm"
                    required
                  />

                  <input
                    type="text"
                    placeholder="Prep time (e.g. 10 min)"
                    value={addForm.prepTime}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        prepTime: e.target.value,
                      })
                    }
                    className="rounded-lg border border-border bg-paper px-3 py-2 text-sm"
                  />

                  <input
                    type="text"
                    placeholder="Description"
                    value={addForm.description}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        description: e.target.value,
                      })
                    }
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
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              name: e.target.value,
                            })
                          }
                          className="rounded-lg border border-border bg-paper px-3 py-2 text-sm"
                        />

                        <select
                          value={editForm.category}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              category: e.target.value,
                            })
                          }
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
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              price: e.target.value,
                            })
                          }
                          className="rounded-lg border border-border bg-paper px-3 py-2 text-sm"
                        />

                        <input
                          type="text"
                          value={editForm.prepTime}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              prepTime: e.target.value,
                            })
                          }
                          className="rounded-lg border border-border bg-paper px-3 py-2 text-sm"
                        />

                        <input
                          type="text"
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              description: e.target.value,
                            })
                          }
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
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-foreground">
                          Remove{" "}
                          <span className="font-medium">
                            {item.name}
                          </span>{" "}
                          from the menu?
                        </p>

                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              confirmRemove(item.id)
                            }
                            className="rounded-full bg-delayed px-3 py-1 text-xs text-paper hover:opacity-90"
                          >
                            Yes, remove
                          </button>

                          <button
                            onClick={() =>
                              setRemovingId(null)
                            }
                            className="rounded-full border border-border px-3 py-1 text-xs hover:border-pine/40"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            {item.name}
                          </p>

                          <p className="text-sm text-muted">
                            {item.category} · Nu. {item.price}
                            {item.prepTime ? ` · ${item.prepTime}` : ""}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() =>
                              toggleAvailability(item)
                            }
                            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                              item.available
                                ? "bg-ready/15 text-ready hover:bg-ready/25"
                                : "bg-delayed/15 text-delayed hover:bg-delayed/25"
                            }`}
                          >
                            {item.available
                              ? "Available"
                              : "Sold out"}
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

          {/* ================= FEEDBACK ================= */}
          {activeTab === "Feedback" && (
            <>
              <h1 className="font-display text-2xl text-pine">
                Customer feedback
              </h1>

              <p className="mt-1 text-sm text-muted">
                Anonymous ratings and comments left by customers — no names
                are attached to any entry.
              </p>

              {feedbackEntries.length > 0 && (
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-lg text-amber">★</span>

                  <span className="font-display text-lg text-pine">
                    {averageRating}
                  </span>

                  <span className="text-sm text-muted">
                    average from {feedback.count}{" "}
                    {feedback.count === 1
                      ? "review"
                      : "reviews"}
                  </span>
                </div>
              )}

              <div className="mt-6 space-y-2">
                {feedbackEntries.length === 0 ? (
                  <p className="text-sm text-muted">
                    No feedback yet.
                  </p>
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
                                n <= entry.rating
                                  ? "text-amber"
                                  : "text-border"
                              }
                            >
                              ★
                            </span>
                          ))}
                        </div>

                        <span className="text-xs text-muted">
                          {formatDateTime(entry.createdAt)}
                        </span>
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

          {/* ================= NOTIFICATIONS ================= */}
          {activeTab === "Notifications" && (
            <StaffNotificationSidebar />
          )}
        </main>
      </div>
    </div>
  );
}