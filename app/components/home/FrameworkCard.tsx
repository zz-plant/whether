"use client";

import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useClipboardCopy } from "../useClipboardCopy";

type FrameworkCardProps = {
  call: string;
  actionNow?: string;
  guardrail?: string;
  flipConditions?: string[];
  confidenceLabel?: string;
  reliabilityScore?: number;
  tightness: number;
  recordDate?: string;
  pauseThreshold?: number;
  flipThreshold?: number;
};

export function FrameworkCard({
  call,
  actionNow,
  guardrail,
  flipConditions,
  confidenceLabel,
  reliabilityScore,
  tightness,
  recordDate,
  pauseThreshold = 80,
  flipThreshold = 65,
}: FrameworkCardProps) {
  const { status, copyToClipboard } = useClipboardCopy();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("whether_framework_dismissed");
    if (!dismissed) setShowOnboarding(true);
    setHydrated(true);
  }, []);

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    try { localStorage.setItem("whether_framework_dismissed", "1"); } catch {}
  };

  const pauseProximity = pauseThreshold ? Math.max(0, Math.min(100, ((pauseThreshold - tightness) / Math.max(pauseThreshold - flipThreshold, 1)) * 100)) : 50;
  const pauseColor = tightness >= pauseThreshold ? "bg-rose-500" : tightness >= pauseThreshold - 5 ? "bg-amber-500" : "bg-emerald-500";

  const buildCardText = () => {
    return [
      `Whether · Weekly Brief · ${recordDate ?? ""}`,
      ``,
      `Call: ${call}`,
      actionNow ? `Do now: ${actionNow}` : null,
      guardrail ? `Pause if: ${guardrail}` : null,
      flipConditions?.length ? `Flip if: ${flipConditions.join(" · ")}` : null,
      ``,
      `Confidence: ${confidenceLabel ?? "—"} · Reliability: ${reliabilityScore ?? "—"}%`,
      `whether.work`,
    ].filter(Boolean).join("\n");
  };

  const handleCopy = async () => {
    await copyToClipboard(buildCardText(), "Framework card");
  };

  const isCopied = status === "copied";

  return (
    <div className="framework-card rounded-xl border border-slate-700/60 bg-gradient-to-b from-slate-900/90 to-slate-950/95 px-5 py-5 shadow-lg" data-share-card="true">
      <Button
        onClick={handleCopy}
        variant="default"
        size="lg"
        className="w-full mb-4 text-sm"
      >
        {isCopied ? (
          <span className="inline-flex items-center gap-1.5">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8l3.5 3.5L13 5" /></svg>
            Copied — paste anywhere
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="5" width="9" height="11" rx="1.5" /><path d="M3 11V3a1 1 0 011-1h7" /></svg>
            Copy share-ready brief
          </span>
        )}
      </Button>

      <div className="flex items-center gap-2 mb-4">
        <a
          href="/api/image/brief"
          download="whether-brief.png"
          className={buttonVariants({ variant: "outline", size: "sm", className: "flex-1" })}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="14" height="10" rx="1.5" /><circle cx="5" cy="8" r="1.5" /><path d="M13 5l-4 4-3-2-4 3" /></svg>
          Save as image
        </a>
      </div>

      {showOnboarding && hydrated ? (
        <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2 mb-3 flex items-start justify-between gap-2">
          <div className="text-fluid-xs text-sky-100 space-y-0.5">
            <p><span className="font-semibold">Call</span> — the decision for this week</p>
            <p><span className="font-semibold">Pause if</span> — conditions that would change the call</p>
            <p><span className="font-semibold">Flip if</span> — conditions that would reverse it</p>
          </div>
          <button type="button" onClick={dismissOnboarding} className="text-sky-300 hover:text-sky-100 flex-shrink-0" aria-label="Dismiss guide">
            ×
          </button>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-400">Operating framework</p>
          <p className="text-fluid-micro text-slate-600">{recordDate}</p>
        </div>
        <div className="flex items-center gap-2">
          {reliabilityScore != null ? (
            <Badge variant="secondary" className={`rounded-full px-2 py-0.5 text-fluid-micro font-semibold ${
              reliabilityScore >= 80 ? "bg-emerald-500/15 text-emerald-200" :
              reliabilityScore >= 60 ? "bg-amber-500/15 text-amber-200" :
              "bg-rose-500/15 text-rose-200"
            }`}>
              {reliabilityScore}% reliable
            </Badge>
          ) : null}
          {confidenceLabel ? (
            <Badge variant="secondary" className={`rounded-full px-2 py-0.5 text-fluid-micro font-semibold uppercase ${
              confidenceLabel === "HIGH" ? "bg-emerald-500/15 text-emerald-200" :
              confidenceLabel === "MED" ? "bg-amber-500/15 text-amber-200" :
              "bg-rose-500/15 text-rose-200"
            }`}>
              {confidenceLabel}
            </Badge>
          ) : null}
        </div>
      </div>

      <p className="text-lg font-bold text-slate-50 mb-1">{call}</p>

      {guardrail && tightness < (pauseThreshold ?? 80) ? (
        <p className="text-xs text-slate-500 mb-2">
          {tightness >= (pauseThreshold ?? 80) - 5
            ? `Close to the pause line — ${pauseThreshold ?? 80 - tightness} point${pauseThreshold ?? 80 - tightness === 1 ? "" : "s"} away. ${flipConditions?.length ? "Watch for a flip." : ""}`
            : `You're ${(pauseThreshold ?? 80) - tightness} points from the pause line. Tightening remains the right call.`
          }
        </p>
      ) : null}

      <div className="space-y-1.5 text-sm text-slate-300">
        {actionNow ? <p>{actionNow}</p> : null}
        {guardrail ? (
          <div>
            <div className="flex items-center gap-2">
              <span className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-400 w-16 flex-shrink-0">Pause if</span>
              <span className="text-slate-200">{guardrail}</span>
            </div>
            <div className="mt-1 ml-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${pauseColor}`} style={{ width: `${pauseProximity}%` }} />
            </div>
          </div>
        ) : null}
        {flipConditions?.length ? (
          <div>
            <div className="flex items-center gap-2">
              <span className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-sky-300 w-16 flex-shrink-0">Flip if</span>
              <span className="text-slate-200">{flipConditions.join(" · ")}</span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/50 flex items-center justify-between gap-2 flex-wrap">
        <a
          href="/planning"
          className={buttonVariants({ variant: "link", size: "xs", className: "text-sky-300" })}
        >
          Turn this into a plan →
        </a>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleCopy}
            variant="ghost"
            size="xs"
            aria-label="Copy to clipboard"
          >
            {isCopied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
    </div>
  );
}
