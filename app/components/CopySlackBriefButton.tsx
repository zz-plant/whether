"use client";

import { useCallback, useRef, useState } from "react";
import { CheckIcon, CopyIcon } from "./uiIcons";

type Props = {
  weeklyCall?: string;
  regime: string;
  boldnessScore: number;
  recordDate: string;
  guardrail?: string;
  reversalTrigger?: string;
  lines?: string[];
  url?: string;
  className?: string;
};

export function CopySlackBriefButton({
  weeklyCall = "Stage decisions. Avoid irreversible fixed-cost commitments.",
  regime,
  boldnessScore,
  recordDate,
  guardrail,
  reversalTrigger,
  lines,
  url = typeof window !== "undefined" ? window.location.href : "https://whether.work",
  className = "",
}: Props) {
  const [didCopy, setDidCopy] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback(() => {
    const bulletBlock =
      lines && lines.length > 0
        ? lines.map((line) => `• ${line}`).join("\n")
        : `• DO NOW: ${weeklyCall}\n${guardrail ? `• PAUSE IF: ${guardrail}\n` : ""}${reversalTrigger ? `• REVERSAL: ${reversalTrigger}` : ""}`;

    const slackPayload = [
      `*Whether Weekly Brief* · ${recordDate}`,
      `*Regime:* ${regime} | *Boldness Budget:* ${boldnessScore}/100`,
      `*The Call:* ${weeklyCall}`,
      "",
      "*Operating Boundaries:*",
      bulletBlock,
      "",
      `*Permanent Record:* ${url || "https://whether.work"}`,
    ].join("\n");

    try {
      void navigator.clipboard.writeText(slackPayload);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setDidCopy(true);
      timeoutRef.current = setTimeout(() => setDidCopy(false), 2500);
    } catch {
      // ignore
    }
  }, [weeklyCall, regime, boldnessScore, recordDate, guardrail, reversalTrigger, lines, url]);

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Copy 60-second Slack brief to clipboard"
      data-testid="copy-slack-brief-button"
      className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-fluid-xs font-semibold text-emerald-200 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all weather-press-scale weather-focus-ring ${className}`}
      aria-label="Copy brief for Slack"
    >
      {didCopy ? (
        <>
          <CheckIcon className="size-3.5 text-emerald-300" />
          <span className="text-emerald-300">Copied for Slack!</span>
        </>
      ) : (
        <>
          <CopyIcon className="size-3.5 text-emerald-400" />
          <span>Copy Slack Brief</span>
        </>
      )}
    </button>
  );
}
