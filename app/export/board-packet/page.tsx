import type { Metadata } from "next";
import { ReportShell } from "../../components/reportShell";
import { buildPageMetadata } from "../../../lib/seo";
import { loadWeeklyBriefSnapshot } from "../../../lib/report/weeklyBriefSnapshot";
import { INTERNAL_USE_LABEL } from "../../../lib/exportNotices";

export const runtime = "edge";
export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "Board packet — Whether",
  description: "Meeting-ready one-pager with the weekly call, evidence summary, and action items.",
  path: "/export/board-packet",
  imageAlt: "Whether board packet",
});

export default async function BoardPacketPage() {
  const snapshot = await loadWeeklyBriefSnapshot();
  const data = snapshot.reportData;
  const model = snapshot.snapshot;
  const call = model.weeklyCall;
  const homeModel = model.homeBriefModel;

  return (
    <ReportShell
      model={{
        status: {
          statusLabel: data.statusLabel,
          recordDateLabel: data.recordDateLabel,
          fetchedAtLabel: data.fetchedAtLabel,
          treasurySource: data.treasury.source,
        },
        page: {
          pageTitle: "Board packet",
          pageSummary: "Meeting-ready one-pager for leadership review.",
          sectionLinks: [],
          currentPath: "/export/board-packet",
        },
        trust: {
          trustStatusLabel: model.trustStatus.trustStatusLabel,
          trustStatusDetail: model.trustStatus.trustStatusDetail,
          trustStatusAction: model.trustStatus.trustStatusAction,
          trustStatusTone: model.trustStatus.trustStatusTone,
        },
        chrome: { heroVariant: "compact", sidebarVariant: "hidden" },
      }}
    >
      <article className="max-w-3xl mx-auto space-y-6 print:space-y-4">
        <header className="border-b border-slate-700/60 pb-4 print:border-gray-300">
          <p className="text-fluid-micro font-semibold uppercase tracking-[0.12em] text-slate-400">Board packet</p>
          <h1 className="mt-1 text-xl font-bold text-slate-100 print:text-black">
            Weekly operating brief — {data.weeklyRecordDateLabel ?? data.recordDateLabel}
          </h1>
          <p className="mt-1 text-xs text-slate-400 print:text-gray-500">
            Prepared {data.fetchedAtLabel}. Data through {data.recordDateLabel}.
          </p>
        </header>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-300 print:text-gray-700">Operating call</h2>
          <p className="mt-2 text-base font-semibold text-slate-100 print:text-black">{call.currentCall}</p>
          <p className="mt-1 text-sm text-slate-300 print:text-gray-600">{call.actionNow}</p>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-300 print:text-gray-700">Evidence summary</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-300 print:text-gray-600 list-disc list-inside">
            <li>Regime: {model.displayRegime.label} ({homeModel.postureWithStageLabel ?? homeModel.postureLabel}). Confidence: {homeModel.confidenceLabel} ({Math.round(homeModel.confidencePercent)}%).</li>
            <li>Tightness: {data.assessment.scores.tightness}. Risk appetite: {data.assessment.scores.riskAppetite}.</li>
            <li>Direction: {homeModel.weeklyMovement?.summary ?? "Stable"}. {homeModel.decisionShiftSummary ?? ""}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-300 print:text-gray-700">Action items</h2>
          <div className="mt-2 grid gap-2 text-sm">
            <div className="rounded border border-slate-700/60 bg-slate-950/30 px-3 py-2 print:border-gray-300 print:bg-white">
              <span className="font-semibold text-emerald-200 print:text-emerald-700">Do now:</span>{" "}
              <span className="text-slate-200 print:text-gray-800">{call.actionNow}</span>
            </div>
            <div className="rounded border border-slate-700/60 bg-slate-950/30 px-3 py-2 print:border-gray-300 print:bg-white">
              <span className="font-semibold text-rose-200 print:text-rose-700">Pause if:</span>{" "}
              <span className="text-slate-200 print:text-gray-800">{call.pauseIf}</span>
            </div>
            <div className="rounded border border-slate-700/60 bg-slate-950/30 px-3 py-2 print:border-gray-300 print:bg-white">
              <span className="font-semibold text-sky-200 print:text-sky-700">Change course if:</span>{" "}
              <span className="text-slate-200 print:text-gray-800">{call.changeCourseIf}</span>
            </div>
          </div>
        </section>

        {call.doNowBullets.length > 0 ? (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-300 print:text-gray-700">Supporting actions</h2>
            <ul className="mt-2 space-y-1 text-sm text-slate-300 print:text-gray-600 list-disc list-inside">
              {call.doNowBullets.slice(0, 5).map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-300 print:text-gray-700">Questions for discussion</h2>
          <ul className="mt-2 space-y-1 text-sm text-slate-300 print:text-gray-600 list-disc list-inside">
            <li>Does the operating call align with our current priorities?</li>
            <li>Are there company-specific conditions that override the macro guidance?</li>
            <li>What irreversible decisions are on the table this month that should be staged until confidence returns to HIGH?</li>
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-300 print:text-gray-700">Citation</h2>
          <p className="mt-1 text-xs text-slate-400 print:text-gray-500">
            Source: {data.treasury.source}. Data through {data.recordDateLabel}. Refreshed {data.fetchedAtLabel}.
          </p>
          <p className="mt-1 text-xs text-slate-500 print:text-gray-400">{model.callCitation}</p>
        </section>

        <footer className="border-t border-slate-700/60 pt-4 text-xs text-slate-500 print:border-gray-300 print:text-gray-400">
          <p>{INTERNAL_USE_LABEL}</p>
        </footer>
      </article>
    </ReportShell>
  );
}
