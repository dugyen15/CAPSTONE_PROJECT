"use client";

import { useState } from "react";
import Link from "next/link";
import { mockStaffUser } from "@/lib/mock-data";

const roles = ["Barista", "Cashier", "Kitchen", "Manager"];

export default function StaffProfilePage() {
  const [form, setForm] = useState({
    name: mockStaffUser.name,
    email: mockStaffUser.email,
    role: mockStaffUser.role,
  });
  const [saved, setSaved] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setSaved(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    // TODO: send this to a real staff-profile endpoint once the backend
    // exists — for now it just confirms the change locally.
    setSaved(true);
  }

  const initials = form.name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <Link href="/staff" className="text-sm text-muted hover:text-foreground">
        ← Back to dashboard
      </Link>

      <div className="mt-4 flex items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-pine text-lg font-medium text-paper">
          {initials}
        </span>
        <div>
          <h1 className="font-display text-2xl text-pine">Your profile</h1>
          <p className="text-sm text-muted">Staff since {mockStaffUser.staffSince}</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-6"
      >
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
            Full name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            className="w-full rounded-lg border border-border bg-paper px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-pine/40"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
            Staff email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className="w-full rounded-lg border border-border bg-paper px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-pine/40"
          />
        </div>
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-foreground mb-1">
            Role
          </label>
          <select
            id="role"
            name="role"
            value={form.role}
            onChange={handleChange}
            className="w-full rounded-lg border border-border bg-paper px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-pine/40"
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="rounded-full bg-pine px-5 py-2 text-sm text-paper hover:bg-pine/90 transition-colors"
          >
            Save changes
          </button>
          {saved && <span className="text-sm text-ready">Saved</span>}
        </div>
      </form>
    </main>
  );
}