import { getRegimePublicLabel } from "../regimePresentation";
import type { RegimeKey } from "../regimeEngineCore";

/**
 * Last week, in hindsight — computed, never typed.
 *
 * "Close the week" asked the reader to come back at week's end, tick what they
 * changed, tick what they were watching, and write a note; its own counter read
 * "0 of the last 4 weeks closed". Every fact that ritual wanted is already in
 * the delta model: what last week's readings were, where the lines to watch sat,
 * and whether anything crossed them. This states it without asking.
 *
 * The lines are the regime boundaries (the ones the hero's "Posture flips"
 * cites), because those are what decide whether the call itself changed. The
 * rule guardrails (76 / 44) belong to the plan page and are not restated here.
 */
export type HindsightInput = {
  regime: RegimeKey;
  scores: { tightness: number; riskAppetite: number };
  /** Week-over-week deltas, as the hero shows them. 0 or undefined means unchanged. */
  deltas: { tightness?: number; riskAppetite?: number };
  thresholds: { tightnessRegime: number; riskAppetiteRegime: number };
  recordDateLabel: string;
};

export type HindsightLine = {
  label: "Funding pressure" | "Risk appetite";
  previous: number;
  current: number;
  line: number;
  /** Which side of the line counts as the call changing. */
  crossesWhen: "above" | "below";
  crossed: boolean;
  /** Distance from the line this week, positive = room left. */
  room: number;
};

export type Hindsight = {
  regimeLabel: string;
  previous: { tightness: number; riskAppetite: number };
  lines: HindsightLine[];
  /** True when at least one regime line was crossed between the two reads. */
  anyCrossed: boolean;
  /** True when neither score moved at all, so there is nothing to grade. */
  quiet: boolean;
  headline: string;
  detail: string;
};

const round = (value: number) => Math.round(value * 10) / 10;

const crossed = (previous: number, current: number, line: number, when: "above" | "below") =>
  when === "above"
    ? previous <= line && current > line
    : previous >= line && current < line;

export const buildHindsight = (input: HindsightInput): Hindsight => {
  const tightnessDelta = input.deltas.tightness ?? 0;
  const riskDelta = input.deltas.riskAppetite ?? 0;
  const previous = {
    tightness: round(input.scores.tightness - tightnessDelta),
    riskAppetite: round(input.scores.riskAppetite - riskDelta),
  };
  const lines: HindsightLine[] = [
    {
      label: "Funding pressure",
      previous: previous.tightness,
      current: round(input.scores.tightness),
      line: input.thresholds.tightnessRegime,
      crossesWhen: "above",
      crossed: crossed(previous.tightness, input.scores.tightness, input.thresholds.tightnessRegime, "above"),
      room: round(input.thresholds.tightnessRegime - input.scores.tightness),
    },
    {
      label: "Risk appetite",
      previous: previous.riskAppetite,
      current: round(input.scores.riskAppetite),
      line: input.thresholds.riskAppetiteRegime,
      crossesWhen: "below",
      crossed: crossed(previous.riskAppetite, input.scores.riskAppetite, input.thresholds.riskAppetiteRegime, "below"),
      room: round(input.scores.riskAppetite - input.thresholds.riskAppetiteRegime),
    },
  ];
  const anyCrossed = lines.some((line) => line.crossed);
  const quiet = tightnessDelta === 0 && riskDelta === 0;
  const regimeLabel = getRegimePublicLabel(input.regime);

  const movement = lines
    .filter((line) => line.previous !== line.current)
    .map((line) => `${line.label} ${line.previous} → ${line.current}`)
    .join(", ");

  const headline = quiet
    ? `Nothing moved. The read is still ${regimeLabel}.`
    : anyCrossed
      ? `A line was crossed. The call is ${regimeLabel} now.`
      : `The call held. Still ${regimeLabel}.`;

  const nearest = [...lines].sort((a, b) => a.room - b.room)[0];
  const detail = quiet
    ? `Both scores match last week, so every rule still stands.`
    : anyCrossed
      ? `${movement}. ${lines.filter((l) => l.crossed).map((l) => `${l.label} went ${l.crossesWhen} ${l.line}`).join("; ")}.`
      : `${movement}. The lines were ${lines[0].line} and ${lines[1].line}; neither was reached. Closest is ${nearest.label.toLowerCase()}, ${Math.abs(nearest.room)} pts from its line.`;

  return { regimeLabel, previous, lines, anyCrossed, quiet, headline, detail };
};
