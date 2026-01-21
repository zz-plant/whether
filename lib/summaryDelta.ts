import type { MonthlySummary } from "./monthlySummary";
import type { WeeklySummary } from "./weeklySummary";

export type SummaryDelta = {
  regime: {
    from: WeeklySummary["regime"];
    to: MonthlySummary["regime"];
    fromLabel: WeeklySummary["regimeLabel"];
    toLabel: MonthlySummary["regimeLabel"];
    changed: boolean;
  };
  constraints: {
    added: string[];
    removed: string[];
    unchanged: string[];
  };
  provenance: {
    weeklyAgeHours: number | null;
    monthlyAgeHours: number | null;
    ageDeltaHours: number | null;
    weeklyTimestampLabel: string;
    monthlyTimestampLabel: string;
    weeklyStatusLabel: string;
    monthlyStatusLabel: string;
    statusChanged: boolean;
  };
  bullets: string[];
};

const parseAgeLabel = (label: string) => {
  const match = label.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
};

const formatCountLabel = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

const buildConstraintSummary = (added: string[], removed: string[]) => {
  if (added.length === 0 && removed.length === 0) {
    return "No constraint changes";
  }
  if (added.length > 0 && removed.length > 0) {
    return `${formatCountLabel(added.length, "constraint")} added, ${formatCountLabel(
      removed.length,
      "constraint"
    )} removed`;
  }
  if (added.length > 0) {
    return `${formatCountLabel(added.length, "constraint")} added`;
  }
  return `${formatCountLabel(removed.length, "constraint")} removed`;
};

const buildProvenanceBullet = (delta: SummaryDelta["provenance"], ageLabel: string) => {
  if (delta.ageDeltaHours === null) {
    const statusSuffix = delta.statusChanged
      ? `; confidence now ${delta.monthlyStatusLabel}`
      : "";
    return `Provenance timestamp ${delta.monthlyTimestampLabel}${statusSuffix}.`;
  }
  if (delta.ageDeltaHours === 0) {
    const statusSuffix = delta.statusChanged
      ? `; confidence now ${delta.monthlyStatusLabel}`
      : "";
    return `Provenance age unchanged at ${ageLabel}${statusSuffix}.`;
  }
  const sign = delta.ageDeltaHours > 0 ? "+" : "";
  const statusSuffix = delta.statusChanged ? `; confidence now ${delta.monthlyStatusLabel}` : "";
  return `Provenance age ${ageLabel} (Δ ${sign}${delta.ageDeltaHours}h vs weekly)${statusSuffix}.`;
};

export const buildSummaryDelta = (weeklySummary: WeeklySummary, monthlySummary: MonthlySummary) => {
  const weeklyConstraintSet = new Set(weeklySummary.constraints);
  const monthlyConstraintSet = new Set(monthlySummary.constraints);
  const added = monthlySummary.constraints.filter((constraint) => !weeklyConstraintSet.has(constraint));
  const removed = weeklySummary.constraints.filter(
    (constraint) => !monthlyConstraintSet.has(constraint)
  );
  const unchanged = monthlySummary.constraints.filter((constraint) => weeklyConstraintSet.has(constraint));
  const weeklyAgeHours = parseAgeLabel(weeklySummary.provenance.ageLabel);
  const monthlyAgeHours = parseAgeLabel(monthlySummary.provenance.ageLabel);
  const ageDeltaHours =
    weeklyAgeHours === null || monthlyAgeHours === null
      ? null
      : monthlyAgeHours - weeklyAgeHours;
  const statusChanged = weeklySummary.provenance.statusLabel !== monthlySummary.provenance.statusLabel;
  const regimeChanged = weeklySummary.regime !== monthlySummary.regime;
  const regimeBullet = regimeChanged
    ? `Regime shifted to ${monthlySummary.regimeLabel}.`
    : `Regime steady in ${monthlySummary.regimeLabel}.`;
  const constraintBullet = `${buildConstraintSummary(added, removed)}.`;
  const provenance = {
    weeklyAgeHours,
    monthlyAgeHours,
    ageDeltaHours,
    weeklyTimestampLabel: weeklySummary.provenance.timestampLabel,
    monthlyTimestampLabel: monthlySummary.provenance.timestampLabel,
    weeklyStatusLabel: weeklySummary.provenance.statusLabel,
    monthlyStatusLabel: monthlySummary.provenance.statusLabel,
    statusChanged,
  };
  const provenanceBullet = buildProvenanceBullet(provenance, monthlySummary.provenance.ageLabel);

  return {
    regime: {
      from: weeklySummary.regime,
      to: monthlySummary.regime,
      fromLabel: weeklySummary.regimeLabel,
      toLabel: monthlySummary.regimeLabel,
      changed: regimeChanged,
    },
    constraints: {
      added,
      removed,
      unchanged,
    },
    provenance,
    bullets: [regimeBullet, constraintBullet, provenanceBullet],
  } satisfies SummaryDelta;
};
