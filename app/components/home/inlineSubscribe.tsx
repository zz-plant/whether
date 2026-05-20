"use client";

import { useState } from "react";
import { getSubscriberStore } from "../../../lib/email/subscriberStore";

export function InlineSubscribe() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  return (
    <div className="flex items-center gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="weather-input min-h-[44px] w-52 rounded-md px-3 py-2 text-xs"
      />
      <button
        type="button"
        onClick={async () => {
          if (!email || !email.includes("@")) { setMsg("Enter a valid email."); return; }
          try {
            await getSubscriberStore().subscribe(email);
            setMsg("Subscribed!");
          } catch {
            setMsg("Try again.");
          }
          setTimeout(() => setMsg(""), 3000);
        }}
        className="weather-button-primary min-h-[44px] rounded-md px-4 py-2 text-xs font-semibold"
      >
        Subscribe
      </button>
      {msg ? <span className="text-fluid-micro text-emerald-200">{msg}</span> : null}
    </div>
  );
}
