"use client";

import { useState } from "react";
import CustomerNav from "@/components/CustomerNav";
import { tables, timeSlots } from "@/lib/mock-data";

export default function BookingPage() {
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [customTime, setCustomTime] = useState("");
  const [useCustomTime, setUseCustomTime] = useState(false);

  const [partySize, setPartySize] = useState(2);
  const [useCustomPartySize, setUseCustomPartySize] = useState(false);
  const [customPartySize, setCustomPartySize] = useState("");

  const [confirmed, setConfirmed] = useState(false);

  const canBook = selectedTable && selectedTime;

  function handleConfirm() {
    if (!canBook) return;
    setConfirmed(true);
  }

  // -----------------------------
  // PARTY SIZE
  // -----------------------------

  function handlePartySizeClick(size) {
    setUseCustomPartySize(false);
    setCustomPartySize("");
    setPartySize(size);

    // Clear selected table if it cannot fit the new party size
    const selected = tables.find((table) => table.id === selectedTable);

    if (selected && selected.seats < size) {
      setSelectedTable(null);
    }
  }

  function handleCustomPartySizeToggle() {
    setUseCustomPartySize(true);

    if (customPartySize) {
      const size = Number(customPartySize);
      setPartySize(size);

      const selected = tables.find((table) => table.id === selectedTable);

      if (selected && selected.seats < size) {
        setSelectedTable(null);
      }
    }
  }

  function handleCustomPartySizeChange(e) {
    const value = e.target.value;

    setCustomPartySize(value);

    if (value === "") {
      setPartySize(0);
      setSelectedTable(null);
      return;
    }

    const size = Number(value);

    // Maximum party size
    if (size > 20) return;

    setPartySize(size);

    // Clear selected table if it cannot fit
    const selected = tables.find((table) => table.id === selectedTable);

    if (selected && selected.seats < size) {
      setSelectedTable(null);
    }
  }

  // -----------------------------
  // TIME
  // -----------------------------

  function handlePresetClick(slot) {
    setUseCustomTime(false);
    setSelectedTime(slot);
  }

  function handleCustomToggle() {
    setUseCustomTime(true);
    setSelectedTime(customTime || null);
  }

  function handleCustomTimeChange(e) {
    const value = e.target.value;

    setCustomTime(value);
    setSelectedTime(value ? formatTime(value) : null);
  }

  function formatTime(value) {
    const [hourStr, minute] = value.split(":");

    let hour = parseInt(hourStr, 10);

    const suffix = hour >= 12 ? "PM" : "AM";

    hour = hour % 12 || 12;

    return `${hour}:${minute} ${suffix}`;
  }

  // -----------------------------
  // RESET
  // -----------------------------

  function resetBookingState() {
    setConfirmed(false);
    setSelectedTable(null);
    setSelectedTime(null);

    setUseCustomTime(false);
    setCustomTime("");

    setPartySize(2);
    setUseCustomPartySize(false);
    setCustomPartySize("");
  }

  // -----------------------------
  // CONFIRMED STATE
  // -----------------------------

  if (confirmed) {
    const table = tables.find((t) => t.id === selectedTable);

    return (
      <>
        <CustomerNav />

        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-sm uppercase tracking-wide text-amber">
            Booking confirmed
          </p>

          <h1 className="mt-2 font-display text-3xl text-pine">
            You&apos;re booked for {selectedTime}
          </h1>

          <p className="mt-3 text-muted">
            {table.label}
            {table.nearWindow ? " (near window)" : ""} · {partySize}{" "}
            {partySize === 1 ? "guest" : "guests"}
          </p>

          <p className="mt-6 max-w-sm text-sm text-muted">
            We&apos;ll notify you when your table is ready. Head to the Menu
            tab to pre-order your food so it&apos;s ready when you arrive.
          </p>

          <div className="mt-8">
            <button
              onClick={resetBookingState}
              className="rounded-full border border-border px-5 py-2 text-sm hover:border-pine/40"
            >
              Make another booking
            </button>
          </div>
        </main>
      </>
    );
  }

  // -----------------------------
  // BOOKING FORM
  // -----------------------------

  return (
    <>
      <CustomerNav />

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <h1 className="font-display text-3xl text-pine">
          Book a table
        </h1>

        <p className="mt-2 text-muted">
          Reserve a table and a pickup time so you don&apos;t have to wait in
          line during peak hours.
        </p>

        {/* PARTY SIZE */}
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-medium text-foreground">
            Party size
          </h2>

          <div className="flex flex-wrap gap-2">
            {/* 1 - 6 guests */}
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                onClick={() => handlePartySizeClick(n)}
                className={`h-10 w-10 rounded-full border text-sm ${
                  !useCustomPartySize && partySize === n
                    ? "border-pine bg-pine text-paper"
                    : "border-border hover:border-pine/40"
                }`}
              >
                {n}
              </button>
            ))}

            {/* CUSTOM */}
            <button
              onClick={handleCustomPartySizeToggle}
              className={`rounded-full border px-4 py-2 text-sm ${
                useCustomPartySize
                  ? "border-pine bg-pine text-paper"
                  : "border-border hover:border-pine/40"
              }`}
            >
              Custom
            </button>
          </div>

          {/* CUSTOM PARTY SIZE INPUT */}
          {useCustomPartySize && (
            <div className="mt-4">
              <label className="text-sm text-muted">
                Enter number of guests
              </label>

              <div className="mt-2 flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={customPartySize}
                  onChange={handleCustomPartySizeChange}
                  placeholder="e.g. 8"
                  className="w-32 rounded-lg border border-border px-3 py-2 text-sm focus:border-pine/60 focus:outline-none"
                />

                {partySize > 0 && (
                  <span className="text-sm text-muted">
                    {partySize}{" "}
                    {partySize === 1 ? "guest" : "guests"}
                  </span>
                )}
              </div>

              <p className="mt-2 text-xs text-muted">
                You can enter up to 20 guests.
              </p>
            </div>
          )}
        </div>

        {/* AVAILABLE TABLES */}
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-medium text-foreground">
            Available tables
          </h2>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {tables
              .filter((t) => t.seats >= partySize)
              .map((table) => (
                <button
                  key={table.id}
                  onClick={() => setSelectedTable(table.id)}
                  className={`rounded-xl border p-4 text-left ${
                    selectedTable === table.id
                      ? "border-pine bg-pine/5"
                      : "border-border hover:border-pine/40"
                  }`}
                >
                  <p className="font-medium">{table.label}</p>

                  <p className="text-sm text-muted">
                    Seats {table.seats}
                  </p>

                  {table.nearWindow && (
                    <span className="mt-1.5 inline-block rounded-full bg-amber/15 px-2 py-0.5 text-xs text-amber">
                      Near window
                    </span>
                  )}
                </button>
              ))}
          </div>

          {/* NO TABLE MESSAGE */}
          {partySize > 0 &&
            tables.filter((t) => t.seats >= partySize).length === 0 && (
              <p className="mt-4 rounded-lg bg-amber/10 p-3 text-sm text-muted">
                Sorry, there are currently no tables available for{" "}
                {partySize} guests.
              </p>
            )}
        </div>

        {/* TIME */}
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-medium text-foreground">
            Pickup / arrival time
          </h2>

          <div className="flex flex-wrap gap-2">
            {timeSlots.map((slot) => (
              <button
                key={slot}
                onClick={() => handlePresetClick(slot)}
                className={`rounded-full border px-4 py-1.5 text-sm ${
                  !useCustomTime && selectedTime === slot
                    ? "border-pine bg-pine text-paper"
                    : "border-border hover:border-pine/40"
                }`}
              >
                {slot}
              </button>
            ))}

            <button
              onClick={handleCustomToggle}
              className={`rounded-full border px-4 py-1.5 text-sm ${
                useCustomTime
                  ? "border-pine bg-pine text-paper"
                  : "border-border hover:border-pine/40"
              }`}
            >
              Custom time
            </button>
          </div>

          {useCustomTime && (
            <div className="mt-3 flex items-center gap-3">
              <input
                type="time"
                value={customTime}
                onChange={handleCustomTimeChange}
                className="rounded-lg border border-border px-3 py-2 text-sm focus:border-pine/60 focus:outline-none"
              />

              {selectedTime && (
                <span className="text-sm text-muted">
                  Selected: {selectedTime}
                </span>
              )}
            </div>
          )}
        </div>

        {/* CONFIRM */}
        <button
          onClick={handleConfirm}
          disabled={!canBook || partySize < 1}
          className="mt-10 w-full rounded-full bg-amber py-3 text-paper transition-colors hover:bg-amber-light disabled:cursor-not-allowed disabled:opacity-40"
        >
          Confirm booking
        </button>
      </main>
    </>
  );
}