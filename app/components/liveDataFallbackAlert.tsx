import { ManualRefreshButton } from "./manualRefreshButton";

type LiveDataFallbackAlertProps = {
  lastCachedTimestamp: string;
  sourceLabel?: string;
  effectiveRecordDate?: string;
  fallbackReason?: string | null;
  signalsHref?: string;
  followUpLabel?: string;
};

export function LiveDataFallbackAlert({
  lastCachedTimestamp,
  sourceLabel,
  effectiveRecordDate,
  fallbackReason,
  signalsHref = "/evidence",
  followUpLabel = "Check live status",
}: LiveDataFallbackAlertProps) {
  const sourceLine = sourceLabel ? `Source: ${sourceLabel}. ` : "";
  const effectiveLine = effectiveRecordDate ? `Effective: ${effectiveRecordDate}. ` : "";

  return (
    <section
      className="weather-surface-secondary border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-100"
      aria-live="polite"
    >
      <p className="font-semibold">Cached data — use for pacing only. Pause irreversible approvals.</p>
      <p className="mt-1 break-words [overflow-wrap:anywhere]">
        {sourceLine}
        {effectiveLine}
        Last update: {lastCachedTimestamp}.
        {fallbackReason ? ` Reason: ${fallbackReason}` : null}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ManualRefreshButton
          label="Retry live data"
          refreshingLabel="Retrying…"
          successLabel="Retry sent"
          title="Retry a live data check for this weekly brief."
          className="weather-pill inline-flex min-h-[44px] items-center justify-center border-amber-300/50 bg-amber-500/15 px-3 py-2 text-xs font-semibold tracking-[0.12em] text-amber-50 hover:border-amber-200/80 hover:text-white disabled:cursor-not-allowed disabled:border-amber-700/40 disabled:text-amber-200/70"
        />
      </div>
    </section>
  );
}
