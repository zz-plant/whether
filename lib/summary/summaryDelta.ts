import { parseAgeSpanHours } from "../formatters";
import type { MonthlySummary } from "./monthlySummary";
import type { WeeklySummary } from "./weeklySummary";

type SummaryDelta = {
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

const buildProvenanceBullet = (delta: SummaryDelta["provenance"], rawAgeLabel: string) => {
  // The age label arrives sentence-terminated ("14h."); this bullet supplies its own period.
  const ageLabel = rawAgeLabel.replace(/\.$/, "");
  if (delta.ageDeltaHours === null) {
    const statusSuffix = delta.statusChanged
      ? `; data now ${delta.monthlyStatusLabel}`
      : "";
    return `Provenance timestamp ${delta.monthlyTimestampLabel}${statusSuffix}.`;
  }
  if (delta.ageDeltaHours === 0) {
    const statusSuffix = delta.statusChanged
      ? `; data now ${delta.monthlyStatusLabel}`
      : "";
    return `Provenance age unchanged at ${ageLabel}${statusSuffix}.`;
  }
  const sign = delta.ageDeltaHours > 0 ? "+" : "";
  const statusSuffix = delta.statusChanged ? `; data now ${delta.monthlyStatusLabel}` : "";
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
  // Unit-aware: this read the digits alone, so the age label "6m." (six minutes) became 6 hours.
  const weeklyAgeHours = parseAgeSpanHours(weeklySummary.provenance.ageLabel);
  const monthlyAgeHours = parseAgeSpanHours(monthlySummary.provenance.ageLabel);
  const ageDeltaHours =
    weeklyAgeHours === null || monthlyAgeHours === null
      ? null
      : Math.round((monthlyAgeHours - weeklyAgeHours) * 10) / 10;
  const statusChanged = weeklySummary.provenance.statusLabel !== monthlySummary.provenance.statusLabel;
  const regimeChanged = weeklySummary.regime !== monthlySummary.regime;
  // Reader words from the naming table ("conditions", the weather label). This
  // read "Regime steady in Freezing.", the engine's noun in a reader sentence.
  const regimeBullet = regimeChanged
    ? `Conditions changed to ${monthlySummary.regimeLabel}.`
    : `Conditions held at ${monthlySummary.regimeLabel}.`;
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
