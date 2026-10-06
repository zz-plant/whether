import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { PageShell } from "../components/pageShell";
import { ActionLink } from "../components/ui/actionLink";
import { GuardrailTagControls } from "./guardrailTagControls";
import { PullPolicyControls } from "./pullPolicyControls";
import { SharePageFormats, type ShareFormatOption } from "./sharePageFormats";
import { EmbedBuilder } from "./embedBuilder";
import { ShareImageArtifacts } from "./shareImageArtifacts";
import { BriefArtifactScript } from "../components/briefArtifactScript";
import { buildBriefArtifactFromSnapshot } from "../../lib/report/homeBrief/briefArtifactBuilder";
import { formatBriefArtifact } from "../../lib/report/briefArtifact";
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
    fullBrief: weeklyOperatorBrief,
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

/**
 * The formats, in the picker's order. The share rail's four formats are built
 * here against the canonical site URL rather than in the browser against the
 * window's origin, so the brief link a reader pastes points at the brief and
 * not at a preview host, and the server can render the preview the page opens on.
 */
const buildShareOptions = (artifact: Awaited<ReturnType<typeof buildCurrentShareArtifact>>): ShareFormatOption[] => {
  const brief = (format: Parameters<typeof formatBriefArtifact>[1]) =>
    formatBriefArtifact(artifact.briefArtifact, format, siteUrl);
  return [
    {
      id: "slack-post",
      group: "Chat",
      label: "Slack post",
      hint: "The call, its pause line and what would change it, as a bolded block a channel skims.",
      kind: "text",
      text: brief("slack"),
      copyLabel: "Copy Slack post",
      commitment: "copied_slack",
    },
    {
      id: "full-brief",
      group: "Chat",
      label: "Full brief",
      hint: "The weekly operator brief: every area's rule and lines, for a channel that wants the whole week.",
      kind: "text",
      text: artifact.fullBrief,
      copyLabel: "Copy full brief",
      commitment: "copied_slack",
    },
    {
      id: "standup",
      group: "Chat",
      label: "Standup line",
      hint: "One sentence for a daily standup: whether the call moved and how far it is from changing.",
      kind: "text",
      text: artifact.standupLine,
      copyLabel: "Copy standup line",
      commitment: "copied_brief",
    },
    {
      id: "meeting-pack",
      group: "Meetings",
      label: "Meeting pack",
      hint: "The brief, the Slack brief, the board slide's bullets and the citation, in one paste for a meeting doc.",
      kind: "text",
      text: artifact.meetingPack,
      copyLabel: "Copy meeting pack",
      commitment: "copied_meeting",
      offersCalendar: true,
    },
    {
      id: "agenda",
      group: "Meetings",
      label: "Monday agenda",
      hint: "A three-minute Monday item for Notion, Docs or a meeting doc.",
      kind: "text",
      text: brief("agenda"),
      copyLabel: "Copy agenda",
      commitment: "copied_meeting",
      offersCalendar: true,
    },
    {
      id: "slide-text",
      group: "Meetings",
      label: "Slide text",
      hint: "A Markdown callout for a deck, Notion or Docs. The slide as an image or a file is under Images and slides.",
      kind: "text",
      text: brief("slide"),
      copyLabel: "Copy slide text",
      commitment: "copied_brief",
    },
    {
      id: "email",
      group: "Docs and email",
      label: "Email",
      hint: "The full brief with its citation and permanent link, for a leadership note.",
      kind: "text",
      text: artifact.emailBrief,
      copyLabel: "Copy email",
      commitment: "copied_email",
    },
    {
      id: "investor-update",
      group: "Docs and email",
      label: "Investor update",
      hint: "Two paragraphs for a monthly letter: the conditions and how they moved since last month-end, then the guidance and what your runway band means for it.",
      kind: "investor",
      parts: artifact.investorUpdate,
      copyLabel: "Copy investor update",
    },
    {
      id: "portfolio-note",
      group: "Docs and email",
      label: "Portfolio note",
      hint: "For an investor or accelerator writing to the companies it backs: each area's rule and lines, a note on the week for every runway band, and a link for each company to set its own lines.",
      kind: "text",
      text: artifact.portfolioNote,
      copyLabel: "Copy portfolio note",
      commitment: "copied_brief",
    },
    {
      id: "citation",
      group: "Docs and email",
      label: "Citation",
      hint: "A dated reference with a link to the permanent record.",
      kind: "text",
      text: brief("citation"),
      copyLabel: "Copy citation",
      commitment: "copied_brief",
    },
    {
      id: "ticket-brief",
      group: "Tickets and boards",
      label: "Ticket brief",
      hint: "The guidance in Markdown for a Jira or Linear ticket, or a wiki page.",
      kind: "text",
      text: artifact.issueTrackerBrief,
      copyLabel: "Copy ticket brief",
      commitment: "copied_brief",
    },
    {
      id: "work-item-tags",
      group: "Tickets and boards",
      label: "Work-item tags",
      hint: "One block per area for a Linear or Jira card description: this week's rule, its pause line and what would change it. No integration and no tokens; each button copies its own row.",
      kind: "panel",
      content: <GuardrailTagControls blocks={artifact.guardrailTagBlocks} rows={artifact.areaRows} />,
    },
    {
      id: "pull-policies",
      group: "Tickets and boards",
      label: "Pull policies",
      hint: "For a kanban board or wiki: how many bets can run at once this week, then per area what to keep pulling, when to stop and when to resume. Pick a runway band on the brief to scale the cap to your cash.",
      kind: "panel",
      content: <PullPolicyControls blocks={artifact.pullPolicyBlocks} wipGuidance={artifact.wipGuidance} />,
    },
    {
      id: "role-memos",
      group: "Team",
      label: "Role memos",
      hint: "The week's summary, pause-if checks and what would change it, as a memo and a checklist to send to a team.",
      kind: "panel",
      content: <ExecutiveBriefingPanel assessment={artifact.assessment} recordDateLabel={artifact.recordDateLabel} />,
    },
  ];
};

