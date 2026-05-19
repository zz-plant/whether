"use client";

import { useState } from "react";

export function StayInTheLoop() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [showSlack, setShowSlack] = useState(false);

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
    <div className="weather-card space-y-2">
      <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-500">Stay in the loop</p>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <span className="text-fluid-micro text-slate-300">✉</span>
          {subscribed ? (
            <span className="text-fluid-micro text-emerald-200">Weekly email ✓</span>
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-32 rounded-md border border-slate-700/70 bg-slate-900/70 px-2 py-1 text-xs text-slate-100 placeholder-slate-500 focus:border-sky-400/60 focus:outline-none"
                aria-label="Email address"
              />
              <button
                type="button"
                onClick={handleSubscribe}
                className="rounded-md bg-sky-500/15 border border-sky-400/30 px-2 py-1 text-fluid-micro font-medium text-sky-200 hover:bg-sky-500/25 transition-colors"
              >
                Subscribe
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowSlack(!showSlack)}
          className="flex items-center gap-2 text-left text-fluid-micro text-slate-500 hover:text-sky-200 transition-colors"
        >
          <span className="text-slate-300">#</span>
          {showSlack ? "Slack — enter webhook URL above" : "+ Slack — post briefs to your team"}
        </button>

        <button
          type="button"
          onClick={() => window.open("/settings", "_blank")}
          className="flex items-center gap-2 text-left text-fluid-micro text-slate-500 hover:text-amber-200 transition-colors"
        >
          <span className="text-slate-300">⚡</span>
          + Regime alerts — notified when conditions shift
        </button>

        <button
          type="button"
          onClick={() => {
            document.documentElement.dataset.displayMode = "tv";
            localStorage.setItem("whether-display-mode", "tv");
          }}
          className="flex items-center gap-2 text-left text-fluid-micro text-slate-500 hover:text-sky-200 transition-colors"
        >
          <span className="text-slate-300">📺</span>
          + TV mode — always-on office display
        </button>
      </div>

      {showSlack ? (
        <div className="flex items-center gap-1.5 pt-1">
          <input
            type="text"
            placeholder="Slack webhook URL"
            className="w-48 rounded-md border border-slate-700/70 bg-slate-900/70 px-2 py-1 text-xs text-slate-100 placeholder-slate-500 focus:border-sky-400/60 focus:outline-none"
            aria-label="Slack webhook URL"
          />
          <button
            type="button"
            className="rounded-md bg-sky-500/15 border border-sky-400/30 px-2 py-1 text-fluid-micro font-medium text-sky-200 hover:bg-sky-500/25 transition-colors"
          >
            Connect
          </button>
        </div>
      ) : null}

      <p className="text-fluid-micro text-slate-600">
        <a href="/api-docs" className="hover:text-sky-400 underline decoration-slate-700 hover:decoration-sky-400">Slack API</a>
        {" · "}
        <a href="/embed" className="hover:text-sky-400 underline decoration-slate-700 hover:decoration-sky-400">Embed</a>
        {" · "}
        <a href="/feed.xml" className="hover:text-sky-400 underline decoration-slate-700 hover:decoration-sky-400">RSS</a>
        {" →"}
      </p>
    </div>
  );
}
