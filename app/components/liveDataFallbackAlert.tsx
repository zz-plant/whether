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
    /* A caveat, not a stop (2026-10-21): it drew in the amber utilities, which
       tokens.css folds onto the crossed-line red, so cached data read as a
       crossed pause line. The heavy left rule and the diamond are what set it
       apart from an ordinary band now, as on the archived-week banner; until
       2026-09-29 it drew as exactly that band, because `.weather-surface-secondary`
       paints its border and fill unlayered and beat the utilities here. The
       class is gone, so plain utilities win. */
    <section
      className="mb-6 rounded-lg border border-l-4 border-caveat-border bg-caveat-bg px-5 py-4 text-sm text-caveat-fg"
      aria-live="polite"
    >
      <p className="weather-caveat-mark font-semibold">{resolveDataStatusGuidance({ isFallbackSnapshot: true })}</p>
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
        />
        <ActionLink href="/trust#source-board" variant="inline" className="underline underline-offset-4">
          Which sources are late
        </ActionLink>
      </div>
    </section>
  );
}
