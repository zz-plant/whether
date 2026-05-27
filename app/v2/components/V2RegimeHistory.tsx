const REGIME_COLORS: Record<string, string> = {
  SCARCITY: "bg-amber-400/60",
  DEFENSIVE: "bg-rose-400/60",
  VOLATILE: "bg-sky-400/60",
  EXPANSION: "bg-emerald-400/60",
};

type Props = {
  regimes: Array<{ record_date: string; regime: string }>;
  currentRegime: string;
};

export function V2RegimeHistory({ regimes, currentRegime }: Props) {
  if (regimes.length < 2) return null;

  return (
    <div className="weather-card">
      <p className="text-[0.6rem] font-semibold tracking-[0.06em] text-slate-600 mb-2">Regime history</p>
      <div className="flex items-end gap-1 h-12">
        {regimes.map((entry, i) => {
          const height = 20 + (i / Math.max(regimes.length - 1, 1)) * 70;
          const isCurrent = i === regimes.length - 1;
          return (
            <div
              key={entry.record_date}
              className={`flex-1 rounded-t-sm ${REGIME_COLORS[entry.regime] ?? "bg-slate-500/40"} ${isCurrent ? "ring-1 ring-white/20" : ""}`}
              style={{ height: `${height}%` }}
              title={`${entry.record_date}: ${entry.regime}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[0.5rem] text-slate-600 mt-1">
        <span>{regimes[0].record_date}</span>
        <span>{regimes[regimes.length - 1].record_date}</span>
      </div>
    </div>
  );
}
