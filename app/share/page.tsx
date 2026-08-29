import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../components/pageShell";
import { ShareCopyControls } from "./shareCopyControls";
import { buildBoardBrief, buildCallCitation, buildSlackBrief } from "../../lib/export/briefBuilders";
import {
  buildWeeklyOperatorBriefPayload,
  buildWeeklyOperatorBriefPlainText,
} from "../../lib/export/weeklyOperatorBrief";
import { buildBriefPermalinkLine } from "../../lib/export/briefPermalink";
import { loadReportData } from "../../lib/report/reportData";

export const runtime = "edge";
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Share the Current Weekly Brief | Whether",
  description: "Copy the current Whether weekly operating brief for Slack, email, calendar agendas, and meeting notes.",
};

const buildCurrentShareArtifact = async () => {
  const { assessment, treasury, sensors, macroSeries } = await loadReportData();
  const weeklyOperatorBrief = buildWeeklyOperatorBriefPlainText(
    buildWeeklyOperatorBriefPayload({ assessment, treasury }),
  );
  const slackBrief = buildSlackBrief(assessment, treasury, sensors, macroSeries);
  const boardBrief = buildBoardBrief(assessment, treasury, sensors, macroSeries);
  const citation = buildCallCitation(assessment, treasury);
  const meetingPack = [
    "WEEKLY BRIEF",
    weeklyOperatorBrief,
    "",
    "SLACK BRIEF",
    slackBrief,
    "",
    "BOARD SUMMARY",
    boardBrief,
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
      </section>

      <section className="weather-panel space-y-4 px-5 py-5">
        <h2 className="text-fluid-xs font-semibold tracking-[0.04em] text-white/60">What sharing produces</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="weather-surface space-y-2 px-4 py-4">
            <p className="text-xs font-semibold text-sky-200">Slack</p>
            <p className="text-xs leading-relaxed text-white/60">A compact weekly operator brief with posture, action, pause condition, reversal condition, and why the call could be wrong.</p>
          </div>
          <div className="weather-surface space-y-2 px-4 py-4">
            <p className="text-xs font-semibold text-emerald-200">Email</p>
            <p className="text-xs leading-relaxed text-white/60">The same current brief plus citation lines, ready for leadership updates or follow-up notes.</p>
          </div>
          <div className="weather-surface space-y-2 px-4 py-4">
            <p className="text-xs font-semibold text-amber-200">Meeting pack</p>
            <p className="text-xs leading-relaxed text-white/60">Board note, call snapshot, weekly brief, board summary, and citation in one pasteable artifact.</p>
          </div>
        </div>
        <Link href="/" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100 no-underline">
          Return to weekly brief
        </Link>
      </section>
    </PageShell>
  );
}
