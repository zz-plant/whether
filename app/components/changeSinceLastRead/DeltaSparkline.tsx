export const DeltaSparkline = ({ previous, current }: { previous: number | null; current: number | null }) => {
  if (previous === null || current === null) {
    return <p className="mt-2 text-fluid-xs text-slate-400">No history captured yet.</p>;
  }
  const min = Math.min(previous, current);
  const max = Math.max(previous, current);
  const range = Math.max(1, max - min);
  const yFor = (value: number) => 14 - ((value - min) / range) * 10;
  const directionLabel = current > previous ? "up" : current < previous ? "down" : "flat";
  return (
    <div className="mt-2">
      <svg viewBox="0 0 48 16" className="h-4 w-16" aria-label={`Trend ${directionLabel}`}>
        <polyline points={`4,${yFor(previous)} 24,${yFor((previous + current) / 2)} 44,${yFor(current)}`} fill="none" stroke="#7dd3fc" strokeWidth="1.5" />
      </svg>
      <p className="text-fluid-micro uppercase tracking-[0.1em] text-slate-400">{directionLabel} trend</p>
    </div>
  );
};
