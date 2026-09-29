import { z } from "zod";
import { REGIME_KEYS } from "./agent/inputs";
import { loadAgentInterfaceContext, type AgentInterfaceContext } from "./agentInterface";
import { REGIME_WEATHER_RATIONALES } from "./regimePresentation";
import { ruleMetricLabel } from "./report/boundedDecisionRules";
import { assessPublishReadiness } from "./report/briefPublishGuard";
import { comparisonBasis } from "./report/comparisonBasis";
import { findSignalDelta } from "./report/evidenceReaderModel";
import { buildSharedCorridorRails } from "./report/operatingCalls";
import { describeScoreMovementCaveat, listScoreMovementParts } from "./report/scoreMovement";
import { signalReadingMeaning } from "./report/signalTranslations";
import { buildUseConstraint } from "./report/useConstraint";
import { siteUrl } from "./siteUrl";

/**
 * The compact state an agent decides from.
 *
 * The full brief answers "everything Whether says this week" in about 22KB, and
 * over MCP twice that, of which the part an agent acts on is under 2KB: which
 * conditions, how sure, whether the data is live and current, where each score sits
 * against its lines, what moved and why, and the guidance. Those facts were spread
 * across `/api/scores` (no lines, no guidance), `/api/cli/status` (no scores) and
 * `/api/agent` (buried), each with its own field names. This is one answer, built
 * from the same context as the full brief, with its shape published as a schema so
 * an agent can read the contract without making a call.
 *
 * Machine fields keep the names the rest of the API uses (`tightness`,
 * `riskAppetite`); each carries the name a reader sees beside it (`label`).
 */

const sideSchema = z.enum(["above", "below", "at"]);

const lineSchema = z.object({
  line: z.number().describe("The score at which this line sits."),
  distance: z.number().describe("Points between today's score and the line; never negative."),
  side: sideSchema.describe("Which side of the line today's score is on."),
});

const conditionLineSchema = lineSchema.extend({
  met: z.boolean().describe("True when the line's condition holds today: for the pause line, that the pause applies."),
});

const scoreSchema = z.object({
  label: z.string().describe("The name a reader sees for this score."),
  value: z.number().describe("Today's score, 0 to 100."),
  meaning: z.string().describe("What today's level means, in words."),
  pause: conditionLineSchema.nullable().describe("The line past which new commitments pause; null when none is stated this week."),
  resume: conditionLineSchema.nullable().describe("The line past which paused work resumes; null when none is stated this week."),
  change: lineSchema.describe("The line at which the conditions themselves change."),
  previous: z.number().nullable().describe("The score at the earlier reading in `change.comparedWith`; null when nothing was compared."),
  delta: z.number().nullable().describe("Today's score minus `previous`, over the whole span, not per week."),
  perWeek: z.number().nullable().describe("`delta` spread over the days between the two readings, in points per week: what to pass a velocity."),
  moved: z
    .array(z.object({ source: z.string(), label: z.string(), points: z.number() }))
    .describe("What `delta` is made of, signed; the points add up to `delta`. Empty when nothing moved or the split is not available."),
});

export const agentStateSchema = z.object({
  version: z.literal("v1"),
  generatedAt: z.string(),
  recordDate: z.string().describe("The date of the reading, ISO."),
  headline: z.string().describe("The state in one sentence, for an agent that only quotes."),
  freshness: z.object({
    fetchedAt: z.string(),
    recordAgeDays: z.number(),
    live: z.boolean().describe("True when the reading came from a live fetch."),
    fallback: z.boolean().describe("True when it is a saved copy, not a live reading."),
  }),
  automation: z
    .object({
      ready: z.boolean(),
      refusal: z.string().nullable().describe("Why not, when `ready` is false: a fallback reading, or one too old to name this week."),
    })
    .describe("True when the reading is live and current, so a system may act on the data without a person first confirming it is not a saved copy or stale. It says nothing about what the guidance is. Check it before automating."),
  conditions: z.object({
    key: z.enum(REGIME_KEYS).describe("The stable engine key."),
    label: z.string().describe("The word to say to a person."),
    meaning: z.string(),
  }),
  confidence: z.object({
    label: z.enum(["HIGH", "MED", "LOW"]),
    percent: z.number(),
    meaning: z.string(),
  }),
  scores: z.object({ tightness: scoreSchema, riskAppetite: scoreSchema }),
  change: z.object({
    direction: z.enum(["improving", "deteriorating", "mixed", "stable", "unavailable"]),
    regimeChanged: z.boolean(),
    comparedWith: z
      .object({ recordDate: z.string(), label: z.string() })
      .nullable()
      .describe("The earlier reading every `previous` and `delta` is measured against: the previous month-end snapshot, not last week."),
    days: z.number().nullable().describe("Days between that reading and this one."),
    note: z.string().nullable().describe("A caveat on `moved` where a part is an input the earlier score never had."),
  }),
  guidance: z.object({
    call: z.string(),
    doNow: z.array(z.string()),
    avoidNow: z.array(z.string()),
    flipConditions: z.array(z.string()).describe("What would change the guidance."),
  }),
  use: z.object({ summary: z.string(), humanReview: z.string(), policy: z.string() }),
  links: z.object({ brief: z.string(), full: z.string(), trust: z.string() }),
});

type AgentState = z.infer<typeof agentStateSchema>;

const CONFIDENCE_MEANING = "How far the scores sit from the line where conditions change. It is not a probability.";

const CONFIDENCE_WORD = { HIGH: "high", MED: "medium", LOW: "low" } as const;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const startOfUtcDay = (value: Date) => Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());

