"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useSession } from "@/lib/useSession";
import { initialsOf } from "@/lib/format";

export default function StaffProfilePage() {
  const { user, setUser, loading } = useSession("staff");
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setName(user.name || "");
  }, [user]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const updated = await api("/staff/auth/me", {
        method: "PATCH",
        role: "staff",
        body: { name },
      });
      setUser((prev) => ({ ...prev, ...updated }));
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const initials = initialsOf(name);

  if (loading || !user) {
    return (
      <main className="mx-auto w-full max-w-lg flex-1 px-6 py-10 text-sm text-muted">
        Loading your profile...
      </main>
    );
  }

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
          <p className="text-sm text-muted">CST Cafe staff</p>
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
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
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
            value={user.email}
            readOnly
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted"
          />
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-pine px-5 py-2 text-sm text-paper hover:bg-pine/90 transition-colors disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
          {saved && <span className="text-sm text-ready">Saved</span>}
          {error && <span className="text-sm text-delayed">{error}</span>}
        </div>
      </form>
    </main>
  );
}