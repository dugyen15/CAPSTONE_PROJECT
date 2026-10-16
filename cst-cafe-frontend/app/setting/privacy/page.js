"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const initialSettings = [
  { key: "orderHistory", label: "Share my order history to help improve the menu", enabled: true },
  { key: "emailUpdates", label: "Email me updates about my order status", enabled: true },
  { key: "recommendations", label: "Show me personalized menu recommendations", enabled: false },
];

export default function PrivacySettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);

  function toggle(key) {
    // TODO: persist this to a real account/privacy-settings endpoint once
    // the backend exists — this only updates local UI state for now.
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s))
    );
  }

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <button
        onClick={() => router.back()}
        className="text-sm text-muted hover:text-foreground"
      >
        ← Back
      </button>

      <h1 className="mt-3 font-display text-2xl text-pine">Privacy settings</h1>
      <p className="mt-1 text-sm text-muted">
        Control what CST Cafe shares and uses from your account. These are
        placeholder controls for now — nothing is sent anywhere yet.
      </p>

      <div className="mt-6 space-y-2">
        {settings.map((s) => (
          <div
            key={s.key}
            className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3"
          >
            <span className="text-sm text-foreground">{s.label}</span>
            <button
              onClick={() => toggle(s.key)}
              aria-pressed={s.enabled}
              className={`flex h-6 w-11 flex-none items-center rounded-full p-0.5 transition-colors ${
                s.enabled ? "bg-pine justify-end" : "bg-border justify-start"
              }`}
            >
              <span className="h-5 w-5 rounded-full bg-white shadow" />
            </button>
          </div>
        ))}

        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3 opacity-70">
          <span className="text-sm text-foreground">
            Feedback is always anonymous — no name is ever attached
          </span>
          <button
            disabled
            aria-pressed="true"
            className="flex h-6 w-11 flex-none items-center justify-end rounded-full bg-pine p-0.5 cursor-not-allowed"
          >
            <span className="h-5 w-5 rounded-full bg-white shadow" />
          </button>
        </div>
      </div>
    </main>
  );
}