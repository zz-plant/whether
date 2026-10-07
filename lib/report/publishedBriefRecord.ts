/**
 * Turns the current week's live brief into the record `data/published_briefs.json` carries.
 *
 * Two writers share this: `scripts/freezeWeeklyBrief.ts`, which appends to the file on a
 * workstation or in a routine, and `worker/workflows/weeklyBriefFreeze.ts`, which does the
 * same from inside Cloudflare behind a pull request. They used to be one script, which
 * meant the Workflow would have had to re-derive the record shape and drift from it.
 *
 * Readiness is judged by `assessPublishReadiness` before a record is built at all: the
 * archive is append-only and citable, so a week frozen from fallback data is a permanent
 * wrong record (lib/report/briefPublishGuard.ts has the 2026-08-29 history).
 */
import { formatIsoWeekSlug, getIsoWeekInfo, type IsoWeek } from "../isoWeek";
import { previousScoresFromDynamics } from "../export/scoreReference";
import { assessPublishReadiness } from "./briefPublishGuard";
import type { PublishedBrief } from "./publishedBriefs";
import { loadWeeklyBriefSnapshot, type WeeklyBriefSnapshot, type WeeklyBriefSnapshotResult } from "./weeklyBriefSnapshot";

/**
 * The two scores' moves, and the reading they are measured against.
 *
 * The comparison behind the week's dynamics is the previous month-end snapshot,
 * not last week, and the record used to keep the moves without the date: w38,
 * w39 and w40 all stored a move from Aug 31's 63/56, and the page printed each
 * as "vs prior week". A move is stored only with the reading it is against, so
 * a record with no named comparison stores none rather than one nobody can date.
 * The earlier scores come from `previousScoresFromDynamics`, the derivation every
 * paste and page shares, so a signal that moved under the reporting floor is a
 * zero move rather than a missing one.
 */
const scoresWithComparison = (reportData: WeeklyBriefSnapshotResult["reportData"]): NonNullable<PublishedBrief["scores"]> => {
  const current = {
    tightness: reportData.assessment.scores.tightness,
    riskAppetite: reportData.assessment.scores.riskAppetite,
  };
  const previous = previousScoresFromDynamics(reportData.reportDynamics, current);
  const comparedWith = previous?.comparedWith;
  if (!previous || !comparedWith) return { ...current, tightnessDelta: null, riskAppetiteDelta: null };
  const move = (metric: keyof typeof current) => Math.round((current[metric] - previous[metric]) * 10) / 10;
  return {
    ...current,
    tightnessDelta: move("tightness"),
    riskAppetiteDelta: move("riskAppetite"),
    comparedWith: { recordDate: comparedWith.recordDate, label: comparedWith.label },
  };
};

type PublishedBriefRecordInput = {
  reportData: WeeklyBriefSnapshotResult["reportData"];
  snapshot: WeeklyBriefSnapshot;
  recordDate: string;
  isoWeek: IsoWeek;
  /** A record already frozen for this week; its `publishedAt` and `correction` are kept. */
  existing?: PublishedBrief;
};

