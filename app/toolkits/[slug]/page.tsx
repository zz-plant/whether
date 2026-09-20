import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Route } from "../../../lib/navigation/routeType";
import { buildPageMetadata } from "../../../lib/seo";
import { buildToolkitHowTo } from "../../../lib/seo/pageStructuredData";
import { findDecisionPathsForToolkit, findToolkitDefinition, toolkitStaticParams } from "../../../lib/decisionDomainCatalog";
import { publicDecisionLabels } from "../../../lib/report/reportFormatting";
import { noindexRobots } from "../../../lib/seo/indexationPolicy";
import { ContentPageShell } from "../../components/ui/contentPageShell";
import { Breadcrumbs } from "../../components/ui/breadcrumbs";
import { JsonLdScript } from "../../components/jsonLdScript";
import { ToolkitPlaybookGlyph } from "../../components/illustrations/ToolkitPlaybookGlyph";
type Params = { slug: string };

export const dynamicParams = true;
export const revalidate = 900;

export function generateStaticParams() {
  return toolkitStaticParams;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const toolkit = findToolkitDefinition(slug);
  if (!toolkit) return {};

  return {
    ...buildPageMetadata({
      title: toolkit.title,
      description: toolkit.whenToUse,
      path: `/toolkits/${slug}`,
      imageAlt: toolkit.title,
    }),
    robots: noindexRobots,
  };
}

