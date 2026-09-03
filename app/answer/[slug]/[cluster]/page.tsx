import type { Metadata } from "next";
import { ActionLink } from "../../../components/ui/actionLink";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../../lib/seo";
import { readProgrammaticPayload } from "../../../../lib/seo/programmaticPayloadBuilder";
import { findUseCaseRole } from "../../../../lib/decisionDomainCatalog";
import { decideCanonicalClusterStaticParams, findDecideClusterRoute } from "../../clusterRoutes";
import { findDecisionScenario } from "../../../seoRouteClusters";
import { publicDecisionLabels } from "../../../../lib/report/reportFormatting";
import { noindexRobots } from "../../../../lib/seo/indexationPolicy";
import { ContentPageShell } from "../../../components/ui/contentPageShell";

type Params = { slug: string; cluster: string };

export const dynamicParams = true;
export const revalidate = 900;

export function generateStaticParams() {
  return decideCanonicalClusterStaticParams;
}

export const buildDecideClusterMetadata = ({
  slug,
  cluster,
  roleTitle,
  roleDescription,
  scenarioTitle,
  isCanonical: _isCanonical,
  payload: _payload,
}: {
  slug: string;
  cluster: string;
  roleTitle: string;
  roleDescription: string;
  scenarioTitle: string;
  isCanonical?: boolean;
  payload?: unknown;
}) => {
  const metadata = buildPageMetadata({
    title: `${roleTitle}: ${scenarioTitle} decision scenario`,
    description: roleDescription,
    path: `/answer/${slug}/${cluster}`,
    imageAlt: roleTitle,
  });

  metadata.robots = noindexRobots;

  return metadata;
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug, cluster } = await params;
  const routeDefinition = findDecideClusterRoute(slug, cluster);
  const roleDefinition = findUseCaseRole(slug);
  const scenarioDefinition = findDecisionScenario(cluster);

  if (!routeDefinition || !roleDefinition || !scenarioDefinition) return {};

  return buildDecideClusterMetadata({
    slug,
    cluster,
    roleTitle: roleDefinition.title,
    roleDescription: roleDefinition.decisions[0] ?? roleDefinition.title,
    scenarioTitle: scenarioDefinition.title,
    isCanonical: routeDefinition.isCanonical,
  });
}

export default async function DecideClusterPage({ params }: { params: Promise<Params> }) {
  const { slug, cluster } = await params;
  const routeDefinition = findDecideClusterRoute(slug, cluster);
  const roleDefinition = findUseCaseRole(slug);
  const scenarioDefinition = findDecisionScenario(cluster);

  if (!routeDefinition || !roleDefinition || !scenarioDefinition) notFound();

  const payloadRecord = await readProgrammaticPayload(`/answer/${slug}/${cluster}`);
  const payload = payloadRecord.payload;

  return (
    <ContentPageShell>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{roleDefinition.title}: {scenarioDefinition.title}</h1>
        <p className="text-sm text-slate-300">How this week&apos;s call applies to {roleDefinition.title} decisions about {scenarioDefinition.title.toLowerCase()}.</p>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">This week&apos;s bounded call</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          <li>• <span className="font-semibold text-slate-100">{publicDecisionLabels.call}:</span> {payload.currentCall}</li>
          <li>• <span className="font-semibold text-slate-100">{publicDecisionLabels.action}:</span> {payload.immediateAction}</li>
          <li>• <span className="font-semibold text-slate-100">{publicDecisionLabels.threshold}:</span> {payload.triggerThreshold}</li>
          <li>• <span className="font-semibold text-slate-100">{publicDecisionLabels.reversal}:</span> {payload.reversalCondition}</li>
        </ul>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Where to go next</h2>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <ActionLink href="/" variant="pill">Weekly brief</ActionLink>
          <ActionLink href="/answer#unresolved-question-router" variant="pill">Decision help</ActionLink>
          <ActionLink href="/signals/capital-tightness-watch" variant="pill">Evidence page</ActionLink>
          <ActionLink href="/toolkits/focus" variant="pill">Decision toolkit</ActionLink>
        </div>
      </section>
    </ContentPageShell>
  );
}
