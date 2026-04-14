import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../lib/seo";
import {
  findSituationUseCase,
  decideStaticParams,
  findToolkitDefinition,
  findUseCaseRole,
  isSituationUseCaseSlug,
} from "../../../lib/decisionDomainCatalog";
import { noindexRobots } from "../../../lib/seo/indexationPolicy";

type Params = { slug: string };

const titleCase = (value: string) => value
  .split("-")
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(" ");

export const dynamicParams = false;
export const revalidate = 900;

export function generateStaticParams() {
  return decideStaticParams;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  return {
    ...buildPageMetadata({
      title: `Decision help: ${titleCase(slug)}`,
      description: "A practical entry point into the right toolkit and supporting context.",
      path: `/decide/${slug}`,
      imageAlt: `Decision help ${titleCase(slug)}`,
    }),
    robots: noindexRobots,
  };
}

export default async function DecideDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const role = findUseCaseRole(slug);
  const isSituation = isSituationUseCaseSlug(slug);
  const situationUseCase = isSituation ? findSituationUseCase(slug) : undefined;
  const recommendedToolkitSlugs = role?.recommendedToolkitSlugs ?? situationUseCase?.recommendedToolkitSlugs ?? [];

  if (!role && !isSituation) {
    notFound();
  }

  if (role) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <section className="weather-panel space-y-4 px-6 py-6">
          <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">For {role.title}</h1>
          <p className="text-sm text-slate-300">Current decisions</p>
          <ul className="space-y-2 text-sm text-slate-200">{role.decisions.map((item) => <li key={item}>• {item}</li>)}</ul>
        </section>
        <section className="weather-panel space-y-3 px-6 py-6">
          <h2 className="text-lg font-semibold text-slate-100">Common mistakes</h2>
          <ul className="space-y-2 text-sm text-slate-300">{role.failureModes.map((item) => <li key={item}>• {item}</li>)}</ul>
          <h2 className="pt-2 text-lg font-semibold text-slate-100">When the call changes</h2>
          <ul className="space-y-2 text-sm text-slate-300">{role.postureShifts.map((item) => <li key={item}>• {item}</li>)}</ul>
        </section>
        <section className="weather-panel space-y-3 px-6 py-6">
          <h2 className="text-lg font-semibold text-slate-100">Recommended tools</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {recommendedToolkitSlugs.map((slugItem) => {
              const toolkit = findToolkitDefinition(slugItem);
              if (!toolkit) return null;
              return (
                <Link key={slugItem} href={`/toolkits/${slugItem}`} className="weather-surface space-y-2 px-4 py-4 text-sm text-slate-100">
                  <p className="font-semibold">{toolkit.title}</p>
                  <p className="text-xs text-slate-300">{toolkit.decisionThisSession}</p>
                  <p className="text-xs text-slate-300">Artifact: {toolkit.decisionArtifact}</p>
                </Link>
              );
            })}
          </div>
        </section>
        <section className="weather-panel space-y-3 px-6 py-6">
          <h2 className="text-lg font-semibold text-slate-100">Try these first</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {recommendedToolkitSlugs.map((slugItem) => {
              const toolkit = findToolkitDefinition(slugItem);
              if (!toolkit) return null;

              return (
                <Link key={`run-now-${slugItem}`} href={`/toolkits/${slugItem}`} className="weather-surface space-y-2 px-4 py-4 text-sm text-slate-100">
                  <p className="font-semibold">{toolkit.title}</p>
                  <p className="text-xs text-slate-300">{toolkit.decisionThisSession}</p>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{situationUseCase?.title || titleCase(slug)}</h1>
        <p className="text-sm text-slate-300">The strongest paths for this decision.</p>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Recommended</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {recommendedToolkitSlugs.map((toolkitSlug) => {
            const toolkit = findToolkitDefinition(toolkitSlug);
            if (!toolkit) return null;

            return (
              <Link key={toolkit.slug} href={`/toolkits/${toolkit.slug}`} className="weather-surface space-y-2 px-4 py-4 text-sm text-slate-100">
                <p className="font-semibold">{toolkit.title}</p>
                <p className="text-xs text-slate-300">{toolkit.decisionThisSession}</p>
                <p className="text-xs text-slate-300">Artifact: {toolkit.decisionArtifact}</p>
              </Link>
            );
          })}
        </div>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Try these first</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {recommendedToolkitSlugs.map((toolkitSlug) => {
            const toolkit = findToolkitDefinition(toolkitSlug);
            if (!toolkit) return null;

            return (
              <Link key={`run-now-${toolkitSlug}`} href={`/toolkits/${toolkitSlug}`} className="weather-surface space-y-2 px-4 py-4 text-sm text-slate-100">
                <p className="font-semibold">{toolkit.title}</p>
                <p className="text-xs text-slate-300">{toolkit.decisionThisSession}</p>
              </Link>
            );
          })}
        </div>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Still unsure?</h2>
        <div className="flex gap-3">
          <Link href="/method#revisit-call" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">Revisit triggers</Link>
          <Link href="/method" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">Trust</Link>
        </div>
      </section>
    </main>
  );
}
