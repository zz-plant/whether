"use client";

import { useState } from "react";
import { Bookmark, CheckCircle, AlertCircle } from "lucide-react";
import { usePersistentClientId } from "./clientIdentity";
import type { DecisionMemoryEntry } from "../../lib/decisionMemory";

export type DecisionMemoryButtonProps = {
  regime: string;
  recordDate: string;
  tightness?: number;
  /** Risk appetite input score — not the derived boldness budget. */
  riskAppetite?: number;
  /** Composite budget: 0.7 * riskAppetite + 0.3 * (100 - tightness). */
  boldnessScore?: number;
  primaryCall?: string;
  guardrail?: string;
  reversalTrigger?: string;
  /** Tightness regime boundary in force — the assumption watch line for the snapshot. */
  tightnessThreshold?: number;
  /** Risk appetite regime boundary in force — the assumption watch line for the snapshot. */
  riskAppetiteThreshold?: number;
  className?: string;
};

type SaveState = "idle" | "saving" | "saved" | "failed";

export function DecisionMemoryButton({
  regime,
  recordDate,
  tightness,
  riskAppetite,
  boldnessScore,
  primaryCall,
  guardrail,
  reversalTrigger,
  tightnessThreshold,
  riskAppetiteThreshold,
  className = "",
}: DecisionMemoryButtonProps) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const clientId = usePersistentClientId();

  const handleSave = async () => {
    if (saveState === "saving" || saveState === "saved") return;
    if (!clientId || !primaryCall) {
      setSaveState("failed");
      setTimeout(() => setSaveState("idle"), 3000);
      return;
    }

    setSaveState("saving");
    try {
      const response = await fetch("/api/decision-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-whether-client-id": clientId },
        body: JSON.stringify({
          kind: "posture-snapshot",
          clientId,
          recordDate,
          regime,
          primaryCall,
          tightness,
          riskAppetite,
          boldnessScore,
          guardrail,
          reversalTrigger,
          tightnessThreshold,
          riskAppetiteThreshold,
        }),
      });

      if (!response.ok) {
        setSaveState("failed");
        setTimeout(() => setSaveState("idle"), 3000);
        return;
      }

      // Mirror the server's entry into the same local cache the planning memory
      // panel reads, so a saved posture shows up there without a round trip.
      const { entry } = (await response.json()) as { entry?: DecisionMemoryEntry };
      if (entry) {
        try {
          const entryKey = `whether.decisionMemory:${clientId}`;
          const existingRaw = window.localStorage.getItem(entryKey);
          const existing = existingRaw ? (JSON.parse(existingRaw) as DecisionMemoryEntry[]) : [];
          window.localStorage.setItem(entryKey, JSON.stringify([entry, ...existing].slice(0, 64)));
        } catch {
          // A full or unavailable localStorage must not fail the save — the
          // server already has the entry.
        }
      }

      window.dispatchEvent(new CustomEvent("whether-decision-memory-updated"));
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 3000);
    } catch {
      setSaveState("failed");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  };

  return (
      <button
        type="button"
        onClick={handleSave}
        disabled={saveState === "saving" || !clientId}
        title="Save this week's posture to your decision history for reference"
        className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-fluid-xs font-medium text-white/70 hover:bg-white/[0.08] hover:text-white transition-[background-color,color,transform] duration-200 weather-press-scale weather-focus-ring disabled:opacity-50 ${className}`}
        aria-label="Save decision to history"
      >
      {saveState === "saved" ? (
        <>
          <CheckCircle size={13} className="text-emerald-400" />
          <span className="text-emerald-300 font-semibold">Logged to Memory</span>
        </>
      ) : saveState === "failed" ? (
        <>
          <AlertCircle size={13} className="text-amber-400" />
          <span className="text-amber-300 font-semibold">Save failed — retry</span>
        </>
      ) : (
        <>
          <Bookmark size={13} className="text-sky-400" />
          <span>{saveState === "saving" ? "Logging..." : "Log to Memory"}</span>
        </>
      )}
    </button>
  );
}