export const buildPublishedBriefRecord = ({
  reportData,
  snapshot,
  recordDate,
  isoWeek,
  existing,
}: PublishedBriefRecordInput): PublishedBrief => {
  const { homeBriefModel } = snapshot;
  return {
    slug: formatIsoWeekSlug(isoWeek),
    year: isoWeek.year,
    week: isoWeek.week,
    publishedAt: existing?.publishedAt ?? new Date(recordDate).toISOString(),
    recordDate,
    recordDateLabel: reportData.recordDateLabel,
    headline: `${homeBriefModel.postureWithStageLabel} — week of ${reportData.recordDateLabel}`,
    summary: homeBriefModel.operatingStanceLine,
    postureLabel: homeBriefModel.postureWithStageLabel,
    regime: reportData.assessment.regime,
    confidenceLabel: homeBriefModel.confidenceLabel,
    /* No `??` here. The summary is always a string, so the fallback that used
       to sit on this line — "No material change from the prior week." — could
       only ever have written a claim about a comparison into an append-only,
       citable record without one having been made. The summary itself now says
       when nothing was compared. */
    whatChanged: homeBriefModel.weeklyMovement.summary,
    actionNow: reportData.actionNowShort,
    guardrailThreshold: reportData.guardrailThreshold,
    flipThreshold: reportData.flipThreshold,
    decisions: homeBriefModel.decisionRules.map((rule) => ({
      area: rule.area,
      call: rule.recommendation,
      doNow: rule.doNow[0] ?? "",
      pauseTrigger: rule.pauseTrigger,
      resumeTrigger: rule.resumeTrigger,
      pause: rule.pause.conditions,
      resume: rule.resume.conditions,
      pauseQualifier: rule.pause.qualifier,
      resumeQualifier: rule.resume.qualifier,
    })),
    /*
     * The moves come from `reportDynamics`. They used to read `diagnostics`,
     * whose two fields carry a distance from the regime threshold — so a week
     * that moved nothing at all would have been published, permanently, as
     * having moved by however far the score sat above the line. A comment here
     * then called the `reportDynamics` move "the week-over-week move", which it
     * is not: it is the move since the previous month-end, and it now carries
     * that reading's date (`scoresWithComparison`).
     */
    scores: scoresWithComparison(reportData),
    evidence: reportData.reportEvidenceItems.map((item) => ({
      title: item.title,
      detail: item.immediateImplication,
      sourceUrl: reportData.treasury.source,
    })),
    sourceLabel: reportData.treasuryProvenance?.statusLabel ?? "US Treasury via FRED",
    sourceUrl: reportData.treasury.source,
    freshnessLabel: reportData.fetchedAtLabel,
    correction: existing?.correction ?? null,
  };
};

type AssembleCurrentWeekBriefResult =
  | { ok: true; record: PublishedBrief; slug: string; recordDate: string }
  | { ok: false; reason: string; recordDate: string | null };

type AssembleCurrentWeekBriefOptions = {
  now?: Date;
  /** Names the caller in the report path's context, as the script and the Workflow do. */
  route?: string;
  /** Injectable for tests; defaults to the live report path. */
  load?: () => Promise<Pick<WeeklyBriefSnapshotResult, "reportData" | "degraded" | "snapshot">>;
  /** Looks up a record already frozen under the slug, so a re-freeze keeps its stamps. */
  findExisting?: (slug: string) => PublishedBrief | undefined;
};

/**
 * Loads the live brief, refuses it unless it is publishable, and builds this week's record.
 * The refusal carries the guard's reason so both writers can print it and stop.
 */
export const assembleCurrentWeekBrief = async ({
  now = new Date(),
  route = "brief:freeze",
  load = () => loadWeeklyBriefSnapshot(undefined, { route }),
  findExisting,
}: AssembleCurrentWeekBriefOptions = {}): Promise<AssembleCurrentWeekBriefResult> => {
  const { reportData, degraded, snapshot } = await load();
  const recordDate = reportData.treasury.record_date ?? reportData.treasury.fetched_at;

  const readiness = assessPublishReadiness({
    degraded,
    isFallback: snapshot.isFallback,
    isLive: reportData.treasury.isLive,
    fallbackReason: reportData.treasury.fallback_reason,
    recordDate,
    now,
  });

  if (!readiness.ok) {
    return { ok: false, reason: readiness.reason, recordDate: recordDate ?? null };
  }

  const isoWeek = getIsoWeekInfo(new Date(recordDate));
  const slug = formatIsoWeekSlug(isoWeek);
  const record = buildPublishedBriefRecord({
    reportData,
    snapshot,
    recordDate,
    isoWeek,
    existing: findExisting?.(slug),
  });

  return { ok: true, record, slug, recordDate };
};
