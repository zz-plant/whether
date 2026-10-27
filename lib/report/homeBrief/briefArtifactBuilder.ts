import type { assembleHomePage } from "../homePageAssembler";
import type { BriefArtifact } from "../briefArtifact";
import type { WeeklyCallContract } from "../weeklyCallContract";
import type { ReportData, ReportDataFallback } from "../reportData";
import { decisionAreaLabel } from "../boundedDecisionRules";
import { getRegimePublicLabel } from "../../regimePresentation";
import { DECISION_CONTRACT_LABELS } from "../reportCopy";
import { buildPublishedBriefPath, selectCitablePermalinkBrief } from "../publishedBriefs";
import { briefArtifactOf, briefSourceFromReportData, buildBriefDocument } from "../briefDocument";
import { publisherSourceLabel } from "../provenanceStatus";
import { weeklyHeadline } from "../reportEvidence";

type HomePageAssembly = Awaited<ReturnType<typeof assembleHomePage>>;
type WeeklyCard = HomePageAssembly["weeklyDecisionCardModel"];

/**
 * The call, its bounded conditions and its revisit queue, derived once.
 *
 * `app/page.tsx` computed these inline for the hero, then assembled the share
 * artifact from the same locals. When `/share` needed the same artifact it would
 * have had to repeat fifty lines of derivation — the guardrail label alone has
 * three fallbacks — which `lib/report/AGENTS.md` names as the thing that belongs
 * here instead: "if a UI change requires several components to redefine the
 * same copy, the copy belongs here."
 */
export const deriveBriefCallFields = (
  card: WeeklyCard,
  weeklyCall: Pick<WeeklyCallContract, "actionNow" | "currentCall">,
) => {
  const { decision } = card;
  /* The week's headline action, from the one source every surface reads
     (`weeklyHeadline`, docs/claims-ledger.md): the h1, the sticky strip, Copy
     Brief and the share panel. It was the action (`actionNowShort`) while the
     frozen brief led with the call, so one week had two headlines. */
  const headline = weeklyHeadline(weeklyCall);
  const primaryCall = headline.composed;
  const flipConditionLabels = decision.compactFlipConditionLabels ?? [];
  const revisitQueue = decision.revisitQueue;
  const revisitAreaIds = new Set(revisitQueue.map((item) => item.id));
  const noChangeAreas = decision.decisionRules
    .filter((rule) => !revisitAreaIds.has(rule.area))
    .map((rule) => decisionAreaLabel(rule.area));

  const guardrailThresholdRaw = decision.guardrailThreshold;
  const parsedGuardrailThreshold = typeof guardrailThresholdRaw === "number"
    ? guardrailThresholdRaw
    : Number.parseFloat(String(guardrailThresholdRaw ?? ""));
  const numericGuardrailLabel = Number.isFinite(parsedGuardrailThreshold)
    ? `Funding pressure crosses ${parsedGuardrailThreshold}`
    : undefined;
  const guardrailLabel = numericGuardrailLabel
    ?? decision.guardrail
    ?? (typeof guardrailThresholdRaw === "string" ? guardrailThresholdRaw : undefined);
  const reversalTriggerLabel = decision.reversalTrigger;
  const resumeWhenLabel = decision.resumeWhen;

  /* No week-level do-now line: it was the action the headline replaced, and under
     the headline it read as a second instruction for the same week. */
  const briefShareLines = [
    guardrailLabel ? `${DECISION_CONTRACT_LABELS.threshold.pauseIf}: ${guardrailLabel}` : null,
    reversalTriggerLabel ? `${DECISION_CONTRACT_LABELS.watch.postureFlips}: ${reversalTriggerLabel}` : null,
    resumeWhenLabel ? `${DECISION_CONTRACT_LABELS.reversal.resumeWhen}: ${resumeWhenLabel}` : null,
    flipConditionLabels.length > 0
      ? `${DECISION_CONTRACT_LABELS.watch.watchThisWeek}: ${flipConditionLabels.join("; ")}`
      : null,
  ].filter((line): line is string => Boolean(line));

  return {
    headline,
    primaryCall,
    flipConditionLabels,
    revisitQueue,
    noChangeAreas,
    guardrailLabel,
    /* Returned because `guardrailMatchesRule` needs it: the hero may draw the
     * canonical corridor only when the guardrail sentence being printed is the
     * one those lines describe, and a stage-scoped or policy override replaces
     * that sentence. Deriving it twice is how the two would drift. */
    parsedGuardrailThreshold,
    reversalTriggerLabel,
    resumeWhenLabel,
    briefShareLines,
  };
};

/**
 * The week as the one object every copy format and the presentation frames
 * render. Only the frozen record is offered as a permalink: `/` re-renders every
 * week under one URL, so a citation pointing at it has to say so rather than
 * imply a fixed reference. `selectCitablePermalinkBrief` returns nothing once
 * the archive falls behind, and the citation format degrades to the live page.
 */
