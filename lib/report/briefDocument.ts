import { ENGINE_VERSION, type RegimeAssessment } from "../regimeEngine";
import { weeklyHeadline } from "./reportEvidence";
import type { MacroSeriesReading, SensorReading, TreasuryData } from "../types";
import type { OperatingSnapshot } from "../operatingState/types";
import type { BriefArtifact, BriefDocument } from "./briefArtifact";
import type { ReportData, ReportDataFallback } from "./reportData";
import { applyStageToWeeklyCall, type WeeklyCallContract } from "./weeklyCallContract";
import { buildCanonicalBoundedDecisionRules, type StartupVariantMode } from "./boundedDecisionRules";
import { buildActionStripItems } from "./operatingCalls";
import { resolvePublishedConfidence } from "./confidence";
import { buildPublishedBriefPath, selectCitablePermalinkBrief } from "./publishedBriefs";
import { RUNWAY_BAND_OPTIONS } from "./operatorRunway";
import { buildRunwayConditionedNotes, resolveRunwayForNotes } from "./runwayConditionedNotes";
import { getRegimePublicLabel } from "../regimePresentation";
import { buildSensorReadings } from "../sensors";
import { describeConditions, pauseConditionOnly } from "../export/exportTerms";
import { buildBriefPermalinkUrl } from "../export/briefPermalink";
import { previousScoresFromDynamics, type PreviousReading } from "../export/scoreReference";
import { resolveWeekDynamics } from "./weekComparison";
import { buildPostureState } from "./postureStateSource";
import type { PostureStateContract } from "./postureStateContract";
import { buildWeeklyBriefSnapshot } from "./weeklyBriefSnapshot";
import { isSavedCopy, publisherSourceLabel } from "./provenanceStatus";
import { resolveScoringBasis, type ScoringBasis } from "./scoringBasis";

/**
 * What a brief document is built from: one reading, wherever it was read.
 *
 * The cron holds an `OperatingSnapshot` and the read path a `ReportData`; both
 * carry the assessment, the treasury record and the macro series, and differ
 * only in what else they know. The two adapters below say which is which, so
 * the builder never guesses.
 */
type BriefDocumentSource = {
  assessment: RegimeAssessment;
  treasury: TreasuryData;
  macroSeries: readonly MacroSeriesReading[];
  /** The record date as displayed ("Aug 28, 2026"). */
  recordDateLabel: string;
  /** The provenance label, as the page names the source. */
  sourceLabel: string;
  /** The readings the read path already holds; derived from the treasury record when absent. */
  sensors?: readonly SensorReading[];
  /** The earlier scores, when the read carries a comparison. */
  previousScores?: PreviousReading | null;
  /** A Time Machine read, which publishes no live confidence. */
  historical?: boolean;
  /**
   * Which inputs set the scores, from the engine that scored the reading
   * (`resolveScoringBasis`). A source that names none was scored by the
   * current engine, as a read built here is.
   */
  scoringBasis?: ScoringBasis;
};

/**
 * The reading the cron just materialized, with the earlier reading its weekly call
 * was compared with (`resolveWeekDynamics`, the snapshot's own). It carried none
 * until 2026-10-07, so the Monday email and Slack post said "Conditions are
 * tightening" and never against what.
 */
export const briefSourceFromSnapshot = (snapshot: OperatingSnapshot): BriefDocumentSource => ({
  assessment: snapshot.assessment,
  treasury: snapshot.treasury,
  macroSeries: snapshot.macroSeries,
  recordDateLabel: snapshot.provenance.recordDateLabel,
  sourceLabel: snapshot.provenance.sourceLabel,
  previousScores: previousScoresFromDynamics(
    resolveWeekDynamics(snapshot.assessment, snapshot.recordDate).reportDynamics,
    snapshot.assessment.scores,
  ),
  scoringBasis: resolveScoringBasis({ engineVersion: snapshot.engineVersion, assessment: snapshot.assessment }),
});

