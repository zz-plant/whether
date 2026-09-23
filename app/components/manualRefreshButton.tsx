"use client";

import { Button } from "@base-ui/react/button";
import { useState } from "react";

/**
 * Reloads the document.
 *
 * That is the whole of it, and the copy has to say so. `dataProvenanceStrip`
 * rendered this at every one of its eleven call sites under the title "Request a
 * fresh snapshot for this provenance context" — so `/operate` and `/signals`
 * each carried several panel-scoped-looking Refresh pills that all reloaded the
 * page, discarding unsaved plan text and planner inputs elsewhere on it. A
 * reload also requests nothing: the read path serves the same materialized
 * model. The control now lives only on `LiveDataFallbackAlert`, where the page
 * really is the unit — the whole brief is on cached data, and retrying means
 * fetching the page again.
 *
 * There used to be a `successLabel` ("Updated just now") and an 8s timer to
 * clear it. Neither could ever render: `isRefreshing` is set true in the same
 * handler and never set false, so the ternary could not reach the success arm,
 * and the document is replaced moments later regardless.
 */

type ManualRefreshButtonProps = {
  label?: string;
  refreshingLabel?: string;
  className?: string;
  title?: string;
};

export function ManualRefreshButton({
  label = "Reload page",
  refreshingLabel = "Reloading…",
  className,
  title,
}: ManualRefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.location.reload();
  };

  return (
    <Button
      type="button"
      onClick={handleRefresh}
      disabled={isRefreshing}
      aria-busy={isRefreshing}
      title={title}
      className={className ?? "weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold text-slate-200 hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-400"}
    >
      {isRefreshing ? refreshingLabel : label}
    </Button>
  );
}
