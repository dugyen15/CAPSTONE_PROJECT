
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";
import { api, clearToken } from "@/lib/api";

function formatCurrency(value) {
  return `Nu. ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString();
}

function getMenuItems(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.menuItems)) return response.menuItems;
  if (Array.isArray(response?.menu)) return response.menu;

  return [];
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession("admin");

  const [email, setEmail] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);

  const [activeSection, setActiveSection] = useState("overview");

  const [overview, setOverview] = useState(null);
  const [staff, setStaff] = useState([]);
  const [staffActivity, setStaffActivity] = useState([]);
  const [sales, setSales] = useState(null);
  const [menuItems, setMenuItems] = useState([]);

  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [deletingStaffId, setDeletingStaffId] = useState(null);

  function handleLogout() {
    clearToken("admin");
    router.replace("/admin/login");
  }

  async function handleGenerateInvitation(e) {
    e.preventDefault();

    setError("");
    setSuccess("");
    setInvitationCode("");

    if (!email.trim()) {
      setError("Please enter a staff email address.");
      return;
    }

    setGenerating(true);

    try {
      const response = await api("/admin/auth/invitations", {
        method: "POST",
        body: { email: email.trim() },
        role: "admin",
      });

      setInvitationCode(response.invitationCode);
      setSuccess(
        `Invitation code generated successfully for ${response.email}.`
      );
      setEmail("");
    } catch (err) {
      setError(err.message || "Unable to generate invitation code.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(invitationCode);
      setSuccess("Invitation code copied successfully.");
    } catch {
      setError("Unable to copy the code. Please copy it manually.");
    }
  }

  const loadDashboardData = useCallback(async () => {
    if (!user) return;

    setDataLoading(true);
    setDataError("");

    try {
      if (activeSection === "overview") {
        const [overviewResponse, staffResponse, salesResponse] =
          await Promise.all([
            api("/admin/overview", { role: "admin" }),
            api("/admin/staff", { role: "admin" }),
            api("/admin/sales", { role: "admin" }),
          ]);

        setOverview(overviewResponse);
        setStaff(staffResponse.staff || []);
        setSales(salesResponse);
      }

      if (activeSection === "staff") {
        const response = await api("/admin/staff", {
          role: "admin",
        });

        setStaff(response.staff || []);
      }

      if (activeSection === "activity") {
        const response = await api("/admin/staff-activity", {
          role: "admin",
        });

        setStaffActivity(response.activities || []);
      }

      if (activeSection === "sales") {
        const response = await api("/admin/sales", {
          role: "admin",
        });

        setSales(response);
      }

      if (activeSection === "menu") {
        const response = await api("/menu", {
          role: "admin",
        });

        setMenuItems(getMenuItems(response));
      }
    } catch (err) {
      setDataError(err.message || "Unable to load dashboard information.");
    } finally {
      setDataLoading(false);
    }
  }, [activeSection, user]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  async function handleDeleteStaff(member) {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${member.name}'s staff account?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingStaffId(member.id);
    setDataError("");
    setSuccess("");

    try {
      const response = await api(`/admin/staff/${member.id}`, {
        method: "DELETE",
        role: "admin",
      });

      setStaff((current) =>
        current.filter((item) => item.id !== member.id)
      );

      setSuccess(
        response.message || "Staff account deleted successfully."
      );

      const overviewResponse = await api("/admin/overview", {
        role: "admin",
      });

      setOverview(overviewResponse);
    } catch (err) {
      setDataError(err.message || "Unable to delete staff account.");
    } finally {
      setDeletingStaffId(null);
    }
  }

  const navigation = [
    { id: "overview", label: "Overview", icon: "▦" },
    { id: "staff", label: "Staff Management", icon: "♙" },
    { id: "activity", label: "Staff Activity", icon: "◷" },
    { id: "sales", label: "Sales & Orders", icon: "▤" },
    { id: "menu", label: "Daily Menu", icon: "☷" },
    { id: "invitations", label: "Staff Invitations", icon: "+" },
  ];

  const stats = [
    {
      title: "Staff Accounts",
      value: overview?.totalStaff ?? "--",
      description: "Registered staff members",
      icon: "♙",
    },
    {
      title: "Today's Sales",
      value:
        overview === null
          ? "--"
          : formatCurrency(overview.todaySales),
      description: "Paid orders today",
      icon: "Nu.",
    },
    {
      title: "Total Orders",
      value: overview?.totalOrders ?? "--",
      description: "All recorded orders",
      icon: "▤",
    },
    {
      title: "Menu Items",
      value: overview?.totalMenuItems ?? "--",
      description: "Items in the menu",
      icon: "☷",
    },
  ];

  if (sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f7f2] text-green-900">
        Loading Admin Dashboard...
      </div>
    );
  }

  if (!user) return null;

  function renderOverview() {
    return (
      <>
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-green-950">
            Dashboard Overview
          </h2>
          <p className="mt-2 text-gray-600">
            Monitor your CST Cafe daily operations.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.title}
              className="rounded-xl border border-green-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">
                  {stat.title}
                </p>

                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-lg font-bold text-green-800">
                  {stat.icon}
                </span>
              </div>

              <h3 className="mt-4 text-3xl font-bold text-green-950">
                {stat.value}
              </h3>

              <p className="mt-1 text-xs text-gray-500">
                {stat.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-green-900">
              Staff Activity
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              View staff login and logout records.
            </p>

            <div className="mt-6 rounded-lg bg-gray-50 p-5">
              <p className="text-2xl font-bold text-green-900">
                {overview?.totalStaff ?? "--"}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Total staff accounts
              </p>
              <p className="mt-3 text-xs text-gray-500">
                Review staff login and logout history.
              </p>
            </div>

            <button
              onClick={() => setActiveSection("activity")}
              className="mt-4 text-sm font-semibold text-green-800 hover:underline"
            >
              View Staff Activity →
            </button>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-green-900">
              Daily Sales Overview
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              Monitor revenue and order performance.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Today's Revenue</p>
                <p className="mt-2 text-xl font-bold text-green-900">
                  {sales
                    ? formatCurrency(sales.summary.totalSales)
                    : "--"}
                </p>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Today's Orders</p>
                <p className="mt-2 text-xl font-bold text-green-900">
                  {sales?.summary.totalOrders ?? "--"}
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveSection("sales")}
              className="mt-4 text-sm font-semibold text-green-800 hover:underline"
            >
              View Sales & Orders →
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-green-900">
            Today's Menu
          </h3>

          <p className="mt-2 text-sm text-gray-500">
            View the food items currently available at CST Cafe.
          </p>

          <button
            onClick={() => setActiveSection("menu")}
            className="mt-4 text-sm font-semibold text-green-800 hover:underline"
          >
            View Daily Menu →
          </button>
        </div>
      </>
    );
  }

  function renderStaff() {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-green-950">
          Staff Management
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          View staff accounts and permanently delete accounts when
          employees leave CST Cafe.
        </p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="border-b bg-gray-50 text-gray-600">
              <tr>
                <th className="p-4">Staff Member</th>
                <th className="p-4">Email</th>
                <th className="p-4">Registered</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>

            <tbody>
              {staff.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="p-8 text-center text-gray-500"
                  >
                    No staff accounts found.
                  </td>
                </tr>
              ) : (
                staff.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b last:border-0 hover:bg-gray-50"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 font-bold text-green-800">
                            {member.name?.charAt(0)?.toUpperCase() || "S"}
                          </div>
                        )}

                        <span className="font-semibold text-gray-800">
                          {member.name}
                        </span>
                      </div>
                    </td>

                    <td className="p-4 text-gray-600">
                      {member.email}
                    </td>

                    <td className="p-4 text-gray-600">
                      {formatDate(member.createdAt)}
                    </td>

                    <td className="p-4">
                      <button
                        onClick={() => handleDeleteStaff(member)}
                        disabled={deletingStaffId === member.id}
                        className="rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingStaffId === member.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          Deleting a staff account permanently removes that account.
          Historical orders and sales records are preserved.
        </p>
      </div>
    );
  }

  function renderActivity() {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-green-950">
              Staff Activity
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              View staff login and logout history.
            </p>
          </div>

          <button
            onClick={loadDashboardData}
            disabled={dataLoading}
            className="rounded-lg border border-green-800 px-4 py-2 text-sm font-semibold text-green-800 hover:bg-green-50 disabled:opacity-50"
          >
            {dataLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[750px] text-left text-sm">
            <thead className="border-b bg-gray-50 text-gray-600">
              <tr>
                <th className="p-4">Staff Member</th>
                <th className="p-4">Email</th>
                <th className="p-4">Login Time</th>
                <th className="p-4">Logout Time</th>
              </tr>
            </thead>

            <tbody>
              {staffActivity.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="p-8 text-center text-gray-500"
                  >
                    No staff activity records found.
                  </td>
                </tr>
              ) : (
                staffActivity.map((activity) => (
                  <tr
                    key={activity.id}
                    className="border-b last:border-0 hover:bg-gray-50"
                  >
                    <td className="p-4 font-semibold text-gray-800">
                      {activity.staffName}
                    </td>

                    <td className="p-4 text-gray-600">
                      {activity.staffEmail}
                    </td>

                    <td className="p-4 text-gray-600">
                      {formatDate(activity.loginAt)}
                    </td>

                    <td className="p-4">
                      {activity.logoutAt ? (
                        <span className="text-gray-600">
                          {formatDate(activity.logoutAt)}
                        </span>
                      ) : (
                        <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
                          Not logged out
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          Showing the latest 100 staff activity records.
        </p>
      </div>
    );
  }

  function renderSales() {
    const summary = sales?.summary;

    const salesStats = [
      ["Total Revenue", formatCurrency(summary?.totalSales)],
      ["Total Orders", summary?.totalOrders ?? 0],
      ["Paid Orders", summary?.paidOrders ?? 0],
      ["Completed Orders", summary?.completedOrders ?? 0],
      ["Pending Orders", summary?.pendingOrders ?? 0],
      ["Cancelled Orders", summary?.cancelledOrders ?? 0],
    ];

    return (
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-green-950">
              Sales & Orders
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Monitor today's sales and customer orders.
            </p>
          </div>

          <button
            onClick={loadDashboardData}
            disabled={dataLoading}
            className="rounded-lg border border-green-800 px-4 py-2 text-sm font-semibold text-green-800 hover:bg-green-50 disabled:opacity-50"
          >
            {dataLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {salesStats.map(([label, value]) => (
            <div key={label} className="rounded-lg bg-gray-50 p-5">
              <p className="text-sm text-gray-500">{label}</p>
              <p className="mt-3 text-2xl font-bold text-green-900">
                {value}
              </p>
            </div>
          ))}
        </div>

        <h3 className="mt-8 text-lg font-bold text-green-900">
          Today's Orders
        </h3>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[750px] text-left text-sm">
            <thead className="border-b bg-gray-50 text-gray-600">
              <tr>
                <th className="p-4">Order</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Type</th>
                <th className="p-4">Total</th>
                <th className="p-4">Status</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Date</th>
              </tr>
            </thead>

            <tbody>
              {!sales?.orders?.length ? (
                <tr>
                  <td
                    colSpan="7"
                    className="p-8 text-center text-gray-500"
                  >
                    No orders recorded today.
                  </td>
                </tr>
              ) : (
                sales.orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b last:border-0"
                  >
                    <td className="p-4 font-semibold text-gray-800">
                      {order.orderCode || `#${order.id}`}
                    </td>

                    <td className="p-4 text-gray-600">
                      {order.customerName || "Guest"}
                    </td>

                    <td className="p-4 text-gray-600">
                      {order.orderType || "—"}
                    </td>

                    <td className="p-4 font-semibold text-gray-800">
                      {formatCurrency(order.total)}
                    </td>

                    <td className="p-4">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold capitalize text-blue-700">
                        {order.status}
                      </span>
                    </td>

                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          order.isPaid
                            ? "bg-green-50 text-green-700"
                            : "bg-yellow-50 text-yellow-700"
                        }`}
                      >
                        {order.isPaid ? "Paid" : "Unpaid"}
                      </span>
                    </td>

                    <td className="p-4 text-gray-600">
                      {formatDate(order.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          Sales are calculated from paid, non-cancelled orders
          created today.
        </p>
      </div>
    );
  }

  function renderMenu() {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-green-950">
          Today's Menu
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          View menu items, prices and availability.
        </p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[550px] text-left text-sm">
            <thead className="border-b bg-gray-50 text-gray-600">
              <tr>
                <th className="p-4">Item</th>
                <th className="p-4">Price</th>
                <th className="p-4">Availability</th>
              </tr>
            </thead>

            <tbody>
              {menuItems.length === 0 ? (
                <tr>
                  <td
                    colSpan="3"
                    className="p-8 text-center text-gray-500"
                  >
                    No menu items found.
                  </td>
                </tr>
              ) : (
                menuItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b last:border-0"
                  >
                    <td className="p-4 font-semibold text-gray-800">
                      {item.name || item.title || "Unnamed item"}
                    </td>

                    <td className="p-4 text-gray-700">
                      {formatCurrency(item.price)}
                    </td>

                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          item.is_available === false ||
                          item.isAvailable === false
                            ? "bg-red-50 text-red-700"
                            : "bg-green-50 text-green-700"
                        }`}
                      >
                        {item.is_available === false ||
                        item.isAvailable === false
                          ? "Unavailable"
                          : "Available"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderInvitations() {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-green-900">
          Staff Invitation Management
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          Generate invitation codes to allow new staff members
          to register for CST Cafe.
        </p>

        <form
          onSubmit={handleGenerateInvitation}
          className="mt-6 space-y-4"
        >
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Staff Email Address
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter staff email address"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
              required
            />
          </div>

          <button
            type="submit"
            disabled={generating}
            className="rounded-lg bg-green-800 px-6 py-3 font-semibold text-white hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating
              ? "Generating..."
              : "Generate Invitation Code"}
          </button>
        </form>

        {error && (
          <div className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-5 rounded-lg bg-green-50 p-4 text-sm text-green-800">
            {success}
          </div>
        )}

        {invitationCode && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5">
            <h3 className="font-semibold text-green-900">
              Staff Invitation Code
            </h3>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="rounded-lg border border-green-200 bg-white px-5 py-3 font-mono text-xl font-bold tracking-widest text-green-900">
                {invitationCode}
              </div>

              <button
                type="button"
                onClick={handleCopyCode}
                className="rounded-lg bg-green-800 px-5 py-3 text-sm font-semibold text-white hover:bg-green-900"
              >
                Copy Code
              </button>
            </div>

            <p className="mt-4 text-sm text-green-800">
              This invitation code expires in 15 minutes.
            </p>

            <p className="mt-1 text-xs text-gray-600">
              Share this code securely with the intended staff member.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f3f7f2]">
      <header className="flex flex-wrap items-center justify-between gap-4 bg-green-900 px-6 py-5 text-white md:px-10">
        <div>
          <h1 className="text-xl font-bold">CST Cafe Admin</h1>
          <p className="mt-1 text-xs text-green-200">
            Administration & Monitoring Panel
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold">{user.name}</p>
            <p className="text-xs text-green-200">{user.email}</p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-green-900 hover:bg-green-100"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1500px] flex-col md:flex-row">
        <aside className="w-full border-b border-green-100 bg-white p-4 md:min-h-[calc(100vh-76px)] md:w-64 md:border-b-0 md:border-r">
          <p className="mb-4 px-3 text-xs font-bold uppercase tracking-wider text-gray-400">
            Administration
          </p>

          <nav className="grid grid-cols-2 gap-2 md:flex md:flex-col">
            {navigation.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  setError("");
                  setSuccess("");
                  setDataError("");
                }}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold transition ${
                  activeSection === item.id
                    ? "bg-green-900 text-white"
                    : "text-gray-600 hover:bg-green-50 hover:text-green-900"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-8 hidden rounded-xl bg-green-50 p-4 md:block">
            <p className="text-sm font-bold text-green-900">
              Admin Account
            </p>

            <p className="mt-2 break-all text-xs text-green-800">
              {user.email}
            </p>

            <p className="mt-3 text-xs text-green-700">
              You have administrator access.
            </p>
          </div>
        </aside>

        <section className="min-w-0 flex-1 p-5 md:p-8">
          {dataError && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-700">
              <span>{dataError}</span>
              <button
                onClick={loadDashboardData}
                className="font-semibold underline"
              >
                Try again
              </button>
            </div>
          )}

          {success && activeSection !== "invitations" && (
            <div className="mb-5 rounded-lg bg-green-50 p-4 text-sm text-green-800">
              {success}
            </div>
          )}

          {dataLoading && (
            <p className="mb-4 text-sm text-green-800">
              Loading information...
            </p>
          )}

          {activeSection === "overview" && renderOverview()}
          {activeSection === "staff" && renderStaff()}
          {activeSection === "activity" && renderActivity()}
          {activeSection === "sales" && renderSales()}
          {activeSection === "menu" && renderMenu()}
          {activeSection === "invitations" && renderInvitations()}
        </section>
      </div>
    </main>
  );
}
