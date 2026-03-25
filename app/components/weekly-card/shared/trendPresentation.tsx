const trendIconTone: Record<string, string> = {
  improving: "text-emerald-200",
  strengthening: "text-emerald-200",
  stable: "text-slate-200",
  mixed: "text-amber-200",
  unstable: "text-amber-200",
  deteriorating: "text-rose-200",
  weakening: "text-rose-200",
};

export const normalizeTrendKey = (trendLabel?: string) => trendLabel?.trim().toLowerCase() ?? "stable";

export const TrendGlyph = ({ trendLabel }: { trendLabel?: string }) => {
  const trendKey = normalizeTrendKey(trendLabel);
  const toneClass = trendIconTone[trendKey] ?? "text-slate-200";

  if (trendKey === "improving" || trendKey === "strengthening") {
    return (
      <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 ${toneClass}`} aria-hidden="true" focusable="false">
        <path d="M3.5 11.5 11.5 3.5M7.5 3.5h4v4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (trendKey === "deteriorating" || trendKey === "weakening") {
    return (
      <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 ${toneClass}`} aria-hidden="true" focusable="false">
        <path d="M3.5 4.5 11.5 12.5M7.5 12.5h4v-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (trendKey === "mixed" || trendKey === "unstable") {
    return (
      <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 ${toneClass}`} aria-hidden="true" focusable="false">
        <path d="M2.5 10.5 5.3 7.7l2.2 2.2 3.8-3.8 2.2 2.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 ${toneClass}`} aria-hidden="true" focusable="false">
      <path d="M3 8h10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
};
