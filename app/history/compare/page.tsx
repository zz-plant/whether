import type { Metadata } from "next";
import { buildPageMetadata } from "../../../lib/seo";
import { ReportShell } from "../../components/reportShell";
import { loadWeeklyBriefSnapshot } from "../../../lib/report/weeklyBriefSnapshot";
import { isSavedCopy } from "../../../lib/report/provenanceStatus";
import { ComparePanel } from "./ComparePanel";

export const runtime = "edge";

type CompareSearchParams = {
  yearA?: string;
  monthA?: string;
  yearB?: string;
  monthB?: string;
};

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
  const snapshotResultA = await loadWeeklyBriefSnapshot(
    resolvedSearchParams?.yearA && resolvedSearchParams?.monthA
      ? { year: resolvedSearchParams.yearA, month: resolvedSearchParams.monthA }
      : undefined,
    { route: "/history/compare" },
  );
  const isFallback = isSavedCopy(snapshotResultA.snapshot.reportData.treasury);
  const compareContent = await ComparePanel({ searchParams: resolvedSearchParams });

  return (
    <ReportShell
      model={{
        status: {
          statusLabel: "",
          recordDateLabel: snapshotResultA.snapshot.reportData.recordDateLabel,
          fetchedAtLabel: snapshotResultA.snapshot.reportData.fetchedAtLabel,
        },
        page: {
          pageTitle: "Compare two periods",
          pageSummary: "Signals and operating guidance for any two past months, side by side.",
          sectionLinks: [
            { href: "#compare-selectors", label: "Period selection" },
            { href: "#compare-key-deltas", label: "What changed" },
            { href: "#ops-compare-grid", label: "Side-by-side rules" },
          ],
          currentPath: "/history/compare",
        },
        trust: {
          trustStatusTone: snapshotResultA.snapshot.trustStatus.trustStatusTone,
          showOfflineBadge: isFallback && !snapshotResultA.snapshot.reportData.historicalSelection,
        },
      }}
    >
      {compareContent}
    </ReportShell>
  );
}