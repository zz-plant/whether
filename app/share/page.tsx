import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { PageShell } from "../components/pageShell";
import { ActionLink } from "../components/ui/actionLink";
import { ShareCopyControls } from "./shareCopyControls";
import { GuardrailTagControls } from "./guardrailTagControls";
import { PullPolicyControls } from "./pullPolicyControls";
import { SharePageFormats } from "./sharePageFormats";
import { EmbedBuilder } from "./embedBuilder";
import { ShareImageArtifacts } from "./shareImageArtifacts";
import { BriefArtifactScript } from "../components/briefArtifactScript";
import { buildBriefArtifactFromSnapshot } from "../../lib/report/homeBrief/briefArtifactBuilder";
import { buildBoardSlideBullets, buildCallCitation, buildReadingLines, buildSlackBrief } from "../../lib/export/briefBuilders";
import { buildAreaRows } from "../operate/areaRows";
import { buildPortfolioNote } from "../../lib/export/portfolioNote";
import { buildIssueTrackerMarkdownBrief, buildGuardrailTagBlocks } from "../../lib/export/issueTrackerBrief";
import { describeConditions } from "../../lib/export/exportTerms";
import { buildFlipProximity, buildStandupFlipLine } from "../../lib/report/flipProximity";
import { buildPullPolicyBlocks } from "../../lib/report/operatingCalls";
import { buildWipGuidance } from "../../lib/report/wipPolicy";
import {
  buildWeeklyOperatorBriefPayload,
  buildWeeklyOperatorBriefPlainText,
} from "../../lib/export/weeklyOperatorBrief";
import { buildBriefPermalinkLine } from "../../lib/export/briefPermalink";
import { buildInvestorUpdateSnippetParts } from "../../lib/export/investorUpdateSnippet";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { previousScoresFromDynamics } from "../../lib/export/scoreReference";
import { getMonthlyRegimeHistory } from "../../lib/summary/monthlyRegimeHistory";
import { siteUrl } from "../../lib/siteUrl";

export const runtime = "edge";
export const revalidate = 300;

// No "| Whether" in the title: the root layout's title template already appends
// it, so carrying the brand here rendered "… | Whether | Whether".
/* Through the shared builder: with no `openGraph` of its own the page inherited
   the root layout's, so a shared /share link previewed as the homepage — its
   title, its description and its URL. The live card is the right one here: the
   page exists to hand this week's brief to someone else. */
export const metadata: Metadata = buildPageMetadata({
  title: "Share the Current Weekly Brief",
  description:
    "Copy this week's Whether guidance for Slack, a slide, or a citation; add a meeting pack or calendar hold; or embed a live brief in a newsletter or wiki.",
  path: "/share",
  imageAlt: "This week's Whether guidance",
  imageParams: { template: "report" },
});

/** "fred.stlouisfed.org" for a link's text; the raw string when it is not a URL. */
const describeSourceHost = (source: string) => {
  try {
    return new URL(source).hostname.replace(/^www\./, "");
  } catch {
    return source;
  }
};