/** The reading the page read path serves, with the comparison it carries. */
export const briefSourceFromReportData = (reportData: ReportData | ReportDataFallback): BriefDocumentSource => ({
  assessment: reportData.assessment,
  treasury: reportData.treasury,
  macroSeries: reportData.macroSeries,
  recordDateLabel: reportData.recordDateLabel,
  sourceLabel: reportData.treasuryProvenance.sourceLabel,
  sensors: reportData.sensors,
  previousScores: previousScoresFromDynamics(reportData.reportDynamics, reportData.assessment.scores),
  historical: Boolean(reportData.historicalSelection),
  scoringBasis: reportData.scoringBasis,
});

/**
 * The area rows as the page derives them: the canonical rules, judged against
 * this week's scores so each line carries its distance. The Monday post built
 * them without the scores (`buildGuidanceBundleFromAssessment`), so its rows
 * printed the lines with no distance while /share printed the same rows with one.
 */
const buildAreaRows = (assessment: RegimeAssessment) =>
  buildActionStripItems(
    buildCanonicalBoundedDecisionRules({
      regime: assessment.regime,
      thresholds: assessment.thresholds,
      scores: assessment.scores,
    }),
    { tightness: assessment.scores.tightness, riskAppetite: assessment.scores.riskAppetite },
  );

/** What the week means at each runway band, for a format that writes to many companies at once. */
const buildEveryBandRunway = (regime: RegimeAssessment["regime"]): BriefDocument["runway"]["everyBand"] =>
  RUNWAY_BAND_OPTIONS.flatMap((band) => {
    const runway = resolveRunwayForNotes({ band: band.key });
    if (!runway) return [];
    return [{ phrase: runway.runwayPhrase, notes: buildRunwayConditionedNotes({ regime, ...runway }).map((note) => note.note) }];
  });

/**
 * The week as one document, built once.
 *
 * `weeklyCall` is the contract the email, the operator brief and the homepage
 * print; every call slot comes from it. A `stage` lays that stage's discipline
 * over the call the way the homepage does (`applyStageToWeeklyCall`), so the
 * slide a reader downloads for their stage is the call the brief shows them,
 * and a held call stays held whatever the stage.
 */
export const buildBriefDocument = (
  source: BriefDocumentSource,
  weeklyCall: WeeklyCallContract,
  options: { title?: string; stage?: StartupVariantMode | null } = {},
): BriefDocument => {
  const { assessment, treasury } = source;
  const stage = options.stage ?? undefined;
  const call = stage
    ? applyStageToWeeklyCall(weeklyCall, { assessment, startupVariantMode: stage })
    : weeklyCall;
  const stageLabel = stage ? call.stageScopedAdjustments?.[stage]?.label : undefined;
  const confidence = resolvePublishedConfidence({ assessment, record: treasury, historical: source.historical }).label;
  const citableBrief = selectCitablePermalinkBrief(treasury.record_date);
  const isFallback = isSavedCopy(treasury);
  const pauseIf = pauseConditionOnly(call.pauseIf);
  const sensors = source.sensors ?? buildSensorReadings(treasury);
  const thresholds = assessment.thresholds;
  const sourceLabel = publisherSourceLabel(source.sourceLabel);
  const scoringBasis = source.scoringBasis ?? resolveScoringBasis({ engineVersion: ENGINE_VERSION, assessment });

  return {
    /* The artifact the share rail renders, field for field as /share published it. */
    title: options.title ?? "Whether Weekly Brief",
    recordDateLabel: source.recordDateLabel,
    /* The week's headline (`weeklyHeadline`), the sentence the homepage leads
       with. The action went here and the call was dropped, then printed under
       "Guidance" by other formats, so one week pasted two different headlines;
       `actionNow` repeats it so no format adds a competing do-now line. */
    call: weeklyHeadline(call).composed,
    actionNow: weeklyHeadline(call).composed,
    guardrail: pauseIf,
    reversal: call.callChangesIf,
    resumeWhen: call.resumeWhen,
    clearsWhen: call.flipConditionLabels,
    regimeLabel: getRegimePublicLabel(assessment.regime),
    tightness: assessment.scores.tightness,
    riskAppetite: assessment.scores.riskAppetite,
    confidenceLabel: confidence,
    source: treasury.source?.startsWith("http") ? "FRED" : treasury.source ?? "FRED",
    permalinkPath: citableBrief ? buildPublishedBriefPath(citableBrief.slug) : undefined,
    isFallback,
    regime: assessment.regime,
    recordDate: treasury.record_date,
    lines: { tightness: thresholds.tightnessRegime, riskAppetite: thresholds.riskAppetiteRegime },
    stageLabel,
    sourceLabel,
    basis: scoringBasis.sentence,

    conditions: {
      regime: assessment.regime,
      label: call.regimeStage,
      line: describeConditions(assessment.regime, call.regimeStage),
    },
    confidence,
    provenance: {
      sourceLabel,
      sourceUrl: treasury.source,
      recordDate: treasury.record_date,
      isFallback,
      permalink: buildBriefPermalinkUrl(treasury.record_date),
      scoringBasis,
    },
    slots: {
      currentCall: call.currentCall,
      actionNow: call.actionNow,
      pauseIf,
      callChangesIf: call.callChangesIf,
      ...(call.resumeWhen ? { resumeWhen: call.resumeWhen } : {}),
      doNowBullets: call.doNowBullets,
      flipConditionLabels: call.flipConditionLabels,
      whyCouldBeWrong: call.whyCouldBeWrong,
      policyOverrideActive: call.policyOverrideActive,
    },
    readings: {
      scores: { tightness: assessment.scores.tightness, riskAppetite: assessment.scores.riskAppetite },
      thresholds,
      vsThreshold: {
        tightness: assessment.diagnostics.tightnessVsThreshold,
        riskAppetite: assessment.diagnostics.riskAppetiteVsThreshold,
      },
      previous: source.previousScores ?? null,
      baseRate: sensors.find((sensor) => sensor.id === "BASE_RATE")?.value ?? null,
      baseRateUsed: assessment.scores.baseRateUsed,
      curveSlope: sensors.find((sensor) => sensor.id === "CURVE_SLOPE")?.value ?? null,
      macros: source.macroSeries,
    },
    areaRows: buildAreaRows(assessment),
    constraints: assessment.constraints,
    runway: { everyBand: buildEveryBandRunway(assessment.regime) },
  };
};