export default async function ToolkitDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const toolkit = findToolkitDefinition(slug);
  if (!toolkit) notFound();
  const decisionPaths = findDecisionPathsForToolkit(toolkit.slug);

  return (
    <ContentPageShell>
      {/* The run sequence is a HowTo: steps with prompts, and the prep checklist
          as what you bring. The page is noindex today, so this costs nothing and
          is ready the day that changes. */}
      <JsonLdScript data={buildToolkitHowTo(toolkit)} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Resolve", href: "/resolve" },
          { label: "Toolkits", href: "/resolve#toolkit-library" },
          { label: toolkit.title },
        ]}
      />
      <Link href="/resolve#toolkit-library" className="weather-pill inline-flex w-fit min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
        ← Back to Decision Tools toolkit library
      </Link>
      <section className="weather-panel space-y-4 px-6 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="type-badge text-fluid-micro rounded px-2 py-0.5 bg-slate-800 text-sky-300 font-mono">
                {toolkit.timeToRun}
              </span>
              <span className="type-badge text-fluid-micro rounded px-2 py-0.5 bg-slate-800 text-slate-300">
                {toolkit.recommendedParticipants}
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{toolkit.title}</h1>
            <p className="text-sm text-slate-300">{toolkit.whenToUse}</p>
          </div>
          <ToolkitPlaybookGlyph size={60} className="self-start sm:self-center" />
        </div>

        <dl className="grid gap-3 pt-2 sm:grid-cols-2 text-sm border-t border-slate-800/80">
          <div className="weather-surface p-3.5 space-y-1">
            <dt className="text-fluid-micro font-semibold uppercase tracking-wider text-slate-400">Decide now</dt>
            <dd className="text-slate-100 font-medium">{toolkit.decisionThisSession}</dd>
          </div>
          <div className="weather-surface p-3.5 space-y-1">
            <dt className="text-fluid-micro font-semibold uppercase tracking-wider text-slate-400">Operating outcome</dt>
            <dd className="text-slate-100 font-medium">{toolkit.operatingOutcome}</dd>
          </div>
          <div className="weather-surface p-3.5 space-y-1 sm:col-span-2">
            <dt className="text-fluid-micro font-semibold uppercase tracking-wider text-slate-400">Artifact you leave with</dt>
            <dd className="text-slate-100 font-medium">{toolkit.decisionArtifact}</dd>
          </div>
        </dl>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Bounded operating rules</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          <li>• <span className="font-semibold text-slate-100">{publicDecisionLabels.action} in tighter conditions:</span> {toolkit.tightenNow}</li>
          <li>• <span className="font-semibold text-slate-100">{publicDecisionLabels.action} in easier conditions:</span> {toolkit.loosenNow}</li>
          <li>• <span className="font-semibold text-slate-100">Proceed threshold:</span> {toolkit.proceedThreshold}</li>
          <li>• <span className="font-semibold text-slate-100">{publicDecisionLabels.threshold}:</span> {toolkit.stopTrigger}</li>
          <li>• <span className="font-semibold text-slate-100">{publicDecisionLabels.reversal}:</span> {toolkit.reversalTrigger}</li>
        </ul>
        <p className="text-sm text-slate-300"><span className="font-semibold">Posture split:</span> {toolkit.byPosture}</p>
        <p className="text-sm text-slate-300"><span className="font-semibold">Who should run it:</span> {toolkit.recommendedParticipants}</p>
      </section>
      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Prep checklist</h2>
        <ul className="space-y-1 text-sm text-slate-200">
          {toolkit.prepChecklist.map((item) => <li key={item}>• {item}</li>)}
        </ul>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Run sequence</h2>
        <ol className="space-y-3 text-sm text-slate-200">
          {/*
            * `id` is load-bearing, not decoration: the HowTo node in
            * `buildToolkitHowTo` gives every step a `#step-N` url, and without a
            * matching anchor here those urls identify nothing and a deep link
            * drops the reader at the top of the page. The numbering is the same
            * `index + 1` the builder uses.
            */}
          {toolkit.runSequence.map((step, index) => (
            <li key={step.phase} id={`step-${index + 1}`} className="weather-surface space-y-2 px-4 py-4">
              <p className="type-eyebrow text-slate-300">{step.phase}</p>
              <p><span className="font-semibold text-slate-100">Objective:</span> {step.objective}</p>
              <p className="font-semibold text-slate-100">Prompts</p>
              <ul className="space-y-1">
                {step.prompts.map((prompt) => <li key={prompt}>• {prompt}</li>)}
              </ul>
              <p><span className="font-semibold text-slate-100">Deliverable:</span> {step.deliverable}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Success signals</h2>
        <ul className="space-y-1 text-sm text-slate-200">
          {toolkit.successSignals.map((item) => <li key={item}>• {item}</li>)}
        </ul>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">What&apos;s in this toolkit</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          {toolkit.instruments.map((item, index) => {
            const mappedCanon = toolkit.canonLinks[index % toolkit.canonLinks.length];
            const instrumentHref = `${mappedCanon.href}?instrument=${encodeURIComponent(item)}` as Route;
            return (
              <li key={item}>
                <Link href={instrumentHref} className="inline-flex min-h-[44px] items-center gap-2 text-sky-200 underline decoration-sky-400/60 underline-offset-4 hover:text-sky-100">
                  <span aria-hidden="true">↗</span>
                  <span>{item}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Common mistakes to avoid</h2>
        <ul className="space-y-2 text-sm text-slate-200">{toolkit.misuseCases.map((item) => <li key={item}>• {item}</li>)}</ul>
        <h2 className="pt-2 text-lg font-semibold text-slate-100">Related guidance</h2>
        <div className="flex flex-wrap gap-2">{toolkit.canonLinks.map((link) => <Link key={link.href} href={link.href as Route} className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">{link.label}</Link>)}</div>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Start from your role or situation</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {decisionPaths.roles.map((path) => (
            <Link key={path.slug} href={path.href as Route} className="weather-surface space-y-1 px-4 py-4 text-sm text-slate-100">
              <p className="type-eyebrow text-slate-300">Role path</p>
              <p className="font-semibold">{path.title}</p>
            </Link>
          ))}
          {decisionPaths.situations.map((path) => (
            <Link key={path.slug} href={path.href as Route} className="weather-surface space-y-1 px-4 py-4 text-sm text-slate-100">
              <p className="type-eyebrow text-slate-300">Situation path</p>
              <p className="font-semibold">{path.title}</p>
            </Link>
          ))}
        </div>
      </section>
    </ContentPageShell>
  );
}