const daysBetween = (earlierIso: string, laterIso: string): number | null => {
  const earlier = new Date(earlierIso);
  const later = new Date(laterIso);
  if (Number.isNaN(earlier.valueOf()) || Number.isNaN(later.valueOf())) return null;
  return Math.round((startOfUtcDay(later) - startOfUtcDay(earlier)) / MS_PER_DAY);
};

const roundToTenth = (value: number) => Math.round(value * 10) / 10;

const positionAgainst = (value: number, line: number) => ({
  line,
  distance: roundToTenth(Math.abs(value - line)),
  side: value === line ? ("at" as const) : value > line ? ("above" as const) : ("below" as const),
});

const lowerFirst = (value: string) => `${value.charAt(0).toLowerCase()}${value.slice(1)}`;

const scoreHeadline = (score: AgentState["scores"]["tightness"]) => {
  const pause = score.pause;
  if (!pause) return `${score.label} ${score.value}`;
  const position = `${score.label} ${score.value} is ${pause.distance} ${pause.side} its pause line of ${pause.line}`;
  return pause.met ? `${position}, so the pause applies` : position;
};

export const buildAgentState = (
  { reportData, degraded, postureState }: AgentInterfaceContext,
  now = new Date(),
): AgentState => {
  const { assessment, treasury, reportDynamics, actionNowShort, startItems, stopItems, actionStripItems } = reportData;
  const confidence = {
    label: postureState.currentState.confidenceLabel,
    percent: postureState.currentState.confidencePercent,
  };
  const scores = { tightness: assessment.scores.tightness, riskAppetite: assessment.scores.riskAppetite };
  const rails = buildSharedCorridorRails(actionStripItems ?? [], scores);
  const basis = comparisonBasis(reportDynamics.comparedWith);
  const recordDate = treasury.record_date ?? treasury.fetched_at;
  const days = reportDynamics.comparedWith ? daysBetween(reportDynamics.comparedWith.recordDate, recordDate) : null;
  const isFallback = Boolean(treasury.fallback_at || treasury.fallback_reason);
  const readiness = assessPublishReadiness({
    degraded,
    isFallback,
    isLive: treasury.isLive,
    fallbackReason: treasury.fallback_reason,
    recordDate,
    now,
  });
  const recordAgeDays = daysBetween(recordDate, now.toISOString()) ?? 0;

  const scoreState = (metric: "tightness" | "riskAppetite"): AgentState["scores"]["tightness"] => {
    const value = scores[metric];
    const rail = rails.find((candidate) => candidate.metric === metric);
    const delta = findSignalDelta(reportDynamics, metric);
    const changeLine = metric === "tightness" ? assessment.thresholds.tightnessRegime : assessment.thresholds.riskAppetiteRegime;
    return {
      label: ruleMetricLabel[metric],
      value,
      meaning: signalReadingMeaning(metric, value),
      pause: rail ? { ...positionAgainst(value, rail.guardrail), met: rail.guardrailTripped } : null,
      resume:
        rail && rail.clearsAt !== undefined
          ? { ...positionAgainst(value, rail.clearsAt), met: Boolean(rail.clearHolds) }
          : null,
      change: positionAgainst(value, changeLine),
      previous: delta === null ? null : roundToTenth(value - delta),
      delta: delta === null ? null : roundToTenth(delta),
      perWeek: delta === null || !days ? null : roundToTenth((delta * 7) / days),
      moved: listScoreMovementParts(metric, reportDynamics.movement?.[metric]),
    };
  };

  const tightness = scoreState("tightness");
  const riskAppetite = scoreState("riskAppetite");
  const conditionsMeaning = lowerFirst((REGIME_WEATHER_RATIONALES[assessment.regime].split(". ")[0] ?? "").replace(/\.$/, ""));
  const label = postureState.currentState.postureLabel;

  return {
    version: "v1",
    generatedAt: now.toISOString(),
    recordDate,
    headline: [
      `${label} (${conditionsMeaning}), ${CONFIDENCE_WORD[confidence.label]} confidence, reading of ${recordDate}.`,
      `${scoreHeadline(tightness)}; ${lowerFirst(scoreHeadline(riskAppetite))}.`,
      readiness.ok ? "The data is live and current." : `Do not automate on this: ${readiness.reason}`,
    ].join(" "),
    freshness: {
      fetchedAt: treasury.fetched_at,
      recordAgeDays,
      live: treasury.isLive === true,
      fallback: isFallback,
    },
    automation: { ready: readiness.ok, refusal: readiness.ok ? null : readiness.reason },
    conditions: { key: assessment.regime, label, meaning: conditionsMeaning },
    confidence: { ...confidence, meaning: CONFIDENCE_MEANING },
    scores: { tightness, riskAppetite },
    change: {
      direction: reportDynamics.directionLabel,
      regimeChanged: reportDynamics.regimeChanged,
      comparedWith: reportDynamics.comparedWith ?? null,
      days,
      note: describeScoreMovementCaveat(reportDynamics.movement, basis),
    },
    guidance: {
      call: actionNowShort,
      doNow: startItems,
      avoidNow: stopItems,
      flipConditions: [...postureState.whatFlipsNext.thresholds],
    },
    use: buildUseConstraint(),
    links: {
      brief: `${siteUrl}/brief.md`,
      full: `${siteUrl}/api/agent?cadence=weekly`,
      trust: `${siteUrl}/trust`,
    },
  };
};

export const buildAgentStateResponse = async (route = "agent-state") =>
  buildAgentState(await loadAgentInterfaceContext(route));
