import type { RegimeKey } from "../regimeEngine";
import type { TimeMachineRegimeEntry } from "../timeMachine/timeMachineCache";
import { getRegimePublicLabel } from "../regimePresentation";

type MacroSpellBenchmark = {
  regime: RegimeKey;
  regimeLabel: string;
  currentSpellMonths: number;
  medianPastSpellMonths: number;
  longestPastSpellMonths: number;
  completedSpellCount: number;
  label: string;
};

type RunwayMacroFanPoint = {
  monthOffset: number; // 0, 1, 2, ...
  baselineCashUsd: number;
  committedCashUsd: number | null;
};

export type RunwayMacroFanModel = {
  points: readonly RunwayMacroFanPoint[];
  maxMonths: number;
  initialCashUsd: number;
  baselineCashOutMonth: number | null;
  committedCashOutMonth: number | null;
  benchmark: MacroSpellBenchmark | null;
};

export const computeMacroSpellBenchmark = (
  series: readonly TimeMachineRegimeEntry[],
  currentRegime: RegimeKey,
): MacroSpellBenchmark | null => {
  if (series.length === 0) return null;
  const ordered = [...series].sort((a, b) => a.recordDate.localeCompare(b.recordDate));

  type Spell = { regime: RegimeKey; months: number; completed: boolean };
  const spells: Spell[] = [];

  for (const entry of ordered) {
    const last = spells.at(-1);
    if (last && last.regime === entry.regime) {
      last.months += 1;
    } else {
      spells.push({ regime: entry.regime, months: 1, completed: true });
    }
  }

  const currentSpell = spells.at(-1);
  if (!currentSpell) return null;
  currentSpell.completed = false;

  const pastMatchingSpells = spells
    .slice(0, -1)
    .filter((s) => s.regime === currentRegime && s.completed);

  const months = pastMatchingSpells.map((s) => s.months).sort((a, b) => a - b);
  const longest = months.length > 0 ? months[months.length - 1]! : currentSpell.months;
  const median =
    months.length === 0
      ? currentSpell.months
      : months.length % 2 === 1
        ? months[Math.floor(months.length / 2)]!
        : Math.round((months[months.length / 2 - 1]! + months[months.length / 2]!) / 2);

  const label = getRegimePublicLabel(currentRegime);

  return {
    regime: currentRegime,
    regimeLabel: label,
    currentSpellMonths: currentSpell.months,
    medianPastSpellMonths: median,
    longestPastSpellMonths: longest,
    completedSpellCount: pastMatchingSpells.length,
    label: `${label} stretch (current ${currentSpell.months} mo · past median ${median} mo · longest ${longest} mo)`,
  };
};

export const buildRunwayMacroFanModel = ({
  initialCashUsd,
  netMonthlyBurnUsd,
  newMonthlyCostUsd = 0,
  maxMonths = 36,
  macroSeries,
  currentRegime,
}: {
  initialCashUsd: number;
  netMonthlyBurnUsd: number;
  newMonthlyCostUsd?: number;
  maxMonths?: number;
  macroSeries?: readonly TimeMachineRegimeEntry[];
  currentRegime?: RegimeKey;
}): RunwayMacroFanModel => {
  const points: RunwayMacroFanPoint[] = [];
  const safeBurnBaseline = Math.max(0, netMonthlyBurnUsd);
  const safeBurnCommitted = Math.max(0, netMonthlyBurnUsd + newMonthlyCostUsd);

  let baselineCashOutMonth: number | null = null;
  let committedCashOutMonth: number | null = null;

  for (let m = 0; m <= maxMonths; m += 1) {
    const cashBaseline = Math.max(0, initialCashUsd - m * safeBurnBaseline);
    const cashCommitted =
      newMonthlyCostUsd > 0 ? Math.max(0, initialCashUsd - m * safeBurnCommitted) : null;

    if (baselineCashOutMonth === null && cashBaseline === 0 && initialCashUsd > 0) {
      baselineCashOutMonth = m;
    }
    if (committedCashOutMonth === null && cashCommitted === 0 && initialCashUsd > 0) {
      committedCashOutMonth = m;
    }

    points.push({
      monthOffset: m,
      baselineCashUsd: cashBaseline,
      committedCashUsd: cashCommitted,
    });
  }

  const benchmark =
    macroSeries && currentRegime ? computeMacroSpellBenchmark(macroSeries, currentRegime) : null;

  return {
    points,
    maxMonths,
    initialCashUsd,
    baselineCashOutMonth,
    committedCashOutMonth,
    benchmark,
  };
};
