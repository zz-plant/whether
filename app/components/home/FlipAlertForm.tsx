"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Check } from "lucide-react";
import { requestSubscription } from "../subscribeRequest";
import { trackActivationEvent } from "../../../lib/activationFunnel";

/**
 * "Tell me when this changes": the alerts-only subscription, placed beside the
 * condition it watches.
 *
 * The Monday subscription sits at the foot of the brief and asks for a weekly
 * email. A first-time reader who has just read "Funding pressure falls to or
 * below 70 (83 today), which flips the call" wants something narrower and far
 * easier to say yes to: one email, the day that sentence comes true. So this
 * asks for exactly that and nothing more — `weekly: false` — and says so on the
 * button, because a form that quietly enrolls someone in a second mail stream
 * is the one thing that would make the next form on this site harder to fill.
 *
 * What an alert covers is what the alert fan-out sends (`lib/alert/*`): the
 * guidance changing, a score crossing its line, an outsized move, and a
 * month-end note only when the reading moved. None of those arrive on a
 * schedule, which is the promise the copy makes.
 */
export function FlipAlertForm({ condition }: { condition?: string }) {
  const pathname = usePathname() ?? "/";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("loading");
    const result = await requestSubscription(email, { alerts: true, weekly: false });
    setStatus(result.ok ? "success" : "error");
    setMessage(result.message);
    if (result.ok) {
      setEmail("");
      trackActivationEvent({ step: "committed", path: pathname, commitment: "subscribed" });
    }
  };

  if (status === "success") {
    return (
      <output
        className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-fluid-xs text-emerald-200"
      >
        <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{message} After that, you hear from us only when something moves.</span>
      </output>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby="flip-alert-heading"
      data-testid="flip-alert-form"
      className="space-y-2 rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] px-4 py-3"
    >
      <p id="flip-alert-heading" className="text-fluid-sm font-medium text-white">
        Tell me when this changes
      </p>
      <p className="max-w-[64ch] text-fluid-xs text-slate-400">
        {condition ? <>Next change to watch: {condition} </> : null}
        One email on the day the guidance changes, a score crosses one of its lines, or a market input makes
        an outsized move. No weekly newsletter.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="flip-alert-email" className="sr-only">Email address</label>
        <input
          id="flip-alert-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (status === "error") setStatus("idle");
          }}
          placeholder="you@company.com"
          disabled={status === "loading"}
          aria-invalid={status === "error" ? true : undefined}
          aria-describedby={message ? "flip-alert-message" : undefined}
          className="min-h-11 flex-1 rounded-lg border border-[color:var(--border-strong)] bg-[var(--bg-nested)] px-3 py-2 text-base sm:text-xs text-slate-100 transition-colors placeholder:text-slate-500 disabled:opacity-50 weather-focus-ring"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="weather-button-primary min-h-11 px-4 py-2 text-xs disabled:opacity-50 weather-focus-ring weather-press-scale"
        >
          {status === "loading" ? "Sending…" : "Email me when it changes"}
        </button>
      </div>
      {message ? (
        <p id="flip-alert-message" aria-live="polite" className="text-fluid-micro text-rose-400">
          {message}
        </p>
      ) : null}
    </form>
  );
}
