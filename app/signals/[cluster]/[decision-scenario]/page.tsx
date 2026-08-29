import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../../lib/seo";
import { readProgrammaticPayload } from "../../../../lib/seo/programmaticPayloadBuilder";
import type { SeoDecisionPayload } from "../../../../lib/report/seoDecisionPayload";
import { publicDecisionLabels } from "../../../../lib/report/reportFormatting";
import { findSignalsCluster } from "../../clusterRoutes";
import { findDecisionScenario, signalScenarioRoutes } from "../../../seoRouteClusters";
import { ContentMeasurementTracker } from "../../../components/contentMeasurementTracker";
import { ReportCta } from "../../../components/reportCta";
import { ContentPageShell } from "../../../components/ui/contentPageShell";

const signalScenarioIntentBySlug = {
  hiring: "cfo",
  "product-tempo": "vp-product",
  "capital-raising": "board",
  "burn-discipline": "cfo",
  "expansion-bets": "vp-product",
} as const;

const buildSignalDecisionBrief = ({
  signalTitle,
  scenarioTitle,
  payload,
}: {
  signalTitle: string;
  scenarioTitle: string;
  payload: SeoDecisionPayload;
}) =>
  [
    `${signalTitle} — ${scenarioTitle}`,
    `Current call: ${payload.currentCall}`,
    `Action now: ${payload.immediateAction}`,
    `Pause if: ${payload.triggerThreshold}`,
    `Change course if: ${payload.reversalCondition}`,
    `Freshness: ${payload.freshness}`,
    `Trust: ${payload.trustSummary}`,
    `Citation: ${payload.citationMeta}`,
    "",
    "Evidence",
    ...payload.evidence.map((item) => `- ${item.title}: ${item.summary} (${item.confidenceLabel})`),
  ].join("\n");

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
  payload?: Pick<SeoDecisionPayload, "currentCall" | "immediateAction" | "degraded" | "noindex" | "noindexReasons">;
}) => {
  const metadata = buildPageMetadata({
    title: `${signalTitle}: ${scenarioTitle} decisions`,
    description: payload ? `${payload.currentCall} Action: ${payload.immediateAction}` : signalSummary,
    path: `/evidence/${cluster}/${decisionScenario}`,
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

  const payloadRecord = await readProgrammaticPayload(`/evidence/${cluster}/${decisionScenario}`).catch(() => undefined);

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

  const pagePath = `/evidence/${cluster}/${decisionScenario}`;
  const payloadRecord = await readProgrammaticPayload(`/evidence/${cluster}/${decisionScenario}`);
  const payload = payloadRecord.payload;
  const contentIntent =
    signalScenarioIntentBySlug[decisionScenario as keyof typeof signalScenarioIntentBySlug] ?? "board";
  const copyText = buildSignalDecisionBrief({
    signalTitle: signal.title,
    scenarioTitle: scenario.title,
    payload,
  });

  return (
    <ContentPageShell
      data-content-measurement-root={pagePath}
    >
      <ContentMeasurementTracker pagePath={pagePath} cluster="authority" intent={contentIntent} />
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{signal.title}: {scenario.title}</h1>
        <p className="text-sm text-slate-300">{signal.summary}</p>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-slate-100">
            Freshness: {payload.freshness}
          </span>
          <span className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-slate-100">
            Trust: {payload.trustSummary}
          </span>
        </div>
        {payload.noindex ? (
          <p className="rounded-md border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
            This page is currently excluded from indexing until freshness and provenance recover. Reasons: {(payload.noindexReasons ?? []).join(", ")}.
          </p>
        ) : null}
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Decision contract</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          <li>• <span className="font-semibold text-slate-100">{publicDecisionLabels.call}:</span> {payload.currentCall}</li>
          <li>• <span className="font-semibold text-slate-100">{publicDecisionLabels.action}:</span> {payload.immediateAction}</li>
          <li>• <span className="font-semibold text-slate-100">{publicDecisionLabels.threshold}:</span> {payload.triggerThreshold}</li>
          <li>• <span className="font-semibold text-slate-100">{publicDecisionLabels.reversal}:</span> {payload.reversalCondition}</li>
        </ul>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Trust and evidence</h2>
        <p className="text-sm text-slate-300">{payload.citationMeta}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {payload.evidence.map((item) => (
            <article key={item.title} className="rounded-lg border border-slate-700/70 bg-slate-950/50 px-4 py-4">
              <p className="type-eyebrow text-sky-200">{item.confidenceLabel}</p>
              <p className="mt-2 text-sm font-semibold text-slate-100">{item.title}</p>
              <p className="mt-2 text-sm text-slate-300">{item.summary}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Copy this decision brief</h2>
        <p className="text-sm text-slate-300">
          Use this as the evidence-side handoff when someone asks why this scenario should tighten or loosen now.
        </p>
        <ReportCta
          href={pagePath}
          label="Copy signal brief"
          copyText={copyText}
          copyTarget="Signal brief"
          telemetryEvent={{
            pagePath,
            cluster: "authority",
            intent: contentIntent,
            ctaId: "copy_signal_brief",
          }}
          className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]"
        />
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Continue decision flow</h2>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <Link href="/" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-slate-100">Weekly brief</Link>
          <Link href={`/evidence/${cluster}`} className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-slate-100">Evidence cluster</Link>
          <Link href={`/resolve/ceo/${decisionScenario}`} className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-slate-100">Decision tool</Link>
          <Link href="/planning#ops-monthly-action-summary" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-slate-100">Planning handoff</Link>
        </div>
      </section>
    </ContentPageShell>
  );
}