/**
 * The document for a report read, under the call the read path serves every
 * page: the stored contract when the read projects the operating snapshot, else
 * one built from this read with the canonical copy the posture state adds — the
 * call /share, the homepage and the email print. The Slack routes and the
 * weekly artifact script each re-derived the call from the lead area row and
 * the assessment's description instead.
 */
export const buildBriefDocumentFromReport = async (
  reportData: ReportData | ReportDataFallback,
  {
    degraded,
    postureState: providedPostureState,
  }: {
    degraded: boolean;
    /** The caller's own, when it already built one for this read; one decision-events read is enough. */
    postureState?: PostureStateContract;
  },
): Promise<BriefDocument> => {
  const postureState = providedPostureState ?? await buildPostureState({
    record: reportData.treasury,
    historical: Boolean(reportData.historicalSelection),
    assessment: reportData.assessment,
    reportDynamics: reportData.reportDynamics,
  });
  const { weeklyCall } = buildWeeklyBriefSnapshot({ reportData, degraded, postureState });
  return buildBriefDocument(briefSourceFromReportData(reportData), weeklyCall);
};

/**
 * The island a page publishes for the share rail and the presentation frames:
 * the artifact's own fields and nothing else, because the island is parsed
 * field by field in the browser and the rest of the document is the server's.
 */
export const briefArtifactOf = (document: BriefDocument): BriefArtifact => ({
  title: document.title,
  recordDateLabel: document.recordDateLabel,
  call: document.call,
  actionNow: document.actionNow,
  guardrail: document.guardrail,
  reversal: document.reversal,
  resumeWhen: document.resumeWhen,
  clearsWhen: document.clearsWhen,
  regimeLabel: document.regimeLabel,
  tightness: document.tightness,
  riskAppetite: document.riskAppetite,
  confidenceLabel: document.confidenceLabel,
  source: document.source,
  revisit: document.revisit,
  noChangeAreas: document.noChangeAreas,
  permalinkPath: document.permalinkPath,
  isFallback: document.isFallback,
  regime: document.regime,
  recordDate: document.recordDate,
  lines: document.lines,
  stageLabel: document.stageLabel,
  sourceLabel: document.sourceLabel,
  basis: document.basis,
});
