import Link from "next/link";

export function LiveDataFallbackAlert({
  lastCachedTimestamp,
  signalsHref = "/signals",
  followUpLabel = "Check live status",
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
      <p className="font-semibold">Data state: cached snapshot active.</p>
      <p className="mt-1">
        Decision impact: keep today&apos;s do now / hold / revisit path, but pause irreversible approvals until live data returns.
      </p>
      <p className="mt-1">
        Low confidence action: stage commitments and verify the next live refresh. Last cached update: {lastCachedTimestamp}. {followUpLabel} in{" "}
        <Link href={signalsHref} className="underline">
          Signals
        </Link>
        .
      </p>
    </section>
  );
}
