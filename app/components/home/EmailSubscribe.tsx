"use client";

import { useState } from "react";

export function EmailSubscribe() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "subscribing" | "done" | "error">("idle");

  const handleSubscribe = async () => {
    if (!email.includes("@")) return;
    setStatus("subscribing");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <p className="text-fluid-xs text-emerald-200">
        Subscribed. You&rsquo;ll receive the weekly brief every Monday.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600"
      />
      <button
        type="button"
        onClick={handleSubscribe}
        disabled={status === "subscribing"}
        className="rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-500/20 disabled:opacity-50"
      >
        {status === "subscribing" ? "…" : "Subscribe"}
      </button>
      {status === "error" ? (
        <span className="text-fluid-micro text-rose-300">Try again</span>
      ) : null}
    </div>
  );
}
