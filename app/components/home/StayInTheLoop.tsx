"use client";

import { useState } from "react";

export function StayInTheLoop() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async () => {
    if (!email.includes("@")) return;
    try {
      await fetch("/api/email/send-weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: "subscribe" }),
      });
      setSubscribed(true);
    } catch {
      // silently fail — non-critical
    }
  };

  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-950/40 px-4 py-3 space-y-2">
      <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-500">Stay in the loop</p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-48 rounded-md border border-slate-700/70 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-sky-400/60 focus:outline-none"
          aria-label="Email address"
        />
        <button
          type="button"
          onClick={handleSubscribe}
          className="rounded-full bg-sky-500/15 border border-sky-400/30 px-3 py-1.5 text-fluid-micro font-medium text-sky-200 hover:bg-sky-500/25 transition-colors"
        >
          {subscribed ? "Subscribed ✓" : "Weekly email"}
        </button>
        <a
          href="/api/brief/slack"
          className="rounded-full border border-slate-700/70 px-3 py-1.5 text-fluid-micro font-medium text-slate-400 hover:border-sky-500/40 hover:text-sky-200 transition-colors no-underline"
        >
          Slack
        </a>
        <span className="rounded-full border border-slate-700/70 px-3 py-1.5 text-fluid-micro font-medium text-slate-500">
          Calendar
        </span>
        <span className="rounded-full border border-slate-700/70 px-3 py-1.5 text-fluid-micro font-medium text-slate-500">
          Regime alerts
        </span>
      </div>

      <p className="text-fluid-micro text-slate-500">
        Monday brief + alerts when conditions shift.{" "}
        <a href="/api-docs" className="text-sky-400 hover:text-sky-300 underline decoration-slate-600 hover:decoration-sky-400">
          Slack &amp; API →
        </a>
      </p>
    </div>
  );
}
