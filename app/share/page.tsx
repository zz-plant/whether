import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../components/pageShell";
import { ShareCopyControls } from "./shareCopyControls";
import { GuardrailTagControls } from "./guardrailTagControls";
import { PullPolicyControls } from "./pullPolicyControls";
import { SharePageFormats } from "./sharePageFormats";
import { EmbedBuilder } from "./embedBuilder";
import { ShareImageArtifacts } from "./shareImageArtifacts";
import { BriefArtifactScript } from "../components/briefArtifactScript";
import { buildBriefArtifactFromSnapshot } from "../../lib/report/homeBrief/briefArtifactBuilder";
import { buildBoardSlideBullets, buildCallCitation, buildSlackBrief } from "../../lib/export/briefBuilders";
import { buildIssueTrackerMarkdownBrief, buildGuardrailTagBlocks } from "../../lib/export/issueTrackerBrief";
import { buildFlipProximity } from "../../lib/report/flipProximity";
import { buildPullPolicyBlocks } from "../../lib/report/operatingCalls";
import { buildWipGuidance } from "../../lib/report/wipPolicy";
import {
  buildWeeklyOperatorBriefPayload,
  buildWeeklyOperatorBriefPlainText,
} from "../../lib/export/weeklyOperatorBrief";
import { buildBriefPermalinkLine } from "../../lib/export/briefPermalink";
import { buildInvestorUpdateSnippetParts } from "../../lib/export/investorUpdateSnippet";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { getMonthlyRegimeHistory } from "../../lib/summary/monthlyRegimeHistory";

export const runtime = "edge";
export const revalidate = 300;

// No "| Whether" in the title: the root layout's title template already appends
// it, so carrying the brand here rendered "… | Whether | Whether".
export const metadata: Metadata = {
  title: "Share the Current Weekly Brief",
  description:
    "Copy the current Whether weekly operating brief for Slack, a slide, or a citation; add a meeting pack or calendar hold; or embed a live brief in a newsletter or wiki.",
  alternates: { canonical: "/share" },
};

const buildCurrentShareArtifact = async () => {
  const { reportData, snapshot } = await loadWeeklyBriefSnapshot(undefined, { route: "/share" });
  const { assessment, treasury, sensors, macroSeries } = reportData;
  const exportOptions = {
    postureWithStageLabel: snapshot.weeklyCall.regimeStage,
    operatingStanceLine: snapshot.weeklyCall.currentCall,
    modeledDecision: {
      postureWithStageLabel: snapshot.weeklyCall.regimeStage,
      currentCall: snapshot.weeklyCall.currentCall,
      actionNow: snapshot.weeklyCall.actionNow,
      guardrailThreshold: snapshot.weeklyCall.pauseIf,
      reversalTrigger: snapshot.weeklyCall.changeCourseIf,
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
    exportOptions.modeledDecision,
  );
  /* The credential-free slice of the Linear/Jira sync: one paste-ready
     guardrail block per business area, built from the same bounded-rule fields
     the hero and Slack brief print. No tokens, no tracker integration — the
     operator pastes the block into the work item description and the card
     carries posture + pause trigger + flip condition. */
  const guardrailTagBlocks = buildGuardrailTagBlocks({
    actionStripItems: snapshot.homeBriefModel.actionStripItems ?? [],
    postureLabel: snapshot.weeklyCall.regimeStage,
    recordDate: treasury.record_date,
    flipWatchSentence: buildFlipProximity(assessment).map((entry) => entry.sentence)[0],
  });
  /* Kanban pull policies: the same pause/resume conditions re-verbed for a
     pull system, copyable for a board header or wiki. */
  const pullPolicyBlocks = buildPullPolicyBlocks(snapshot.homeBriefModel.actionStripItems ?? []);
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
    recordDate: treasury.record_date,
    weeklyCall: snapshot.weeklyCall,
    monthlyHistory: getMonthlyRegimeHistory(),
    // The provenance label, not `treasury.source`, which is a FRED series URL on a live read.
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
    treasuryProvenance: reportData.treasuryProvenance,
    trustLine: `Source: ${treasury.source}`,
    // The picker's object, from the same snapshot the long-form builders read.
    briefArtifact: buildBriefArtifactFromSnapshot({
      reportData,
      weeklyCall: snapshot.weeklyCall,
      title: "Whether Weekly Brief",
    }),
    slackBrief: weeklyOperatorBrief,
    emailBrief: [
      "Whether weekly operating brief",
      "",
      weeklyOperatorBrief,
      "",
      "Citation",
      citation,
      "",
      buildBriefPermalinkLine(treasury.record_date),
    ].join("\n"),
    meetingPack,
    issueTrackerBrief,
    investorUpdate,
    guardrailTagBlocks,
    pullPolicyBlocks,
    wipGuidance,
    calendarDetails: [
      "Review the current Whether weekly operating brief.",
      "",
      weeklyOperatorBrief,
      "",
      "Full brief: https://whether.work",
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
      <section className="weather-panel space-y-5 px-5 py-5">
        <div className="max-w-3xl space-y-3">
          <p className="text-fluid-micro font-semibold tracking-[0.04em] text-sky-200">
            Current weekly artifact
          </p>
          <h1 className="text-fluid-xl font-semibold text-white/90">Share this week&apos;s operating brief</h1>
          <p className="text-sm leading-relaxed text-white/60">
            Copy the live weekly call with its bounded conditions and source into Slack, a slide, or a
            citation, or take it as a slide image. Longer formats and a calendar hold are below; a live
            embed for a newsletter or wiki is at the end.
          </p>
          <p className="text-fluid-xs text-white/60">{artifact.trustLine}</p>
        </div>

        <SharePageFormats />

        <div className="space-y-3">
          <h2 className="type-eyebrow">Longer formats</h2>
          <ShareCopyControls
            recordDate={artifact.recordDate}
            slackBrief={artifact.slackBrief}
            emailBrief={artifact.emailBrief}
            meetingPack={artifact.meetingPack}
            issueTrackerBrief={artifact.issueTrackerBrief}
            investorUpdate={artifact.investorUpdate}
            calendarDetails={artifact.calendarDetails}
          />
        </div>

        {/* The credential-free slice of the Linear/Jira sync, beside the ticket
            brief it extends. One paste-ready block per business area. */}
        <div className="space-y-3">
          <GuardrailTagControls blocks={artifact.guardrailTagBlocks} />
          <PullPolicyControls blocks={artifact.pullPolicyBlocks} wipGuidance={artifact.wipGuidance} />
        </div>

        {/* Role memos are share formats. They sat under the sixth collapsed
            section of /operate, where nobody planning a week went looking for
            a CFO memo; they belong beside Slack, email and the meeting pack. */}
        <div id="role-memos" className="space-y-3">
          <h2 className="type-eyebrow">Brief your team by role</h2>
          <ExecutiveBriefingPanel
            assessment={artifact.assessment}
            recordDateLabel={artifact.recordDateLabel}
            provenance={artifact.treasuryProvenance}
            showProvenance={false}
          />
        </div>

        {/* Text formats first, then the same call as a picture. */}
        <ShareImageArtifacts />

        <div>
          <Link href="/" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100 no-underline">
            Return to weekly brief
          </Link>
        </div>
      </section>

      {/* Anchored so the retired /embed route lands on it. */}
      <section id="embed" className="weather-panel px-5 py-5">
        <EmbedBuilder />
      </section>

      <SubscribeForm />
    </PageShell>
  );
}
