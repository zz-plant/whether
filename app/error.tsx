"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="weather-shell flex min-h-[40vh] items-center justify-center px-4 py-16">
      <div className="max-w-lg text-center">
        <p className="type-kicker text-rose-200">Error</p>
        <h1 className="type-section mt-2 text-slate-100">
          This brief isn&apos;t rendering right now
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          {error.message || "The weekly brief could not be displayed. The data pipeline may have returned an unexpected result."}
        </p>
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
