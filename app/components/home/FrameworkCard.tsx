"use client";

import { Copy, Download, CopyCheck, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
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
  direction?: "tighten" | "ease" | "hold";
};

const ARROW = { tighten: "↑", ease: "↓", hold: "→" } as const;
const ACCENT = {
  tighten: "border-l-rose-400/40 bg-gradient-to-r from-rose-500/5 to-transparent",
  ease: "border-l-emerald-400/40 bg-gradient-to-r from-emerald-500/5 to-transparent",
  hold: "border-l-amber-400/40",
} as const;

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
  direction = "hold",
}: FrameworkCardProps) {
  const { status, copyToClipboard } = useClipboardCopy();

  const pauseColor = tightness >= pauseThreshold ? "bg-rose-500" : tightness >= pauseThreshold - 5 ? "bg-amber-500" : "bg-emerald-500";
  const arrow = ARROW[direction];
  const accent = ACCENT[direction];

  const buildCardText = () => {
    return [
      `Whether · Weekly Brief · ${recordDate ?? ""}`,
      ``,
      `${arrow} ${call}`,
      actionNow ? `Do now: ${actionNow}` : null,
      guardrail ? `Threshold: ${guardrail} (tightness ${tightness}/${pauseThreshold})` : null,
      flipConditions?.length ? `Watching: ${flipConditions.join(" · ")}` : null,
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
    <div className={`framework-card rounded-xl border border-app-border px-5 py-5 shadow-lg ${accent}`} data-share-card="true">
      <Button
        onClick={handleCopy}
        variant="default"
        size="lg"
        className="w-full mb-4 text-sm"
      >
        {isCopied ? (
          <span className="inline-flex items-center gap-1.5">
            <CopyCheck className="w-4 h-4" />
            Copied — paste anywhere
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <Copy className="w-4 h-4" />
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
          <Download className="w-3.5 h-3.5" />
          Save as image
        </a>
      </div>

      <p className="text-lg font-bold text-app-text mb-1">
        <span className="mr-1.5">{arrow}</span>
        {call}
      </p>

      <div className="space-y-1.5 text-sm text-app-text-secondary">
        {actionNow ? <p>{actionNow}</p> : null}
        {guardrail ? (
          <div className="mt-3">
            <div className="h-2 w-full rounded-full bg-app-nested overflow-hidden">
              <div
                className={`h-full rounded-full ${pauseColor}`}
                style={{ width: `${Math.min(100, (tightness / (pauseThreshold ?? 80)) * 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-fluid-micro mt-1">
              <span className="text-app-text-secondary tabular-nums">{tightness}</span>
              <span className="text-app-text-muted">{pauseThreshold ?? 80}</span>
            </div>
          </div>
        ) : null}
        {flipConditions?.length ? (
          <div className="flex items-center gap-1.5 text-fluid-xs text-sky-300">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            <span>{flipConditions.join(" · ")}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-3 pt-3 border-t border-app-border flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-8 bg-app-nested rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${confidenceLabel === "HIGH" ? "bg-emerald-400" : confidenceLabel === "MED" ? "bg-amber-400" : "bg-rose-400"}`}
                style={{ width: confidenceLabel === "HIGH" ? "100%" : confidenceLabel === "MED" ? "66%" : "33%" }}
              />
            </div>
            {confidenceLabel ? (
              <span className="text-fluid-micro tabular-nums text-app-text-muted">{confidenceLabel}</span>
            ) : null}
          </div>
          {reliabilityScore != null ? (
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-8 bg-app-nested rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${reliabilityScore >= 80 ? "bg-emerald-400" : reliabilityScore >= 60 ? "bg-amber-400" : "bg-rose-400"}`}
                  style={{ width: `${reliabilityScore}%` }}
                />
              </div>
              <span className="text-fluid-micro tabular-nums text-app-text-muted">{reliabilityScore}%</span>
            </div>
          ) : null}
        </div>
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
  );
}
