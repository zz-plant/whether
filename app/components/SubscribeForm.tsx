"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Check, Calendar } from "lucide-react";
import { requestSubscription } from "./subscribeRequest";
import { trackActivationEvent } from "../../lib/activationFunnel";
import { buildMondayCalendarUrl } from "./calendarButton";

/**
 * One subscription, one promise: Monday's call, and a note the day it changes.
 *
 * The between-Monday alert used to be a second stream behind an unchecked box
 * under the form, which sat 3,400px down the page — the single most useful
 * proactive thing the product can do, gated behind scrolling, subscribing, and
 * noticing a checkbox. It is now part of what the form says it does, consented
 * to once, and every email still carries an unsubscribe link.
 *
 * `compact` is the inline row under the hero; the default is the fuller block
 * that /share and /brief/[week] mount for a recipient arriving from a link.
 */
export function SubscribeForm({ compact = false }: { compact?: boolean } = {}) {
  // The form is mounted on /, /share and /brief/[week]; attribute the conversion
  // to the route it happened on rather than crediting every one to the homepage.
  const pathname = usePathname() ?? "/";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  // Built from the clock, so it cannot be server-rendered without a hydration
  // mismatch; the link resolves after mount and is inert until then.
  const [calendarHref, setCalendarHref] = useState("#");
  useEffect(() => {
    setCalendarHref(buildMondayCalendarUrl(
      "Whether Weekly Posture Sync",
      "Review weekly macro regime & posture delta: https://whether.work",
    ));
  }, []);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    const result = await requestSubscription(email, { alerts: true });
    setStatus(result.ok ? "success" : "error");
    setMessage(result.message);
    if (result.ok) {
      setEmail("");
      trackActivationEvent({ step: "committed", path: pathname, commitment: "subscribed" });
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
    <div className={compact ? "space-y-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3" : "weather-section-border space-y-3"}>
      <div>
        <p className="text-fluid-sm font-medium text-white">Get the call every Monday, and a note the day it changes</p>
        {compact ? null : (
          <p className="text-fluid-xs text-white/60 mt-0.5">
            Monday morning: the regime, the one action it calls for, and a link to the evidence behind it.
            Between Mondays, one email if the call flips. Every email carries an unsubscribe link.
          </p>
        )}
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

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.06] text-fluid-nano text-slate-400">
        <span>{compact ? "One email a week, one more if the call flips. Unsubscribe in one click." : "Prefer calendar holds over email?"}</span>
        <a
          href={calendarHref}
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
