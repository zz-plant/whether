import type { Metadata } from "next";
import { buildPageMetadata } from "../../../lib/seo";
import { getRegimePublicLabel } from "../../../lib/regimePresentation";
import { ReportShell } from "../../components/reportShell";
import { isSavedCopy } from "../../../lib/report/provenanceStatus";
import { loadCompareData, type CompareSearchParams } from "../../../lib/report/compareDataLoader";
import { ComparePanel } from "./ComparePanel";

export const runtime = "edge";

export async function generateMetadata({
  searchParams: _searchParams,
}: {
  searchParams?: Promise<Partial<CompareSearchParams>>;
}): Promise<Metadata> {
  return buildPageMetadata({
    title: "Compare periods — two months side by side",
    description: "Compare two past months side by side: interest rates, the funding market, how much room there was to hire and spend, and the rules in force.",
    path: "/history/compare",
    imageAlt: "Whether comparison of two past periods",
  });
}

export default async function HistoryComparePage({
  searchParams,
}: {
  searchParams?: Promise<Partial<CompareSearchParams>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const compareResult = await loadCompareData(resolvedSearchParams);

  const snapshotA = compareResult.ok ? compareResult.snapshotResultA.snapshot : undefined;
  const snapshotB = compareResult.ok ? compareResult.snapshotResultB.snapshot : undefined;
  /* The page has no one condition, so its intro prints no status word; a frame of it
     still names both periods' in the running head (ui-ux-standards §XXVIII), Period A first. */
  const frameCondition =
    snapshotA && snapshotB
      ? `${getRegimePublicLabel(snapshotA.reportData.assessment.regime)} · ${getRegimePublicLabel(snapshotB.reportData.assessment.regime)}`
      : undefined;
  const isFallback = snapshotA ? isSavedCopy(snapshotA.reportData.treasury) : false;

  const compareContent = await ComparePanel({
    searchParams: resolvedSearchParams,
    initialResult: compareResult,
  });

  return (
    <ReportShell
      model={{
        status: {
          statusLabel: "",
          frameCondition,
          recordDateLabel: snapshotA?.reportData.recordDateLabel ?? "",
          fetchedAtLabel: snapshotA?.reportData.fetchedAtLabel ?? "",
        },
        page: {
          pageTitle: "Compare two periods",
          pageSummary: "Scores, rates and guidance for any two past months, side by side.",
          sectionLinks: [
            { href: "#compare-selectors", label: "Period selection" },
            { href: "#compare-key-deltas", label: "What changed" },
            { href: "#ops-compare-grid", label: "Side-by-side rules" },
          ],
          currentPath: "/history/compare",
        },
        trust: {
          trustStatusTone: snapshotA?.trustStatus.trustStatusTone ?? "historical",
          showOfflineBadge: isFallback && !snapshotA?.reportData.historicalSelection,
        },
      }}
    >
      {compareContent}
    </ReportShell>
  );
}
