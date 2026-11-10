"use client";

import { useEffect } from "react";
import { ActionLink } from "./components/ui/actionLink";

const MINIFIED_RE = /^Minified React error #(\d+)/;

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[whether] render error:", error);
  }, [error]);

  /* One written sentence, never `error.message`: that is the text of whatever
     threw ("Cannot read properties of undefined…"), written for a console, and
     it printed here as the page's explanation. The console line above and the
     reference below still carry it for whoever debugs this. */
  const minifiedMatch = error.message?.match(MINIFIED_RE);

  return (
    <div className="weather-shell flex min-h-[40vh] items-center justify-center px-4 py-16">
      <div className="max-w-lg text-center">
        <p className="type-kicker text-rose-200">Error</p>
        <h1 className="type-section mt-2 text-slate-100">
          This page did not load
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Something failed while the page was being put together. Try again. If it fails a second time, a
          data source may be late, and the data status page shows which.
        </p>
        {minifiedMatch ? (
          <p className="mt-2 text-xs text-slate-500 font-mono">
            Ref #{minifiedMatch[1]}{error.digest ? ` · ${error.digest}` : ""}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
          <button
            type="button"
            onClick={reset}
            className="weather-cta weather-cta-primary"
          >
            Try again
          </button>
          <ActionLink href="/trust#source-board" variant="inline">Check data status</ActionLink>
        </div>
      </div>
    </div>
  );
}
