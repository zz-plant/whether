import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../components/pageShell";
import { ShareCopyControls } from "./shareCopyControls";
import { buildBoardSlideBullets, buildCallCitation, buildSlackBrief } from "../../lib/export/briefBuilders";
import {
  buildWeeklyOperatorBriefPayload,
  buildWeeklyOperatorBriefPlainText,
} from "../../lib/export/weeklyOperatorBrief";
import { buildBriefPermalinkLine } from "../../lib/export/briefPermalink";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";

export const runtime = "edge";
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Share the Current Weekly Brief | Whether",
  description: "Copy the current Whether weekly operating brief for Slack, email, calendar agendas, and meeting notes.",
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
  const citation = buildCallCitation(assessment, treasury, {
    postureWithStageLabel: snapshot.weeklyCall.regimeStage,
  });
  // The slide bullets rather than the board brief, which is the Slack brief
  // with the bullets appended: this pack used to paste the same block twice.
  const boardSlideBullets = buildBoardSlideBullets(assessment, treasury, macroSeries, exportOptions);
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
    trustLine: `Source: ${treasury.source}`,
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
    calendarDetails: [
      "Review the current Whether weekly operating brief.",
      "",
      weeklyOperatorBrief,
      "",
      "Full brief: https://whether.work",
    ].join("\n"),
  };
};

export default async function SharePage() {
  const artifact = await buildCurrentShareArtifact();

  return (
    <PageShell backdropVariant="default">
      <section className="weather-panel space-y-5 px-5 py-5">
        <div className="max-w-3xl space-y-3">
          <p className="text-fluid-micro font-semibold tracking-[0.04em] text-sky-200">
            Current weekly artifact
          </p>
          <h1 className="text-fluid-xl font-semibold text-white/90">Share this week&apos;s operating brief</h1>
          <p className="text-sm leading-relaxed text-white/60">
            Copy the live weekly call, bounded action, pause line, and change-course condition into Slack, email, calendar agendas, or meeting notes.
          </p>
          <p className="text-fluid-xs text-white/60">{artifact.trustLine}</p>
        </div>

        <ShareCopyControls
          recordDate={artifact.recordDate}
          slackBrief={artifact.slackBrief}
          emailBrief={artifact.emailBrief}
          meetingPack={artifact.meetingPack}
          calendarDetails={artifact.calendarDetails}
        />

        <div>
          <Link href="/" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100 no-underline">
            Return to weekly brief
          </Link>
        </div>
      </section>

    </PageShell>
  );
}
