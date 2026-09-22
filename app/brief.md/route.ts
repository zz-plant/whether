import { NextResponse } from "next/server";
import { assembleHomePage } from "../../lib/report/homePageAssembler";
import { buildWeeklyOperatorBriefCopyText } from "../../lib/report/home/artifactPayload";
import { buildWeeklyTrustCueLine } from "../../lib/report/trustStatus";
import { siteUrl } from "../../lib/siteUrl";
import { renderUseConstraintMarkdown } from "../../lib/report/useConstraint";
import { getRegimePublicLabel } from "../../lib/regimePresentation";
import { weeklyCallChangeLines } from "../../lib/report/weeklyCallContract";
import { DECISION_CONTRACT_LABELS } from "../../lib/report/reportCopy";
import { formatDecisionReversal, formatDecisionThreshold } from "../../lib/report/reportFormatting";
import { describeConditions, pauseConditionOnly } from "../../lib/export/exportTerms";

type HomePage = Awaited<ReturnType<typeof assembleHomePage>>;

export const runtime = "edge";
export const revalidate = 900;

/** Interpolates primitives; anything else is JSON rather than "[object Object]" in a published artifact. */
const mdValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value);
  return JSON.stringify(value) ?? "";
};

const md = (strings: TemplateStringsArray, ...values: unknown[]) =>
  String.raw({ raw: strings }, ...values.map(mdValue));

/**
 * The document, separated from the transport so the published shape is testable.
 * `assembleHomePage` needs Next's incremental-cache context, which a route handler has
 * and a test does not; a test can build the homepage with injected fixtures and render
 * it here. See tests/briefMarkdownRoute.test.ts.
 */
export function buildBriefMarkdown(homepage: HomePage): string {
  const reportData = homepage.reportResult.ok
    ? homepage.reportResult.data
    : homepage.reportResult.fallback;

  const postureLabel = homepage.weeklyDecisionCardModel.status.postureWithStageLabel;
  const confidenceLabel = homepage.weeklyDecisionCardModel.status.confidenceLabel;
  const trustCue = buildWeeklyTrustCueLine({
    confidenceLabel,
    freshnessLabel: homepage.reportShell.fetchedAtLabel,
    /* The model's own flag: a hardcoded "OFF" told every reader the call was not close to changing. */
    transitionWatch: homepage.weeklyDecisionCardModel.status.transitionWatch,
  });

  const actionItems = homepage.weeklyDecisionCardModel.decision.actionStripItems ?? [];
  const decisions = actionItems
    .map((item) =>
      [
        `- ${item.areaActionNow}`,
        `(${DECISION_CONTRACT_LABELS.threshold.pauseIf}: ${formatDecisionThreshold(item.triggerThreshold)} · ${DECISION_CONTRACT_LABELS.reversal.resumeWhen}: ${formatDecisionReversal(item.reversalCondition)}`,
        ...(item.latencyLine ? [` · ${DECISION_CONTRACT_LABELS.timing.latency}: ${item.latencyLine}`] : []),
        ")",
      ].join(""),
    )
    .join("\n");

  const flipConditionLabels = homepage.weeklyDecisionCardModel.decision.compactFlipConditionLabels ?? [];
  const flipConditions = flipConditionLabels
    .map((label: string) => `- ${label}`)
    .join("\n");

  /*
   * The call section reads `weeklyCall`, not `canonicalDecisionCopy`.
   *
   * `canonicalDecisionCopy` was interpolated bare under the "This Week's Call" heading,
   * and it is an object — `CanonicalDecisionCopy | null`. On the live path it was null,
   * so `mdValue` returned "" and the published brief carried an empty section under its
   * own heading; had it been non-null, the same line would have pasted raw JSON into an
   * artifact people cite. `weeklyCall` is the already-resolved contract (it falls back
   * through canonicalDecisionCopy → homeBriefModel → a literal), which is what the page,
   * the Slack paste, and /api/embed all read, so the Markdown brief now agrees with them.
   */
  const weeklyCall = homepage.weeklyCall;
  /* `callChangesIf` is where the call itself changes; the lead rule's resume
     line is a separate, nearer one, and prints under its own name, as does a
     stage's `resumeWhen`. */
  const leadResume = actionItems[0]?.reversalCondition;

  const operatorCopy = buildWeeklyOperatorBriefCopyText({
    assessment: reportData.assessment,
    treasury: reportData.treasury,
    date: reportData.weeklyRecordDate,
    postureWithStageLabel: postureLabel,
    confidenceLabel,
    actionStripItems: actionItems,
    flipConditionLabels,
    canonicalDecisionCopy: homepage.weeklyDecisionCardModel.decision.canonicalDecisionCopy,
    weeklyCall: homepage.weeklyCall,
    weeklyLeadershipSummary: homepage.weeklyDecisionCardModel.decision.weeklyLeadershipSummary,
  });

  const markdown = md`
# Whether Weekly Brief — ${reportData.weeklyRecordDate}

> **Conditions:** ${describeConditions(reportData.assessment.regime, postureLabel)}  
> **Confidence:** ${trustCue}  
> **Data as of:** ${homepage.reportShell.recordDateLabel} · Refreshed: ${homepage.reportShell.fetchedAtLabel} · Source: ${homepage.reportShell.treasurySource}

---

## This Week's Call

${weeklyCall.currentCall}

**${DECISION_CONTRACT_LABELS.action.doNow}:** ${weeklyCall.actionNow}

**${DECISION_CONTRACT_LABELS.threshold.pauseIf}:** ${pauseConditionOnly(weeklyCall.pauseIf)}

${leadResume ? `**${DECISION_CONTRACT_LABELS.reversal.resumeWhen}:** ${formatDecisionReversal(leadResume)}\n\n` : ""}${weeklyCallChangeLines(weeklyCall).map(({ label, value }) => `**${label}:** ${value}`).join("\n\n")}

---

## Decisions

${decisions}

---

## Other Things That Would Change the Call

${flipConditions}

---

## Operator Brief (Copy-Paste Ready)

${operatorCopy}

---

## Provenance

- **Data source:** ${homepage.reportShell.treasurySource}
- **Record date:** ${homepage.reportShell.recordDateLabel}
- **Last refreshed:** ${homepage.reportShell.fetchedAtLabel}
- **Data status:** ${homepage.reportShell.trustStatusLabel}
- **Conditions:** ${getRegimePublicLabel(homepage.reportShell.regime)}
${homepage.reportShell.trustStatusDetail ? `- **Detail:** ${homepage.reportShell.trustStatusDetail}` : ""}
${homepage.reportShell.trustStatusAction ? `- **Action:** ${homepage.reportShell.trustStatusAction}` : ""}

---

${renderUseConstraintMarkdown()}

*Generated by [Whether](${siteUrl}) — this week's call, from public market data.*
`;

  return markdown.trim();
}

export async function GET() {
  const homepage = await assembleHomePage({ searchParams: undefined });

  /* CORS wildcard is intentional — brief.md is a public programmatic endpoint
     consumed by Slack, scripts, and AI tools. No auth or cookies involved. */
  return new NextResponse(buildBriefMarkdown(homepage), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=900, s-maxage=900",
      "Access-Control-Allow-Origin": "*",
    },
  });
}