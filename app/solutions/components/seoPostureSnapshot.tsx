import { ActionLink } from "../../components/ui/actionLink";
import { loadWeeklyBriefSnapshot } from "../../../lib/report/weeklyBriefSnapshot";

type SeoPostureSnapshotProps = {
  route: string;
  immediateImplication: string;
};

export async function SeoPostureSnapshot({ route, immediateImplication }: SeoPostureSnapshotProps) {
  const { reportResult, reportData, snapshot } = await loadWeeklyBriefSnapshot(undefined, { route });
  const { homeBriefModel, displayRegime, callCitation } = snapshot;
  const { reportDynamics, recordDateLabel, fetchedAtLabel } = reportData;

  return (
    <section className="weather-panel space-y-4 px-6 py-6">
      <h2 className="text-xl font-semibold text-slate-100">This week’s market posture</h2>
      <p className="text-sm text-slate-200">
        <span className="font-semibold text-sky-200">{displayRegime.label}</span> ({displayRegime.canonicalRegime}) · trend {reportDynamics.directionLabel} · review decisions {homeBriefModel.revisitDecisions ? "YES" : "NO"}
      </p>
      <p className="text-sm text-slate-300">What this means right now: {immediateImplication}</p>
      <p className="text-xs text-slate-400">{callCitation} Data date: {recordDateLabel}. Updated: {fetchedAtLabel}.</p>
      {!reportResult.ok ? (
        <p className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          We’re showing a fallback snapshot right now. Open the weekly brief for the latest live read.
        </p>
      ) : null}
      <ActionLink
        href="/"
      >
        Open this week’s brief
      </ActionLink>
    </section>
  );
}