const buildCurrentShareArtifact = async () => {
  const { reportData, snapshot } = await loadWeeklyBriefSnapshot(undefined, { route: "/share" });
  const { assessment, treasury, sensors, macroSeries } = reportData;
  /* The area rows and last week are what the builders' five-area section and
     score lines are made of; without them every paste on this page dropped the
     section and printed each score with no last week and no pause line. */
  const actionStripItems = snapshot.homeBriefModel.actionStripItems ?? [];
  const previousScores = previousScoresFromDynamics(reportData.reportDynamics, assessment.scores);
  const exportOptions = {
    postureWithStageLabel: snapshot.weeklyCall.regimeStage,
    operatingStanceLine: snapshot.weeklyCall.currentCall,
    actionStripItems,
    previousScores,
    modeledDecision: {
      postureWithStageLabel: snapshot.weeklyCall.regimeStage,
      currentCall: snapshot.weeklyCall.currentCall,
      actionNow: snapshot.weeklyCall.actionNow,
      guardrailThreshold: snapshot.weeklyCall.pauseIf,
      reversalTrigger: snapshot.weeklyCall.callChangesIf,
      actionStripItems,
    },
  };
  const weeklyOperatorBrief = buildWeeklyOperatorBriefPlainText(
    buildWeeklyOperatorBriefPayload({
      assessment,
      treasury,
      weeklyCall: snapshot.weeklyCall,
    }),
  );
  const slackBrief = buildSlackBrief(assessment, treasury, sensors, macroSeries, exportOptions);
  /*
   * The issue-tracker form was extracted from `exportBriefPanel.tsx` so it could
   * be tested, and then that panel was deleted — leaving a finished, tested
   * builder that nothing called and no reader could reach. It takes the same
   * four inputs as the Slack brief, and this page is where the formats live.
   */
  const issueTrackerBrief = buildIssueTrackerMarkdownBrief(
    assessment,
    treasury,
    sensors,
    macroSeries,
    { ...exportOptions.modeledDecision, previousScores },
  );
  /* The credential-free slice of the Linear/Jira sync: one paste-ready
     guardrail block per business area, built from the same bounded-rule fields
     the hero and Slack brief print. No tokens, no tracker integration — the
     operator pastes the block into the work item description and the card
     carries posture + pause trigger + flip condition. */
  const proximity = buildFlipProximity(assessment);
  const guardrailTagBlocks = buildGuardrailTagBlocks({
    actionStripItems,
    postureLabel: describeConditions(assessment.regime, snapshot.weeklyCall.regimeStage),
    recordDate: treasury.record_date,
    flipWatchSentence: proximity.map((entry) => entry.sentence)[0],
  });
  const standupLine = buildStandupFlipLine({
    regime: assessment.regime,
    steadyWeek: snapshot.homeBriefModel.weeklyLeadershipSummary?.steadyWeek ?? true,
    proximity,
  });
  /* Kanban pull policies: the same pause/resume conditions re-verbed for a
     pull system, copyable for a board header or wiki. */
  const pullPolicyBlocks = buildPullPolicyBlocks(actionStripItems);
  /* The same five rows the plan page tabulates, so an area's rule and its two
     lines read identically on both surfaces. */
  const areaRows = buildAreaRows(actionStripItems);
  /* The regime as a numeric WIP cap. The runway band is browser-held (cookie),
     so the server copy states the regime cap; the pull-policy section above
     carries the thresholds that gate it. */
  const wipGuidance = buildWipGuidance({ regime: assessment.regime });
  const citation = buildCallCitation(assessment, treasury, {
    postureWithStageLabel: snapshot.weeklyCall.regimeStage,
  });
  // The slide bullets rather than the board brief, which is the Slack brief
  // with the bullets appended: this pack used to paste the same block twice.
  const boardSlideBullets = buildBoardSlideBullets(assessment, treasury, macroSeries, exportOptions);
  // Monthly, against the prior month-end in the regime history, because that
  // is the cadence an investor letter compares itself on. The runway sentence
  // is composed in the browser: this page is cached and cannot read the cookie.
  const investorUpdate = buildInvestorUpdateSnippetParts({
    assessment,
    record: treasury,
    weeklyCall: snapshot.weeklyCall,
    monthlyHistory: getMonthlyRegimeHistory(),
    // The provenance label, not `treasury.source`, which is a FRED series URL on a live read.
    sourceLabel: reportData.treasuryProvenance.sourceLabel,
    isFallback: snapshot.isFallback,
  });
  /* One sender to many companies, so every runway band rather than the reader's:
     the investor update above runs the other way. */
  const portfolioNote = buildPortfolioNote({
    assessment,
    record: treasury,
    areas: areaRows.map((row) => ({ area: row.area, rule: row.rule, pause: row.pause?.line, resume: row.resume?.line })),
    sourceLabel: reportData.treasuryProvenance.sourceLabel,
    isFallback: snapshot.isFallback,
  });
  const meetingPack = [
    "WEEKLY BRIEF",
    weeklyOperatorBrief,
    "",
    "SLACK BRIEF",
    slackBrief,
    "",
    "BOARD SLIDE",
    boardSlideBullets,
    "",
    "CITATION",
    citation,
  ].join("\n");

  return {
    recordDate: treasury.record_date,
    recordDateLabel: reportData.recordDateLabel,
    assessment,
    sourceUrl: treasury.source,
    sourceHost: describeSourceHost(treasury.source),
    // The score lines the pastes below print, shown above the picker so the
    // reader sees what they are about to copy.
    scoreReferences: buildReadingLines(assessment, exportOptions),
    // The picker's object, from the same snapshot the long-form builders read.
    briefArtifact: buildBriefArtifactFromSnapshot({
      reportData,
      weeklyCall: snapshot.weeklyCall,
      title: "Whether Weekly Brief",
    }),
    slackBrief: weeklyOperatorBrief,
    emailBrief: [
      "Whether: this week's guidance",
      "",
      weeklyOperatorBrief,
      "",
      "Citation",
      citation,
      "",
      buildBriefPermalinkLine(treasury.record_date),
    ].join("\n"),
    standupLine,
    meetingPack,
    issueTrackerBrief,
    investorUpdate,
    portfolioNote,
    guardrailTagBlocks,
    areaRows,
    pullPolicyBlocks,
    wipGuidance,
    calendarDetails: [
      "Read this week's Whether guidance.",
      "",
      weeklyOperatorBrief,
      "",
      `Full brief: ${siteUrl}`,
    ].join("\n"),
  };
};

