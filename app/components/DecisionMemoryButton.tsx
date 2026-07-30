"use client";

import { useState } from "react";
import { Bookmark, CheckCircle } from "lucide-react";

export type DecisionMemoryButtonProps = {
  regime: string;
  tightness?: number;
  riskAppetite?: number;
  primaryCall?: string;
  className?: string;
};

export function DecisionMemoryButton({
  regime,
  tightness,
  riskAppetite,
  primaryCall,
  className = "",
}: DecisionMemoryButtonProps) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saved || saving) return;
    setSaving(true);
    try {
      const payload = {
        id: `mem-${Date.now()}`,
        timestamp: new Date().toISOString(),
        regime,
        tightness,
        riskAppetite,
        primaryCall,
      };

      // Persist to localStorage decision memory array
      const existingStr = localStorage.getItem("whether_decision_memory");
      const existing = existingStr ? JSON.parse(existingStr) : [];
      existing.unshift(payload);
      localStorage.setItem("whether_decision_memory", JSON.stringify(existing.slice(0, 50)));

      // Call API endpoint asynchronously if present
      fetch("/api/decision-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => null);

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // Fallback grace
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={saving}
      className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-fluid-nano font-medium text-white/70 hover:bg-white/[0.08] hover:text-white transition-all active:scale-[0.97] disabled:opacity-50 ${className}`}
      aria-label="Log decision to memory"
    >
      {saved ? (
        <>
          <CheckCircle size={13} className="text-emerald-400" />
          <span className="text-emerald-300 font-semibold">Logged to Memory</span>
        </>
      ) : (
        <>
          <Bookmark size={13} className="text-sky-400" />
          <span>{saving ? "Logging..." : "Log to Memory"}</span>
        </>
      )}
    </button>
  );
}
