import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../lib/seo";
import {
  recommendedSituationToolkits,
  situationUseCases,
  toolkitDefinitions,
  useCaseRoles,
} from "../../../lib/informationArchitecture";

export const runtime = "edge";

type Params = { slug: string };

const titleCase = (value: string) => value
  .split("-")
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(" ");

export function generateStaticParams() {
  return [
    ...useCaseRoles.map((entry) => ({ slug: entry.slug })),
    ...situationUseCases.map((slug) => ({ slug })),
  ];
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  return buildPageMetadata({
    title: `Decide: ${titleCase(slug)}`,
    description: "A practical entry point into the right toolkit and supporting context.",
    path: `/decide/${slug}`,
    imageAlt: `Decide ${titleCase(slug)}`,
  });
}

export default async function DecideDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const role = useCaseRoles.find((entry) => entry.slug === slug);
  const isSituation = situationUseCases.includes(slug as (typeof situationUseCases)[number]);
  const recommendedToolkits = isSituation
    ? recommendedSituationToolkits[slug as (typeof situationUseCases)[number]]
    : [];

  if (!role && !isSituation) {
    notFound();
  }

  if (role) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <section className="weather-panel space-y-4 px-6 py-6">
          <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{role.title} use case</h1>
          <p className="text-sm text-slate-300">Decisions you&apos;re making</p>
          <ul className="space-y-2 text-sm text-slate-200">{role.decisions.map((item) => <li key={item}>• {item}</li>)}</ul>
        </section>
        <section className="weather-panel space-y-3 px-6 py-6">
          <h2 className="text-lg font-semibold text-slate-100">Failure modes to watch</h2>
          <ul className="space-y-2 text-sm text-slate-300">{role.failureModes.map((item) => <li key={item}>• {item}</li>)}</ul>
          <h2 className="pt-2 text-lg font-semibold text-slate-100">How posture usually shifts</h2>
          <ul className="space-y-2 text-sm text-slate-300">{role.postureShifts.map((item) => <li key={item}>• {item}</li>)}</ul>
        </section>
        <section className="weather-panel space-y-3 px-6 py-6">
          <h2 className="text-lg font-semibold text-slate-100">Recommended toolkits</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {role.recommendedToolkits.map((slugItem) => {
              const toolkit = toolkitDefinitions.find((entry) => entry.slug === slugItem);
              if (!toolkit) return null;
              return <Link key={slugItem} href={`/toolkits/${slugItem}`} className="weather-surface px-4 py-4 text-sm text-slate-100">{toolkit.title}</Link>;
            })}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{titleCase(slug)}</h1>
        <p className="text-sm text-slate-300">Use this page as your fast path to the right toolkit, then go deeper in the library when needed.</p>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Start here</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {recommendedToolkits.map((toolkitSlug) => {
            const toolkit = toolkitDefinitions.find((entry) => entry.slug === toolkitSlug);
            if (!toolkit) return null;

            return (
              <Link key={toolkit.slug} href={`/toolkits/${toolkit.slug}`} className="weather-surface px-4 py-4 text-sm text-slate-100">{toolkit.title}</Link>
            );
          })}
        </div>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Need more depth?</h2>
        <div className="flex gap-3">
          <Link href="/library/failure-modes" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">Failure modes</Link>
          <Link href="/concepts" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">Concepts</Link>
        </div>
      </section>
    </main>
  );
}
