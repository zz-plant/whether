import type { TimeMachineRegimeEntry } from "../../../lib/timeMachine/timeMachineCache";

type RegimeStats = {
  avgDuration: number;
  transitionsPerYear: number;
  longestStreak: { regime: string; months: number };
  currentStreak: number;
};

function computeRegimeStats(series: TimeMachineRegimeEntry[]): RegimeStats | null {
  try {
    if (series.length < 6) return null;

    const streaks: { regime: string; months: number }[] = [];
    let currentRegime = series[0].regime;
    let currentStreak = 1;
    let longestStreak = { regime: currentRegime, months: 1 };
    let transitions = 0;

    for (let i = 1; i < series.length; i++) {
      if (series[i].regime === currentRegime) {
        currentStreak++;
      } else {
        streaks.push({ regime: currentRegime, months: currentStreak });
        if (currentStreak > longestStreak.months) {
          longestStreak = { regime: currentRegime, months: currentStreak };
        }
        transitions++;
        currentRegime = series[i].regime;
        currentStreak = 1;
      }
    }

    streaks.push({ regime: currentRegime, months: currentStreak });
    if (currentStreak > longestStreak.months) {
      longestStreak = { regime: currentRegime, months: currentStreak };
    }

    const totalMonths = series.length;
    const avgDuration = Math.round(totalMonths / Math.max(transitions, 1));
    const yearsCovered = totalMonths / 12;
    const transitionsPerYear = Math.round((transitions / yearsCovered) * 10) / 10;

    return {
      avgDuration,
      transitionsPerYear,
      longestStreak,
      currentStreak,
    };
  } catch {
    return null;
  }
}

export function RegimeStats({ series }: { series: TimeMachineRegimeEntry[] }) {
  const stats = computeRegimeStats(series);

  if (!stats) return null;

  return (
    <section className="space-y-3">
      <p className="type-eyebrow">Regime velocity</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="rounded-md bg-slate-950/40 px-3 py-2.5">
          <p className="text-slate-400">Avg duration</p>
          <p className="mt-1 text-lg font-bold text-slate-100">{stats.avgDuration}<span className="text-sm font-normal text-slate-400"> mo</span></p>
        </div>
        <div className="rounded-md bg-slate-950/40 px-3 py-2.5">
          <p className="text-slate-400">Transitions/year</p>
          <p className="mt-1 text-lg font-bold text-slate-100">{stats.transitionsPerYear}</p>
        </div>
        <div className="rounded-md bg-slate-950/40 px-3 py-2.5">
          <p className="text-slate-400">Current streak</p>
          <p className="mt-1 text-lg font-bold text-slate-100">{stats.currentStreak}<span className="text-sm font-normal text-slate-400"> mo</span></p>
        </div>
        <div className="rounded-md bg-slate-950/40 px-3 py-2.5">
          <p className="text-slate-400">Longest {stats.longestStreak.regime}</p>
          <p className="mt-1 text-lg font-bold text-slate-100">{stats.longestStreak.months}<span className="text-sm font-normal text-slate-400"> mo</span></p>
        </div>
      </div>
    </section>
  );
}
