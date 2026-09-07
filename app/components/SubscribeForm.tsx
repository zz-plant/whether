"use client";

import { useState } from "react";
import { Check, Calendar } from "lucide-react";
import { requestSubscription } from "./subscribeRequest";
import { trackActivationEvent } from "../../lib/activationFunnel";
import { buildMondayCalendarUrl } from "./calendarButton";

export function SubscribeForm() {
  const [email, setEmail] = useState("");
  // Default off. Alert mail is a second stream, and the person opting in is the only
  // one who can consent to it — the alerts panel used to "record" a channel against a
  // random device id that the delivery path could never resolve to an inbox.
  const [alerts, setAlerts] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    const result = await requestSubscription(email, { alerts });
    setStatus(result.ok ? "success" : "error");
    setMessage(result.message);
    if (result.ok) {
      setEmail("");
      trackActivationEvent({ step: "committed", path: "/", commitment: "subscribed" });
    }
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

      <label className="flex cursor-pointer items-start gap-2 text-fluid-xs text-white/60">
        <input
          type="checkbox"
          checked={alerts}
          onChange={(e) => setAlerts(e.target.checked)}
          disabled={status === "loading"}
          className="mt-0.5 size-4 shrink-0 accent-sky-400"
        />
        <span>
          Also email me when the regime changes between Mondays. Off by default; every
          email carries an unsubscribe link.
        </span>
      </label>

      {message && (
        <p id="subscribe-message" aria-live="polite" className="text-fluid-micro text-rose-400">
          {message}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.06] text-fluid-nano text-slate-400">
        <span>Prefer calendar holds over email?</span>
        <a
          href={buildMondayCalendarUrl(
            "Whether Weekly Posture Sync",
            "Review weekly macro regime & posture delta: https://whether.work",
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-medium text-sky-400 hover:text-sky-300 transition-colors"
        >
          <Calendar className="size-3" aria-hidden="true" />
          <span>Add Monday Calendar Hold (9:00 AM)</span>
        </a>
      </div>
    </div>
  );
}
