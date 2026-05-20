"use client";

const REGIME_SUGGESTIONS: Record<string, { cta: string; href: string; reason: string }[]> = {
  SCARCITY: [
    { cta: "Review burn rate", href: "/planning", reason: "Cash preservation is critical in this environment." },
    { cta: "Check thresholds", href: "/evidence", reason: "Confidence may be unstable — verify the data." },
  ],
  DEFENSIVE: [
    { cta: "Gate commitments", href: "/planning", reason: "Only short-payback work should move forward." },
    { cta: "Review evidence", href: "/evidence", reason: "See what changed and whether the trend continues." },
  ],
  VOLATILE: [
    { cta: "Prepare scenarios", href: "/resolve", reason: "Conditions can shift quickly — have multiple plans." },
    { cta: "Review history", href: "/history", reason: "Past volatile periods show what to expect next." },
  ],
  EXPANSION: [
    { cta: "Scale proven bets", href: "/planning", reason: "Investor appetite is strong — raise if needed." },
    { cta: "Explore toolkits", href: "/resolve", reason: "More time available — review growth frameworks." },
    { cta: "Share the brief", href: "/share", reason: "Good time to align the team on the expansion call." },
  ],
};

export function RegimeSuggestions({ regimeKey }: { regimeKey?: string }) {
  if (!regimeKey || !REGIME_SUGGESTIONS[regimeKey]) return null;

  const suggestions = REGIME_SUGGESTIONS[regimeKey];

  return (
    <div className="weather-card">
      <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">Suggested next steps</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <a
            key={s.href}
            href={s.href}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/70 px-3 py-1.5 text-fluid-xs font-medium text-slate-200 no-underline hover:border-sky-500/40 hover:text-sky-100 transition-colors"
          >
            {s.cta}
            <span className="text-slate-500 font-normal">— {s.reason}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
