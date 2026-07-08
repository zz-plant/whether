"use client";

import { useState } from "react";
import { Check } from "lucide-react";

export function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/email/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setStatus("success");
        setMessage("Check your email to verify your subscription.");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to subscribe. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("A network error occurred. Please try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="weather-card flex flex-col items-center justify-center py-6 text-center space-y-2">
        <span className="inline-flex items-center justify-center rounded-full bg-emerald-500/10 p-2 text-emerald-400">
          <Check className="size-5" aria-hidden="true" />
        </span>
        <p className="text-fluid-xs font-semibold text-white">Subscribed!</p>
        <p className="text-fluid-micro text-white/60">{message}</p>
      </div>
    );
  }

  return (
    <div className="weather-card space-y-3">
      <div>
        <p className="text-fluid-xs font-semibold tracking-[0.04em] text-white/70">Get the weekly brief</p>
        <p className="text-fluid-micro text-white/60 mt-1">Weekly operating call + evidence, every Monday.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="subscribe-email" className="sr-only">Email address</label>
        <input
          id="subscribe-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          placeholder="e.g. you@company.com…"
          disabled={status === "loading"}
          aria-invalid={status === "error" ? true : undefined}
          aria-describedby={message ? "subscribe-message" : undefined}
          className="min-h-11 flex-1 rounded-lg border border-white/[0.08] bg-[var(--bg-nested)] px-3 py-2 text-base sm:text-xs text-white/85 transition-colors placeholder:text-white/25 disabled:opacity-50 focus-visible:border-sky-400/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="min-h-11 rounded-lg bg-sky-400 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-300 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
        >
          {status === "loading" ? "Subscribing…" : "Subscribe"}
        </button>
      </form>

      {message && (
        <p id="subscribe-message" aria-live="polite" className="text-fluid-micro text-rose-400">
          {message}
        </p>
      )}
    </div>
  );
}
