"use client";

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

  const pauseProximity = pauseThreshold ? Math.max(0, Math.min(100, ((pauseThreshold - tightness) / Math.max(pauseThreshold - flipThreshold, 1)) * 100)) : 50;
  const pauseColor = tightness >= pauseThreshold ? "bg-rose-500" : tightness >= pauseThreshold - 5 ? "bg-amber-500" : "bg-emerald-500";

  const buildCardText = () => {
    return [
      `Whether · Weekly Framework · ${recordDate ?? ""}`,
      ``,
      `Call: ${call}`,
      actionNow ? `Do now: ${actionNow}` : null,
      guardrail ? `Pause if: ${guardrail}` : null,
      flipConditions?.length ? `Flip if: ${flipConditions.join(" · ")}` : null,
      ``,
      `Tightness: ${tightness} · Confidence: ${confidenceLabel ?? "—"} · Reliability: ${reliabilityScore ?? "—"}`,
      `whether.work`,
    ].filter(Boolean).join("\n");
  };

  const handleCopy = async () => {
    await copyToClipboard(buildCardText(), "Framework card");
  };

  const isCopied = status === "copied";

  return (
    <div className="framework-card rounded-xl border border-slate-700/60 bg-gradient-to-b from-slate-900/90 to-slate-950/95 px-5 py-5 shadow-lg" data-share-card="true">
      <button
        type="button"
        onClick={handleCopy}
        className="w-full mb-4 rounded-lg border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 active:bg-sky-500/30 px-4 py-3 text-sm font-semibold text-sky-200 transition-colors flex items-center justify-center gap-2"
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
      </button>

      <div className="flex items-center gap-2 mb-4">
        <a
          href="/api/image/brief"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-lg border border-slate-700/60 bg-slate-900/50 hover:bg-slate-800/50 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors text-center inline-flex items-center justify-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="14" height="10" rx="1.5" /><circle cx="5" cy="8" r="1.5" /><path d="M13 5l-4 4-3-2-4 3" /></svg>
          Open share image
        </a>
      </div>

      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-fluid-micro font-semibold uppercase tracking-[0.12em] text-slate-400">Operating framework</p>
          <p className="text-fluid-micro text-slate-600">{recordDate}</p>
        </div>
        <div className="flex items-center gap-2">
          {reliabilityScore != null ? (
            <span className={`rounded-full px-2 py-0.5 text-fluid-micro font-semibold ${
              reliabilityScore >= 80 ? "bg-emerald-500/15 text-emerald-200" :
              reliabilityScore >= 60 ? "bg-amber-500/15 text-amber-200" :
              "bg-rose-500/15 text-rose-200"
            }`}>
              {reliabilityScore}% reliable
            </span>
          ) : null}
          {confidenceLabel ? (
            <span className={`rounded-full px-2 py-0.5 text-fluid-micro font-semibold uppercase ${
              confidenceLabel === "HIGH" ? "bg-emerald-500/15 text-emerald-200" :
              confidenceLabel === "MED" ? "bg-amber-500/15 text-amber-200" :
              "bg-rose-500/15 text-rose-200"
            }`}>
              {confidenceLabel}
            </span>
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
              <span className="text-fluid-micro font-semibold uppercase tracking-[0.08em] text-rose-300 w-16 flex-shrink-0">Pause if</span>
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
              <span className="text-fluid-micro font-semibold uppercase tracking-[0.08em] text-sky-300 w-16 flex-shrink-0">Flip if</span>
              <span className="text-slate-200">{flipConditions.join(" · ")}</span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-fluid-micro text-slate-500">
          <span>Tightness {tightness}</span>
          <span className="text-slate-700">·</span>
          <span>whether.work</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md border border-slate-700 bg-slate-900/50 px-3 py-1.5 text-fluid-xs font-semibold text-slate-300 hover:border-sky-500/40 hover:text-sky-200 transition-colors"
          aria-label="Copy to clipboard"
        >
          {isCopied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