export const buildBriefArtifact = ({
  homepage,
  recordDate,
  title,
}: {
  homepage: HomePageAssembly;
  /** ISO record date, for the permalink lookup. */
  recordDate: string;
  title: string;
}): BriefArtifact => {
  const card = homepage.weeklyDecisionCardModel;
  const fields = deriveBriefCallFields(card, homepage.weeklyCall);
  const citableBrief = selectCitablePermalinkBrief(recordDate);
  const treasurySource = homepage.reportShell.treasurySource;
  const { thresholds } = (homepage.reportResult.ok ? homepage.reportResult.data : homepage.reportResult.fallback).assessment;

  return {
    title,
    recordDateLabel: homepage.reportShell.recordDateLabel,
    call: fields.primaryCall,
    actionNow: fields.primaryCall,
    guardrail: fields.guardrailLabel,
    reversal: fields.reversalTriggerLabel,
    resumeWhen: fields.resumeWhenLabel,
    clearsWhen: fields.flipConditionLabels,
    regimeLabel: getRegimePublicLabel(homepage.reportShell.regime),
    tightness: card.diagnostics.currentScores.tightness,
    riskAppetite: card.diagnostics.currentScores.riskAppetite,
    confidenceLabel: card.status.confidenceLabel,
    source: treasurySource?.startsWith("http") ? "FRED" : treasurySource ?? "FRED",
    revisit: fields.revisitQueue.map((item) => ({ label: item.label, recheck: item.recheck })),
    noChangeAreas: fields.noChangeAreas,
    permalinkPath: citableBrief ? buildPublishedBriefPath(citableBrief.slug) : undefined,
    isFallback: homepage.reportShell.showOfflineBadge,
    /* What the slide reads: it printed the conditions label as the reader's
       stage, the weather word as the engine key and the engine's default lines. */
    regime: homepage.reportShell.regime,
    recordDate,
    lines: { tightness: thresholds.tightnessRegime, riskAppetite: thresholds.riskAppetiteRegime },
    sourceLabel: publisherSourceLabel(homepage.reportShell.provenance.sourceLabel),
  };
};

/**
 * The same artifact from the persisted operating snapshot.
 *
 * `/share` renders strictly from the `OperatingSnapshot` — its test replaces
 * `fetch` with a throw to hold that line — so it cannot take the home assembly,
 * which reads cookies and may refresh upstream. The snapshot's call contract
 * has every field the copy formats print; only the revisit queue is absent,
 * which the formats already treat as optional. It is the artifact half of the
 * brief document (`lib/report/briefDocument.ts`), so the island /operate
 * publishes and the formats /share renders are one derivation.
 */
export const buildBriefArtifactFromSnapshot = ({
  reportData,
  weeklyCall,
  title,
}: {
  reportData: ReportData | ReportDataFallback;
  weeklyCall: WeeklyCallContract;
  title: string;
}): BriefArtifact => briefArtifactOf(buildBriefDocument(briefSourceFromReportData(reportData), weeklyCall, { title }));

/**
 * The /api/decision memo, from the assembled week. Its action, pause line,
 * "Conditions change if", shift summary and memo lines are the weekly contract's,
 * as every paste prints them (docs/claims-ledger.md); `tests/weeklyClaimParity.test.tsx`
 * holds it to them. The action read the home model's, which says the same sentence
 * by a second path, and the memo lines and shift summary were the home model's own:
 * on the held week the parity test renders they said "Conditions change if: Funding
 * pressure rises 25 pts to clear 70 (45 today) or risk appetite falls 12 pts to 50 or
 * below (62 today)." beside a trigger that said the scores had to agree first.
 */
export const buildDecisionMemo = (homepage: Pick<HomePageAssembly, "weeklyCall" | "weeklyDecisionCardModel">) => {
  const model = homepage.weeklyDecisionCardModel;
  return {
    action: homepage.weeklyCall.actionNow,
    stance: model.status.postureLabel,
    postureWithStage: model.status.postureWithStageLabel,
    regime: model.status.regimeKey ?? "EXPANSION",
    confidence: model.status.confidenceLabel,
    guardrail: model.decision.guardrail,
    reversalTrigger: model.decision.reversalTrigger,
    decisionShift: model.decision.decisionShiftSummary,
    revisitDecisions: model.decision.revisitDecisions,
    actionStripItems: model.decision.actionStripItems?.map((item) => ({
      area: item.areaActionNow,
      threshold: item.triggerThreshold,
      reversal: item.reversalCondition,
    })),
    watchItems: model.decision.flipThreshold
      ? [model.decision.flipThreshold]
      : model.decision.compactFlipConditionLabels ?? [],
    weeklyMemoLines: model.decision.weeklyMemoLines,
  };
};
