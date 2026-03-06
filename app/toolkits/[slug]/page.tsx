import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../lib/seo";
import { toolkitDefinitions } from "../../../lib/informationArchitecture";
type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams() {
  return toolkitDefinitions.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const toolkit = toolkitDefinitions.find((entry) => entry.slug === slug);
  if (!toolkit) return {};

  return buildPageMetadata({
    title: toolkit.title,
    description: toolkit.whenToUse,
    path: `/toolkits/${slug}`,
    imageAlt: toolkit.title,
  });
}

export default async function ToolkitDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const toolkit = toolkitDefinitions.find((entry) => entry.slug === slug);
  if (!toolkit) notFound();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/toolkits" className="weather-pill inline-flex w-fit min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
        ← Back to toolkits overview
      </Link>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{toolkit.title}</h1>
        <p className="text-base text-slate-200"><span className="font-semibold">Decide now:</span> {toolkit.decisionThisSession}</p>
        <p className="text-base text-slate-200"><span className="font-semibold">When to use:</span> {toolkit.whenToUse}</p>
        <p className="text-base text-slate-200"><span className="font-semibold">Operating outcome:</span> {toolkit.operatingOutcome}</p>
        <p className="text-base text-slate-200"><span className="font-semibold">Typical runtime:</span> {toolkit.timeToRun}</p>
        <p className="text-base text-slate-200"><span className="font-semibold">Artifact you leave with:</span> {toolkit.decisionArtifact}</p>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Bounded operating rules</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          <li>• <span className="font-semibold text-slate-100">Tighten:</span> {toolkit.tightenNow}</li>
          <li>• <span className="font-semibold text-slate-100">Loosen:</span> {toolkit.loosenNow}</li>
          <li>• <span className="font-semibold text-slate-100">Proceed threshold:</span> {toolkit.proceedThreshold}</li>
          <li>• <span className="font-semibold text-slate-100">Stop trigger:</span> {toolkit.stopTrigger}</li>
          <li>• <span className="font-semibold text-slate-100">Reversal trigger:</span> {toolkit.reversalTrigger}</li>
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
          {toolkit.runSequence.map((step) => (
            <li key={step.phase} className="weather-surface space-y-2 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">{step.phase}</p>
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
        <h2 className="text-lg font-semibold text-slate-100">Included instruments</h2>
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
        <h2 className="pt-2 text-lg font-semibold text-slate-100">Canon references</h2>
        <div className="flex flex-wrap gap-2">{toolkit.canonLinks.map((link) => <Link key={link.href} href={link.href as Route} className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">{link.label}</Link>)}</div>
      </section>
    </main>
  );
}
