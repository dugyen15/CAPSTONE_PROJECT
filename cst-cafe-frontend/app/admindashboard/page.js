"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";
import { api, clearToken } from "@/lib/api";

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading } = useSession("admin");

  const [email, setEmail] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);

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
        body: {
          email: email.trim(),
        },
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading Admin Dashboard...
      </div>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-[#f3f7f2]">

      {/* Header */}
      <header className="flex items-center justify-between bg-green-900 px-8 py-5 text-white">
        <h1 className="text-xl font-bold">
          CST Cafe Admin
        </h1>

        <button
          onClick={handleLogout}
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-green-900 hover:bg-green-100"
        >
          Logout
        </button>
      </header>

      {/* Dashboard Content */}
      <section className="mx-auto max-w-5xl p-8">

        <h2 className="text-2xl font-bold text-green-950">
          Welcome, {user.name}!
        </h2>

        <p className="mt-2 text-gray-600">
          Welcome to the CST Cafe Administration Dashboard.
        </p>

        {/* Admin Information */}
        <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-green-900">
            Admin Dashboard
          </h3>

          <p className="mt-2 text-gray-600">
            Your administrator account is successfully connected.
          </p>

          <p className="mt-3 text-sm text-gray-500">
            Admin email: {user.email}
          </p>
        </div>

        {/* Staff Invitation Generator */}
        <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">

          <h3 className="text-xl font-bold text-green-900">
            Staff Invitation Management
          </h3>

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

          {/* Error Message */}
          {error && (
            <div className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mt-5 rounded-lg bg-green-50 p-4 text-sm text-green-800">
              {success}
            </div>
          )}

          {/* Generated Code */}
          {invitationCode && (
            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5">

              <h4 className="font-semibold text-green-900">
                Staff Invitation Code
              </h4>

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

      </section>
    </main>
  );
}