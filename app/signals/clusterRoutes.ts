import { snapshotData } from "../../lib/snapshot";

type SignalClusterDefinition = {
  slug: string;
  title: string;
  summary: string;
  evidence: string;
  isIndexable: boolean;
};

const hasYield = (value: number | null | undefined) => typeof value === "number";

const signalClusterDefinitions: SignalClusterDefinition[] = [
  {
    slug: "capital-tightness-watch",
    title: "Funding pressure watch",
    summary: "Track liquidity pressure before approving long-payback commitments.",
    evidence: "Treasury rate stack and regime threshold distance.",
    isIndexable: hasYield(snapshotData.yields.threeMonth) && hasYield(snapshotData.yields.tenYear),
  },
  {
    slug: "risk-appetite-watch",
    title: "Risk appetite watch",
    summary: "Use risk-appetite movement to pace growth and hiring exposure.",
    evidence: "Regime assessment with risk-sensitive market inputs.",
    isIndexable: hasYield(snapshotData.yields.twoYear) && hasYield(snapshotData.yields.tenYear),
  },
  {
    slug: "yield-curve-flip-watch",
    title: "Yield curve flip watch",
    summary: "Guard irreversible bets when the curve approaches a flip zone.",
    evidence: "2Y/10Y spread trajectory from the live Treasury payload.",
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