export default async function SharePage() {
  const artifact = await buildCurrentShareArtifact();

  return (
    <PageShell backdropVariant="default">
      {/* The share rail's island: the global Share button reads it on this page too. */}
      <BriefArtifactScript artifact={artifact.briefArtifact} />
      <div className="weather-page-stack mx-auto max-w-6xl">
        <section className="weather-panel weather-section-stack p-0" aria-labelledby="share-page-title">
          <div className="max-w-2xl space-y-2">
            {/* The week, where the kicker read "Current weekly artifact" — the
                product's internal noun for what a reader calls the brief. */}
            <p className="type-eyebrow type-eyebrow-section">Week of {artifact.recordDateLabel}</p>
            <h1 id="share-page-title" className="text-fluid-2xl font-semibold text-white/90">Share this week&apos;s guidance</h1>
            <p className="text-sm leading-relaxed text-white/60">
              Paste it into Slack, a meeting doc, a ticket or a letter. Every format carries the same
              pause and resume lines and names its source:{" "}
              {/* A link named for the host, not a bare URL printed as text. */}
              <a href={artifact.sourceUrl} className="text-sky-300 underline-offset-2 hover:underline">
                {artifact.sourceHost}
              </a>
              .
            </p>
          </div>
        </section>

        <SharePageFormats
          scoreReferences={artifact.scoreReferences}
          options={buildShareOptions(artifact)}
          calendar={{ title: `Whether weekly brief review — ${artifact.recordDate}`, details: artifact.calendarDetails }}
        />

        {/* Text formats first, then the same call as a picture or a file. */}
        <ShareImageArtifacts />

        {/* Anchored so the retired /embed route lands on it. */}
        <section id="embed" className="weather-panel weather-section-stack p-0">
          <EmbedBuilder />
        </section>
        <SubscribeForm />
        <div>
          <ActionLink href="/" variant="pill">
            Return to weekly brief
          </ActionLink>
        </div>
      </div>
    </PageShell>
  );
}
