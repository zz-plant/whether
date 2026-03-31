"use client";

import { Tooltip } from "@base-ui/react/tooltip";

export function ConfidenceTooltipBadge({
  confidenceLabel,
  confidenceTone,
}: {
  confidenceLabel: string;
  confidenceTone: string;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        type="button"
        className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.12em] ${confidenceTone}`}
        aria-label={`${confidenceLabel} confidence`}
      >
        <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
        {confidenceLabel} confidence
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner side="bottom" sideOffset={8} className="z-30">
          <Tooltip.Popup className="weather-panel w-72 space-y-2 border border-slate-800/80 bg-slate-950/95 px-3 py-3 text-left text-xs text-slate-200 shadow-lg">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Signal confidence</p>
            <p className="text-sm text-slate-200">
              Use compact trust markers inline; pause irreversible commitments when confidence or
              freshness is degraded.
            </p>
            <Tooltip.Arrow className="h-2.5 w-2.5 rotate-45 border border-slate-800/80 bg-slate-950/95" />
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