import { SubscribeForm } from "../components/SubscribeForm";
import { ExecutiveBriefingPanel } from "../operate/components/executiveBriefingPanel";

export default async function SharePage() {
  const artifact = await buildCurrentShareArtifact();

  return (
    <PageShell backdropVariant="default">
      <BriefArtifactScript artifact={artifact.briefArtifact} />
      {/* One panel per group, not six h2s inside one. `.weather-panel` is the
          padding tier, so each group's surfaces are the outermost boxes that
          draw anything and own their own elevation. */}
      <div className="space-y-5 sm:space-y-8">
        {/* No bottom padding: `.weather-panel` draws no frame, so its padding and
            the next panel's stacked with the gap between them into ~70px of
            empty ground under a three-line intro. */}
        <section className="weather-panel space-y-5 px-5 max-sm:px-0 pt-5 pb-0" aria-labelledby="share-page-title">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl space-y-2">
              {/* The week, where the kicker read "Current weekly artifact" — the
                  product's internal noun for what a reader calls the brief. */}
              <p className="type-eyebrow type-eyebrow-section">Week of {artifact.recordDateLabel}</p>
              <h1 id="share-page-title" className="text-fluid-2xl font-semibold text-white/90">Share this week&apos;s guidance</h1>
              <p className="text-sm leading-relaxed text-white/60">
                Paste it into Slack, a slide, a ticket or an email. Every format below carries the same
                pause and resume lines and names its source.
              </p>
              {/* A link named for the host, not a bare URL printed as text. */}
              <p className="text-fluid-xs text-white/60">
                Source:{" "}
                <a href={artifact.sourceUrl} className="text-sky-300 underline-offset-2 hover:underline">
                  {artifact.sourceHost}
                </a>
              </p>
            </div>
          </div>
        </section>

        <SharePageFormats scoreReferences={artifact.scoreReferences} />

        <section className="weather-panel space-y-3 px-5 max-sm:px-0 py-5" aria-labelledby="longer-formats-heading">
          <h2 id="longer-formats-heading" className="type-eyebrow">Longer formats</h2>
          <ShareCopyControls
            recordDate={artifact.recordDate}
            slackBrief={artifact.slackBrief}
            emailBrief={artifact.emailBrief}
            standupLine={artifact.standupLine}
            meetingPack={artifact.meetingPack}
            issueTrackerBrief={artifact.issueTrackerBrief}
            investorUpdate={artifact.investorUpdate}
            portfolioNote={artifact.portfolioNote}
            calendarDetails={artifact.calendarDetails}
          />
        </section>

        {/* The credential-free slice of the Linear/Jira sync, beside the ticket
            brief it extends. One paste-ready block per business area. Each
            renders its own panel, or nothing when it has no blocks. */}
        <GuardrailTagControls blocks={artifact.guardrailTagBlocks} rows={artifact.areaRows} />
        <PullPolicyControls blocks={artifact.pullPolicyBlocks} wipGuidance={artifact.wipGuidance} />

        {/* Role memos are share formats. They sat under the sixth collapsed
            section of /operate, where nobody planning a week went looking for
            a CFO memo; they belong beside Slack, email and the meeting pack. */}
        <section id="role-memos" className="weather-panel space-y-3 px-5 max-sm:px-0 py-5" aria-labelledby="role-memos-heading">
          <h2 id="role-memos-heading" className="type-eyebrow">Brief your team by role</h2>
          <ExecutiveBriefingPanel
            assessment={artifact.assessment}
            recordDateLabel={artifact.recordDateLabel}
          />
        </section>

        {/* Text formats first, then the same call as a picture. */}
        <ShareImageArtifacts />

        <div className="px-5">
          <ActionLink href="/" variant="pill">
            Return to weekly brief
          </ActionLink>
        </div>

        {/* Anchored so the retired /embed route lands on it. */}
        <section id="embed" className="weather-panel px-5 max-sm:px-0 py-5">
          <EmbedBuilder />
        </section>
      </div>

      <SubscribeForm />
    </PageShell>
  );
}
