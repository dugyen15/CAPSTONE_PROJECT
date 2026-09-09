"use client";

import { useState } from "react";
import CustomerNav from "@/components/CustomerNav";

export default function FeedbackPage() {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (rating === 0) return;
    // In a real app, this would call an API to save the feedback privately —
    // it's never shown publicly, only visible to CST Cafe staff.
    // e.g. await fetch("/api/feedback", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ rating, comment }),
    // });
    console.log("feedback submitted (placeholder):", { rating, comment });
    setSubmitted(true);
  }

  function resetForm() {
    setRating(0);
    setHoverRating(0);
    setComment("");
    setSubmitted(false);
  }

  return (
    <>
      <CustomerNav />
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-10">
        <h1 className="font-display text-3xl text-pine">Review &amp; Feedback</h1>
        <p className="mt-2 text-muted">
          Tell us how we&apos;re doing. This is entirely optional and only
          visible to CST Cafe staff — it&apos;s never posted publicly.
        </p>

        {submitted ? (
          <div className="mt-8 rounded-2xl border border-pine/30 bg-pine/5 p-6 text-center">
            <p className="text-sm font-medium text-pine">
              Thanks for your feedback!
            </p>
            <p className="mt-1 text-sm text-muted">
              We appreciate you taking the time to let us know.
            </p>
            <button
              onClick={resetForm}
              className="mt-4 rounded-full border border-border px-4 py-1.5 text-sm hover:border-pine/40"
            >
              Leave more feedback
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-8 rounded-2xl border border-border bg-card p-6"
          >
            <p className="text-sm font-medium text-foreground">
              How would you rate your overall experience?
            </p>
            <div className="mt-3 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(n)}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  className="text-2xl leading-none"
                >
                  <span
                    className={
                      n <= (hoverRating || rating) ? "text-amber" : "text-border"
                    }
                  >
                    ★
                  </span>
                </button>
              ))}
            </div>

            <label className="mt-5 block text-sm font-medium text-foreground">
              Comments (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Anything you'd like to tell us?"
              rows={4}
              className="mt-2 w-full rounded-lg border border-border bg-paper px-3 py-2 text-sm focus:border-pine/60 focus:outline-none"
            />

            <button
              type="submit"
              disabled={rating === 0}
              className="mt-5 w-full rounded-full bg-pine py-2.5 text-sm text-paper transition-colors hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Submit feedback
            </button>
            {rating === 0 && (
              <p className="mt-2 text-center text-xs text-muted">
                Select a star rating to submit.
              </p>
            )}
          </form>
        )}
      </main>
    </>
  );
}