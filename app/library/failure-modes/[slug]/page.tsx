import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../../lib/seo";
import { failureModeDefinitions, failureModes } from "../../../../lib/informationArchitecture";

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams() {
  return failureModes.map((slug) => ({ slug }));
}

const getFailureMode = (slug: string) => failureModeDefinitions.find((failureMode) => failureMode.slug === slug);

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const failureMode = getFailureMode(slug);

  if (!failureMode) {
    return buildPageMetadata({
      title: "Failure mode",
      description: "How to diagnose this failure mode and prevent it early.",
      path: `/library/failure-modes/${slug}`,
      imageAlt: "Failure mode",
    });
  }

  return buildPageMetadata({
    title: `Failure mode: ${failureMode.title}`,
    description: failureMode.summary,
    path: `/library/failure-modes/${slug}`,
    imageAlt: `Failure mode ${failureMode.title}`,
  });
}

export default async function FailureModeDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const failureMode = getFailureMode(slug);

  if (!failureMode) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/library/failure-modes" className="weather-pill inline-flex w-fit min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
        ← Back to failure modes overview
      </Link>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{failureMode.title}</h1>
        <p className="text-base text-slate-200">{failureMode.summary}</p>
        <p className="text-sm text-slate-300">Trigger pattern: {failureMode.trigger}</p>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">How it shows up</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-300">
          {failureMode.symptoms.map((symptom) => (
            <li key={symptom}>{symptom}</li>
          ))}
        </ul>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">First moves</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-300">
          {failureMode.firstMoves.map((firstMove) => (
            <li key={firstMove}>{firstMove}</li>
          ))}
        </ul>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">What to do next</h2>
        <div className="flex flex-wrap gap-2">
          {failureMode.linkedToolkits.map((toolkit) => (
            <Link key={toolkit.href} href={toolkit.href as Route} className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
              {toolkit.label}
            </Link>
          ))}
          {failureMode.linkedConcepts.map((concept) => (
            <Link key={concept.href} href={concept.href as Route} className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
              {concept.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
