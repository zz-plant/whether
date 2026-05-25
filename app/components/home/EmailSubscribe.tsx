"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function EmailSubscribe() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "subscribing" | "done" | "error">("idle");

  const handleSubscribe = async () => {
    if (!email.includes("@")) return;
    setStatus("subscribing");
    try {
      const res = await fetch("/api/email/subscribe", {
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
      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.08em] text-amber-300 flex-shrink-0">Preview</span>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600"
      />
      <Button
        onClick={handleSubscribe}
        disabled={status === "subscribing"}
        variant="default"
        size="sm"
      >
        {status === "subscribing" ? "…" : "Subscribe"}
      </Button>
      {status === "error" ? (
        <span className="text-fluid-micro text-rose-300">Try again</span>
      ) : null}
    </div>
  );
}
