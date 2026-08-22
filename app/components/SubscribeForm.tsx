"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { requestSubscription } from "./subscribeRequest";

export function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    const result = await requestSubscription(email);
    setStatus(result.ok ? "success" : "error");
    setMessage(result.message);
    if (result.ok) setEmail("");
  };

  if (status === "success") {
    return (
      <div className="weather-section-border flex flex-col items-center justify-center py-6 text-center space-y-2">
        <span className="inline-flex items-center justify-center rounded-full bg-emerald-500/10 p-2 text-emerald-400">
          <Check className="size-5" aria-hidden="true" />
        </span>
        <p className="text-fluid-xs font-semibold text-white">Subscribed!</p>
        <p className="text-fluid-micro text-white/60">{message}</p>
      </div>
    );
  }

  return (
    <div className="weather-section-border space-y-3">
      <div>
        <p className="text-fluid-sm font-medium text-white">Get the weekly brief</p>
        <p className="text-fluid-xs text-white/60 mt-0.5">
          Monday morning: the regime, the one action it calls for, and a link to the evidence behind it.
        </p>
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
          className="min-h-11 flex-1 rounded-lg border border-white/[0.08] bg-[var(--bg-nested)] px-3 py-2 text-base sm:text-xs text-white/85 transition-colors placeholder:text-white/25 disabled:opacity-50 weather-focus-ring weather-press-scale"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="weather-button-primary min-h-11 px-4 py-2 text-xs disabled:opacity-50 weather-focus-ring weather-press-scale"
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
