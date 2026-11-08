import type { loadHomePageAssembly } from "../lib/report/homePageAssemblyLoader";
import { buildCadenceCallModel, type CadenceCallHorizon } from "../lib/report/cadenceCallModel";
import { buildBriefArtifact } from "../lib/report/homeBrief/briefArtifactBuilder";
import { formatBriefArtifact } from "../lib/report/briefArtifact";
import type { previousScoresFromDynamics } from "../lib/export/scoreReference";
import type { getMonthlyRegimeHistory } from "../lib/summary/monthlyRegimeHistory";
import { siteUrl } from "../lib/siteUrl";

type Assembly = Awaited<ReturnType<typeof loadHomePageAssembly>>;
type Homepage = Assembly["homepage"];
type ReportData = Assembly["reportData"];

/**
 * The artifact the page publishes, built once: the selected horizon's call, the
 * `BriefDocument` every share format renders, and the Slack paste. Kept out of
 * `app/page.tsx` so the route reads as orchestration and the builders stay the one
 * place the artifact's shape is decided.
 */
export function buildHomePageArtifact({
  homepage,
  reportData,
  activeCadence,
  alignedRegimeHistory,
  operateHref,
  previousScores,
}: {
  homepage: Homepage;
  reportData: ReportData;
  activeCadence: CadenceCallHorizon | "weekly";
  alignedRegimeHistory: ReturnType<typeof getMonthlyRegimeHistory>;
  operateHref: string;
  previousScores: ReturnType<typeof previousScoresFromDynamics>;
}) {
  const cadenceCall =
    activeCadence === "weekly"
      ? null
      : buildCadenceCallModel({
          horizon: activeCadence,
          assessment: reportData.assessment,
          recordDate: reportData.treasury.record_date,
          recordDateLabel: homepage.reportShell.recordDateLabel,
          regimeHistory: alignedRegimeHistory,
          planHref: operateHref,
          previousScores,
        });

  const cadenceTitle = cadenceCall
    ? [cadenceCall.cadenceLabel, cadenceCall.periodLabel].filter(Boolean).join(" — ")
    : null;

  const briefArtifact = buildBriefArtifact({
    homepage,
    recordDate: reportData.treasury.record_date,
    title: cadenceTitle ?? "Whether Weekly Brief",
  });

  // The one Slack paste, from the one formatter: dated, with the signal and provenance
  // lines, pointing at the frozen record. `siteUrl`, not the request host: a paste is read
  // later, from somewhere else, and a preview host does not outlive it.
  const briefSlackBlock = formatBriefArtifact(briefArtifact, "slack", siteUrl);

  return { cadenceCall, cadenceTitle, briefArtifact, briefSlackBlock };
}
