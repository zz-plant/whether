"use client";

import { useCallback } from "react";
import { Copy, CopyCheck } from "lucide-react";
import { Toast } from "@base-ui/react/toast";
import { useClipboardCopy } from "./useClipboardCopy";
import { DIRECTION_ARROW, DIRECTION_LABEL, DIRECTION_COLOR, type SignalDirection, formatBoldnessDeltaLabel } from "../viewModel";

type ActionCardProps = {
  call: string;
  actionNow?: string;
  guardrail?: string;
  flipConditions?: string[];
  tightness: number;
  boldnessScore: number;
  boldnessDelta: number;
  direction: SignalDirection;
  recordDate?: string;
  pauseThreshold?: number | string;
};

export function ActionCard({
  call,
  actionNow,
  guardrail,
  flipConditions,
  tightness,
  boldnessScore,
  boldnessDelta,
  direction,
  recordDate,
  pauseThreshold,
}: ActionCardProps) {
  const { status, copyToClipboard } = useClipboardCopy();
  const { add } = Toast.useToastManager();
  const isCopied = status === "copied";
  const arrow = DIRECTION_ARROW[direction];
  const boldnessDeltaLabel = formatBoldnessDeltaLabel(boldnessDelta);

  const buildText = useCallback(() => [
    `Whether · Weekly Brief · ${recordDate ?? ""}`,
    "",
    `Boldness Budget: ${boldnessScore}/100 (${boldnessDeltaLabel})`,
    `${arrow} ${call}`,
    actionNow ? `Do now: ${actionNow}` : null,
    guardrail ? `Watch: ${guardrail} (tightness ${tightness}/${pauseThreshold})` : null,
    flipConditions?.length ? `Watching: ${flipConditions.join(" · ")}` : null,
    "",
    "whether.work",
  ].filter(Boolean).join("\n"), [recordDate, boldnessScore, boldnessDeltaLabel, arrow, call, actionNow, guardrail, tightness, pauseThreshold, flipConditions]);

  const handleCopy = async () => {
    const success = await copyToClipboard(buildText(), "Weekly brief");
    if (success) {
      add({
        title: "Brief copied",
        description: "Weekly operating brief copied to clipboard.",
        type: "success",
      });
    }
  };

  const numericThreshold = typeof pauseThreshold === "number"
    ? pauseThreshold
    : typeof pauseThreshold === "string" && !isNaN(parseInt(pauseThreshold, 10))
    ? parseInt(pauseThreshold, 10)
    : guardrail
    ? parseInt(guardrail.match(/\d+/)?.[0] ?? "70", 10)
    : 70;

  const pauseColor = tightness >= numericThreshold ? "bg-rose-500 animate-pulse" : tightness >= numericThreshold - 5 ? "bg-amber-500 animate-pulse" : "bg-emerald-500";

  return (
    <div className={`weather-surface rounded-xl px-5 py-5 border-white/[0.06] relative overflow-hidden`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${direction === "tighten" ? "bg-rose-400/40" : direction === "ease" ? "bg-emerald-400/40" : "bg-sky-400/40"}`} />
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-xs font-semibold tracking-[0.06em] text-white/60">
          {DIRECTION_LABEL[direction]}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-200 hover:bg-sky-500/20 hover:border-sky-500/50 transition-colors active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-sky-400"
          aria-label={isCopied ? "Copied to clipboard" : "Copy brief to clipboard"}
        >
          {isCopied ? (
            <>
              <CopyCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Copy</span>
            </>
          )}
        </button>
      </div>

      <div className="mb-4 space-y-1">
        <p className="text-fluid-micro font-semibold uppercase tracking-[0.08em] text-white/35">
          {boldnessScore}/100 · {boldnessDeltaLabel}
        </p>
        <p className="text-lg font-semibold text-slate-100">
          <span className="mr-1.5">{arrow}</span>
          {call}
        </p>
      </div>

      {guardrail ? (
        <div className="mb-4 rounded-lg bg-white/[0.02] border border-white/[0.04] p-3 space-y-2">
          <div className="flex items-center justify-between text-fluid-nano font-semibold uppercase tracking-[0.06em]">
            <span className="text-white/60">Pause trigger</span>
            <span className={tightness >= numericThreshold ? "text-rose-300 font-bold" : tightness >= numericThreshold - 5 ? "text-amber-300" : "text-emerald-300"}>
              {tightness >= numericThreshold ? "Paused" : tightness >= numericThreshold - 5 ? "Near threshold" : "Clear"}
            </span>
          </div>
          <div className="h-2 w-full rounded-full overflow-hidden relative" style={{ background: "linear-gradient(90deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.12) 60%, rgba(251,191,36,0.18) 85%, rgba(244,63,94,0.18) 100%)" }}>
            <div className={`h-full rounded-full ${pauseColor} transition-all duration-500`} style={{ width: `${Math.min(100, (tightness / numericThreshold) * 100)}%` }} />
            <div className="absolute top-0 h-full w-[2px] bg-white/50" title="Threshold limit" style={{ right: 0 }} />
          </div>
          <div className="flex justify-between text-fluid-nano text-white/35 font-mono">
            <span>Tightness {tightness}</span>
            <span>Limit {numericThreshold}</span>
          </div>
        </div>
      ) : null}

      <div className="space-y-2.5 border-t border-white/[0.04] pt-3">
        {actionNow ? (
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-emerald-300/80">Do now</p>
            <p className="text-sm text-slate-100">{actionNow}</p>
          </div>
        ) : null}

        {guardrail ? (
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-amber-300/80">Pause if</p>
            <p className="text-sm text-white/70">{guardrail}</p>
          </div>
        ) : null}

        {flipConditions?.length ? (
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-sky-300/80">Reversal condition</p>
            <ul className="space-y-0.5">
              {flipConditions.map((c, i) => (
                <li key={i} className="text-sm text-sky-200">{c}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
