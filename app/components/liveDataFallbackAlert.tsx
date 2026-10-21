import { formatDateUTC, formatTimestampUTC } from "../../lib/formatters";
import { resolveDataStatusGuidance } from "../../lib/report/trustStatus";
import { ManualRefreshButton } from "./manualRefreshButton";
import { ActionLink } from "./ui/actionLink";

type LiveDataFallbackAlertProps = {
  lastCachedTimestamp: string;
  effectiveRecordDate?: string;
};

/*
 * Until 2026-10-21 this printed the feed URL, an ISO timestamp and the stored
 * fallback reason ("Report dependency outage: serving cached treasury
 * snapshot."), and opened on its own sentence where the homepage banner said
 * the same state another way. The headline is now the shared data-status
 * sentence, the dates read as dates, and which feed is late is one link away
 * on the source board rather than spelled out in infrastructure words.
 */
export function LiveDataFallbackAlert({
  lastCachedTimestamp,
  effectiveRecordDate,
}: LiveDataFallbackAlertProps) {
  const recordLine = effectiveRecordDate ? ` Rates are as of ${formatDateUTC(effectiveRecordDate)}.` : "";

  return (
    /* `!` on the amber: `.weather-surface-secondary` sets its border and
       background unlayered, which beats a plain utility, so until 2026-09-29
       the one box saying "do not act on this" drew as an ordinary grey band. */
    <section
      className="weather-surface-secondary mb-6 !border-amber-500/40 !bg-amber-500/10 px-5 py-4 text-sm text-amber-100"
      aria-live="polite"
    >
      <p className="font-semibold">{resolveDataStatusGuidance({ isFallbackSnapshot: true })}</p>
      <p className="mt-1">
        Last live reading {formatTimestampUTC(lastCachedTimestamp)}.{recordLine}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* The one place this control's scope matches its effect: the whole brief
            is on cached data, so reloading the whole page is the retry. */}
        <ManualRefreshButton
          label="Retry live data"
          refreshingLabel="Retrying…"
          title="Reload the page to retry a live data check for this brief."
          className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold text-amber-50 hover:text-white disabled:cursor-not-allowed disabled:text-amber-200/70"
        />
        <ActionLink href="/trust#source-board" variant="inline" className="!text-amber-50 underline underline-offset-4 hover:!text-white">
          Which sources are late
        </ActionLink>
      </div>
    </section>
  );
}
