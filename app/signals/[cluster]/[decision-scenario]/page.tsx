import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../../lib/seo";
import { readProgrammaticPayload } from "../../../../lib/seo/programmaticPayloadBuilder";
import { shouldNoindexPayload } from "../../../../lib/seo/freshnessIndexation";
import type { SeoDecisionPayload } from "../../../../lib/report/seoDecisionPayload";
import { publicDecisionLabels } from "../../../../lib/report/reportFormatting";
import {
  DATA_CURRENCY_ACTION,
  DATA_CURRENCY_ACTION_HREF,
  buildDataCurrencyNotice,
} from "../../../../lib/report/dataCurrencyNotice";
import { DECISION_CONTRACT_LABELS } from "../../../../lib/report/reportCopy";
import { findSignalsCluster } from "../../clusterRoutes";
import { findDecisionScenario, signalScenarioRoutes } from "../../../seoRouteClusters";
import { ContentMeasurementTracker } from "../../../components/contentMeasurementTracker";
import { ReportCta } from "../../../components/reportCta";
import { ContentPageShell } from "../../../components/ui/contentPageShell";
import { compositeSignalScales } from "../../../../lib/report/signalTranslations";
import { ruleMetricLabel } from "../../../../lib/report/boundedDecisionRules";

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
    `${publicDecisionLabels.call}: ${payload.currentCall}`,
    `${DECISION_CONTRACT_LABELS.action.actionNow}: ${payload.immediateAction}`,
    `${DECISION_CONTRACT_LABELS.threshold.pauseIf}: ${payload.triggerThreshold}`,
    `${DECISION_CONTRACT_LABELS.reversal.resumeWhen}: ${payload.reversalCondition}`,
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
    /*
     * Distinct on both axes, which is what these 15 URLs vary along, and fixed.
     *
     * `${currentCall} Action: ${immediateAction}` was a function of the decision
     * scenario alone, so the same scenario under all three signals shipped one
     * description, and it changed every week. Leading with the signal's own
     * summary varies it by watch and naming the scenario varies it by scenario.
     * The live action used to trail it; that belongs on the page, where it is
     * dated, not in a snippet a crawler caches.
     */
    description: `${signalSummary} What it means for ${scenarioTitle.toLowerCase()} decisions, and the line where conditions change.`,
    path: `/signals/${cluster}/${decisionScenario}`,
    imageAlt: `${signalTitle} ${scenarioTitle}`,
    imageParams: { template: "signals", eyebrow: "Evidence" },
  });

  if (shouldNoindexPayload(payload)) {
    metadata.robots = { index: false, follow: true };
  }

  return metadata;
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { cluster, "decision-scenario": decisionScenario } = await params;
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
  const { cluster, "decision-scenario": decisionScenario } = await params;
  const signal = findSignalsCluster(cluster);
  const scenario = findDecisionScenario(decisionScenario);
  if (!signal || !scenario) notFound();

  const pagePath = `/signals/${cluster}/${decisionScenario}`;
  const payloadRecord = await readProgrammaticPayload(`/signals/${cluster}/${decisionScenario}`);
  const payload = payloadRecord.payload;
  const contentIntent =
    signalScenarioIntentBySlug[decisionScenario as keyof typeof signalScenarioIntentBySlug] ?? "board";
  const copyText = buildSignalDecisionBrief({
    signalTitle: signal.title,
    scenarioTitle: scenario.title,
    payload,
  });
  /* The indexation decision is not the reader's to act on; the age of the reading is. */
  const dataCurrency = buildDataCurrencyNotice(payload.noindexReasons);

  return (
    <ContentPageShell
      data-content-measurement-root={pagePath}
    >
      <ContentMeasurementTracker pagePath={pagePath} cluster="authority" intent={contentIntent} />
      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
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
        {dataCurrency ? (
          <p className="rounded-md border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
            {dataCurrency.summary} {DATA_CURRENCY_ACTION}{" "}
            <Link href={DATA_CURRENCY_ACTION_HREF} className="underline decoration-amber-300/60 underline-offset-4">
              Source dates
            </Link>
          </p>
        ) : null}
      </section>
      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
        <h2 className="text-lg font-semibold text-slate-100">This week&apos;s guidance</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          <li>• <span className="font-semibold text-slate-100">{publicDecisionLabels.call}:</span> {payload.currentCall}</li>
          <li>• <span className="font-semibold text-slate-100">{publicDecisionLabels.action}:</span> {payload.immediateAction}</li>
          <li>• <span className="font-semibold text-slate-100">{publicDecisionLabels.threshold}:</span> {payload.triggerThreshold}</li>
          <li>• <span className="font-semibold text-slate-100">{publicDecisionLabels.reversal}:</span> {payload.reversalCondition}</li>
        </ul>
        {/* These lines are stated in score points, on a page most readers reach cold
            from a search result. The scale is printed here rather than behind a link,
            because a reader who has to leave to decode "above 76" never comes back to
            the call. Both scales, since a pause line can name either score. */}
        <dl className="space-y-0.5 text-fluid-nano text-white/55">
          {(["tightness", "riskAppetite"] as const).map((key) => (
            <div key={key} className="flex flex-wrap gap-x-1.5">
              <dt>{ruleMetricLabel[key]}, out of 100:</dt>
              <dd>{compositeSignalScales[key].directionLabel}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
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
      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Copy this decision brief</h2>
        <p className="text-sm text-slate-300">
          What to say when someone asks why.
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
      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Where to go next</h2>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <Link href="/" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-slate-100">Weekly brief</Link>
          <Link href={`/signals/${cluster}`} className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-slate-100">The evidence</Link>
          <Link href={`/resolve/ceo/${decisionScenario}`} className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-slate-100">Decision tool</Link>
          <Link href="/operate#ops-monthly-action-summary" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-slate-100">What to do</Link>
        </div>
      </section>
    </ContentPageShell>
  );
}
