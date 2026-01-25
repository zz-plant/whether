/**
 * Cadence alignment helper for comparing weekly vs monthly guidance.
 * Uses regime agreement and constraint themes to surface drift.
 */
import type { MonthlySummary } from "./summary/monthlySummary";
import type { WeeklySummary } from "./summary/weeklySummary";

export type CadenceAlignmentStatus = "aligned" | "watch" | "mismatch";

export type CadenceAlignment = {
  status: CadenceAlignmentStatus;
  weeklyThemes: string[];
  monthlyThemes: string[];
  sharedThemes: string[];
  mismatchedConstraints: string[];
  note: string;
};

type ConstraintTheme = {
  label: string;
  pattern: RegExp;
};

const CONSTRAINT_THEMES: ConstraintTheme[] = [
  { label: "Cash preservation", pattern: /cash|runway|payback|capital|spend/i },
  { label: "Hiring control", pattern: /hiring|headcount|staff/i },
  { label: "Retention & margin", pattern: /retention|margin|durability/i },
  { label: "Experiment control", pattern: /experiment|experiments|novelty|pivots/i },
  { label: "Reliability & security", pattern: /reliability|security/i },
  { label: "Proof emphasis", pattern: /proof|references|guarantee|certainty/i },
  { label: "Speed & distribution", pattern: /speed|distribution|share/i },
  { label: "Growth investment", pattern: /invest|demand|capture/i },
  { label: "Sales efficiency", pattern: /sales|conversion/i },
];

const buildThemeList = (constraints: string[]) => {
  const themes = new Set<string>();

  constraints.forEach((constraint) => {
    CONSTRAINT_THEMES.forEach(({ label, pattern }) => {
      if (pattern.test(constraint)) {
        themes.add(label);
      }
    });
  });

  if (themes.size > 0) {
    return Array.from(themes);
  }

  return constraints.slice(0, 2).map((constraint) => constraint.replace(/[.\s]+$/, ""));
};

const formatThemeList = (themes: string[]) => {
  if (themes.length === 0) {
    return "";
  }

  const [first, second, ...rest] = themes;
  if (!second) {
    return first;
  }

  if (rest.length === 0) {
    return `${first} and ${second}`;
  }

  return `${first}, ${second}, +${rest.length} more`;
};

export const buildCadenceAlignment = (
  weeklySummary: WeeklySummary,
  monthlySummary: MonthlySummary
): CadenceAlignment => {
  const weeklyThemes = buildThemeList(weeklySummary.constraints);
  const monthlyThemes = buildThemeList(monthlySummary.constraints);
  const sharedThemes = weeklyThemes.filter((theme) => monthlyThemes.includes(theme));
  const mismatchedConstraints = [
    ...weeklyThemes.filter((theme) => !monthlyThemes.includes(theme)),
    ...monthlyThemes.filter((theme) => !weeklyThemes.includes(theme)),
  ];
  const regimesMatch = weeklySummary.regime === monthlySummary.regime;

  let status: CadenceAlignmentStatus = "aligned";
  if (!regimesMatch) {
    status = "mismatch";
  } else if (mismatchedConstraints.length > 0) {
    status = "watch";
  }

  let note = "Weekly and monthly guidance reinforce the same constraints.";
  if (!regimesMatch) {
    note = `Weekly (${weeklySummary.regimeLabel}) and monthly (${monthlySummary.regimeLabel}) regimes diverge; reconcile before locking roadmaps.`;
  } else if (sharedThemes.length > 0) {
    note = `Weekly and monthly guidance align on ${formatThemeList(sharedThemes)}.`;
  } else if (mismatchedConstraints.length > 0) {
    note = `Regimes match, but constraint themes diverge: ${formatThemeList(
      mismatchedConstraints
    )}.`;
  }

  return {
    status,
    weeklyThemes,
    monthlyThemes,
    sharedThemes,
    mismatchedConstraints,
    note,
  };
};
