import Link from "next/link";

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
  signalsHref = "/signals",
  followUpLabel = "Check live status",
}: LiveDataFallbackAlertProps) {
  const sourceLine = sourceLabel ? `Source in use: ${sourceLabel}. ` : "";
  const effectiveLine = effectiveRecordDate ? `Effective date in brief: ${effectiveRecordDate}. ` : "";

  return (
    <section
      className="weather-panel border border-amber-500/50 bg-amber-500/10 px-5 py-4 text-sm text-amber-100"
      aria-live="polite"
    >
      <p className="font-semibold">Data state: cached snapshot active.</p>
      <p className="mt-1">
        Decision impact: use this week&apos;s brief for pacing only, and pause irreversible approvals until live data returns.
      </p>
      <p className="mt-1 break-words [overflow-wrap:anywhere]">
        {sourceLine}
        {effectiveLine}
        Last cached update: {lastCachedTimestamp}.
      </p>
      {fallbackReason ? <p className="mt-1 break-words [overflow-wrap:anywhere]">Fallback reason: {fallbackReason}</p> : null}
      <p className="mt-1">
        Low confidence action: stage commitments, wait for one verified live refresh, and use the cached call as a translation layer rather than final authority. {followUpLabel} in{" "}
        <Link href={signalsHref} className="underline">
          Signals
        </Link>
        .
      </p>
    </section>
  );
}
