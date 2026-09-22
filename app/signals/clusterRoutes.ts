import type { ReportEvidenceItem } from "../../lib/report/reportDataTypes";
import { snapshotData } from "../../lib/snapshot";

type SignalClusterDefinition = {
  slug: string;
  title: string;
  summary: string;
  evidence: string;
  /**
   * The report evidence items this watch is about. A watch page cites these
   * rather than the site-wide top three, so the three watch pages for one
   * decision scenario carry different data points (`lib/seo/programmaticPayloadBuilder.ts`).
   */
  evidenceKeys: readonly ReportEvidenceItem["key"][];
  isIndexable: boolean;
};

const hasYield = (value: number | null | undefined) => typeof value === "number";

const signalClusterDefinitions: SignalClusterDefinition[] = [
  {
    slug: "capital-tightness-watch",
    title: "Funding pressure watch",
    summary: "How hard money is to raise this week, before you commit to anything with a long payback.",
    evidence: "Short-term Treasury rates, and how far funding pressure sits from the line that changes the call.",
    evidenceKeys: ["tightness", "baseRate"],
    isIndexable: hasYield(snapshotData.yields.threeMonth) && hasYield(snapshotData.yields.tenYear),
  },
  {
    slug: "risk-appetite-watch",
    title: "Risk appetite watch",
    summary: "How willing investors are to fund risk this week, for pacing hiring and growth spend.",
    evidence: "The risk appetite score and the recession warning gauge behind it.",
    evidenceKeys: ["riskAppetite"],
    isIndexable: hasYield(snapshotData.yields.twoYear) && hasYield(snapshotData.yields.tenYear),
  },
  {
    slug: "yield-curve-flip-watch",
    title: "Recession warning watch",
    summary: "How close long-term rates are to dropping below short-term rates, before you commit to anything you cannot undo.",
    evidence: "The 10-year minus 2-year Treasury rate, week by week, from the live Treasury data.",
    evidenceKeys: ["curveSlope"],
    isIndexable: hasYield(snapshotData.yields.twoYear) && hasYield(snapshotData.yields.tenYear),
  },
];

export const signalsClusterStaticParams = signalClusterDefinitions
  .filter((cluster) => cluster.isIndexable)
  .map((cluster) => ({ cluster: cluster.slug }));

const signalsClusterBySlug = new Map(signalClusterDefinitions.map((cluster) => [cluster.slug, cluster]));

export const findSignalsCluster = (slug: string) => signalsClusterBySlug.get(slug);

export const isSignalsClusterSlug = (slug: string): boolean => {
  const cluster = findSignalsCluster(slug);
  return Boolean(cluster?.isIndexable);
};

export const indexableSignalsClusters = signalClusterDefinitions.filter((cluster) => cluster.isIndexable);

