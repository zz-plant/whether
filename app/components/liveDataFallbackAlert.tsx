import Link from "next/link";

export function LiveDataFallbackAlert({
  lastCachedTimestamp,
  signalsHref = "/signals",
  followUpLabel = "Validate live status",
}: {
  lastCachedTimestamp: string;
  signalsHref?: string;
  followUpLabel?: string;
}) {
  return (
    <section
      className="weather-panel border border-amber-500/50 bg-amber-500/10 px-5 py-4 text-sm text-amber-100"
      aria-live="polite"
    >
      <p className="font-semibold">Live data unavailable — showing cached snapshot.</p>
      <p className="mt-1">
        Last cached update: {lastCachedTimestamp}. {followUpLabel} in{" "}
        <Link href={signalsHref} className="underline">
          Signals
        </Link>
        .
      </p>
    </section>
  );
}
