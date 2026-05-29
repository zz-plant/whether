"use client";

import { useState } from "react";

export function V2SubscribeForm() {
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

  return (
    <div className="weather-card bg-slate-900/60 backdrop-blur border border-white/10 p-4 sm:p-6 rounded-none space-y-4">
      <div>
        <h3 className="text-fluid-xs font-semibold text-white/90 tracking-wide">Weekly Posture Alerts</h3>
        <p className="text-fluid-micro text-white/50 mt-1">Get the US Macro Operating Posture briefing in your inbox every Sunday morning.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          placeholder="your@email.com"
          disabled={status === "loading"}
          className="flex-1 px-3 py-2 text-xs bg-black/40 border border-white/10 text-white rounded-none focus:outline-none focus:border-sky-500/50 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-4 py-2 text-xs font-medium bg-sky-500 hover:bg-sky-600 text-slate-950 transition-colors rounded-none disabled:opacity-50"
        >
          {status === "loading" ? "Subscribing..." : "Subscribe"}
        </button>
      </form>

      {message && (
        <p className={`text-fluid-micro ${status === "success" ? "text-emerald-400" : "text-rose-400"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
