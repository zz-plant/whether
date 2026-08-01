"use client";

import { useEffect } from "react";

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

  const minifiedMatch = error.message?.match(MINIFIED_RE);
  const displayMessage = minifiedMatch
    ? "The weekly brief could not be displayed. The data pipeline may have returned an unexpected result."
    : error.message || "The weekly brief could not be displayed. The data pipeline may have returned an unexpected result.";

  return (
    <div className="weather-shell flex min-h-[40vh] items-center justify-center px-4 py-16">
      <div className="max-w-lg text-center">
        <p className="type-kicker text-rose-200">Error</p>
        <h1 className="type-section mt-2 text-slate-100">
          This brief isn&apos;t rendering right now
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          {displayMessage}
        </p>
        {minifiedMatch ? (
          <p className="mt-2 text-xs text-slate-500 font-mono">
            Ref #{minifiedMatch[1]}{error.digest ? ` · ${error.digest}` : ""}
          </p>
        ) : null}
        <button
          onClick={reset}
          className="weather-cta weather-cta-primary mt-6"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
