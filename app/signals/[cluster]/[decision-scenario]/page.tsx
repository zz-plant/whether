import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../../lib/seo";
import { readProgrammaticPayload } from "../../../../lib/seo/programmaticPayloadBuilder";
import type { SeoDecisionPayload } from "../../../../lib/report/seoDecisionPayload";
import { findSignalsCluster } from "../../clusterRoutes";
import { findDecisionScenario, signalScenarioRoutes } from "../../../seoRouteClusters";

type Params = { cluster: string; "decision-scenario": string };

export const dynamicParams = true;
export const revalidate = 900;

export function generateStaticParams() {
  return signalScenarioRoutes.map((route) => ({ cluster: route.signalSlug, "decision-scenario": route.decisionScenario }));
}

const shouldNoindexForPayload = (payload?: Pick<SeoDecisionPayload, "degraded" | "noindex" | "noindexReasons">) => {
  if (!payload) return true;
  if (payload.noindex || payload.degraded) return true;
  return (payload.noindexReasons ?? []).some((reason) => reason.startsWith("freshness-") || reason.includes("provenance"));
};

export const buildSignalDecisionScenarioMetadata = ({
  cluster,
  decisionScenario,
  signalTitle,
  signalSummary,
  scenarioTitle,
  payload,
}: {
  cluster: string;
  decisionScenario: string;
  signalTitle: string;
  signalSummary: string;
  scenarioTitle: string;
  payload?: Pick<SeoDecisionPayload, "degraded" | "noindex" | "noindexReasons">;
}) => {
  const metadata = buildPageMetadata({
    title: `${signalTitle}: ${scenarioTitle} decisions`,
    description: signalSummary,
    path: `/signals/${cluster}/${decisionScenario}`,
    imageAlt: `${signalTitle} ${scenarioTitle}`,
  });

  if (shouldNoindexForPayload(payload)) {
    metadata.robots = { index: false, follow: true };
  }

  return metadata;
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { cluster: cluster, "decision-scenario": decisionScenario } = await params;
  const signal = findSignalsCluster(cluster);
  const scenario = findDecisionScenario(decisionScenario);

  if (!signal || !scenario) return {};

  const payloadRecord = await readProgrammaticPayload(`/signals/${cluster}/${decisionScenario}`).catch(() => undefined);

  return buildSignalDecisionScenarioMetadata({
    cluster,
    decisionScenario,
    signalTitle: signal.title,
    signalSummary: signal.summary,
    scenarioTitle: scenario.title,
    payload: payloadRecord?.payload,
  });
}

export default async function SignalDecisionScenarioPage({ params }: { params: Promise<Params> }) {
  const { cluster: cluster, "decision-scenario": decisionScenario } = await params;
  const signal = findSignalsCluster(cluster);
  const scenario = findDecisionScenario(decisionScenario);
  if (!signal || !scenario) notFound();

  const payloadRecord = await readProgrammaticPayload(`/signals/${cluster}/${decisionScenario}`);
  const payload = payloadRecord.payload;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{signal.title}: {scenario.title}</h1>
        <p className="text-sm text-slate-300">{signal.summary}</p>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Decision contract</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          <li>• <span className="font-semibold text-slate-100">Call:</span> {payload.currentCall}</li>
          <li>• <span className="font-semibold text-slate-100">Action:</span> {payload.immediateAction}</li>
          <li>• <span className="font-semibold text-slate-100">Threshold:</span> {payload.triggerThreshold}</li>
          <li>• <span className="font-semibold text-slate-100">Reversal:</span> {payload.reversalCondition}</li>
        </ul>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Continue decision flow</h2>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <Link href="/" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-slate-100">Weekly brief</Link>
          <Link href={`/signals/${cluster}`} className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-slate-100">Signal cluster</Link>
          <Link href={`/decide/ceo/${decisionScenario}`} className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-slate-100">Decide scenario</Link>
        </div>
      </section>
    </main>
  );
}
