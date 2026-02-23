import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../../lib/seo";
import { stageGuides, findStageGuide } from "../../stageGuides";
import { stakeholderGuides } from "../../stakeholderGuides";

type StagePageProps = {
  params: Promise<{ stage: string }>;
};

export function generateStaticParams() {
  return stageGuides.map((guide) => ({ stage: guide.slug }));
}

export async function generateMetadata({ params }: StagePageProps): Promise<Metadata> {
  const { stage } = await params;
  const guide = findStageGuide(stage);

  if (!guide) {
    return buildPageMetadata({
      title: "Company stage guide — Whether",
      description: "Stage-specific guidance for leadership teams.",
      path: "/brief/stage",
      imageAlt: "Whether stage guidance",
    });
  }

  return buildPageMetadata({
    title: `${guide.seoTitle} — Whether`,
    description: guide.seoDescription,
    path: `/brief/stage/${guide.slug}`,
    imageAlt: `${guide.title} company stage guidance`,
  });
}

export default async function StageGuidePage({ params }: StagePageProps) {
  const { stage } = await params;
  const guide = findStageGuide(stage);

  if (!guide) {
    notFound();
  }

  const relatedStakeholderGuides = stakeholderGuides
    .map((stakeholder) => {
      const stageGuidance = stakeholder.stageSpecificContent.find(
        (entry) => entry.stageSlug === guide.slug,
      );

      if (!stageGuidance) {
        return null;
      }

      return {
        slug: stakeholder.slug,
        title: stakeholder.title,
        guidance: stageGuidance.guidance,
      };
    })
    .filter((value): value is { slug: string; title: string; guidance: string } => Boolean(value));

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Company stage guide</p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{guide.title}</h1>
        <p className="text-sm text-slate-200">{guide.summary}</p>
        <p className="text-sm text-slate-300">
          <span className="font-semibold text-slate-100">Primary value:</span> {guide.primaryValue}
        </p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Who 10x&apos;s at this stage</h2>
        <ul className="space-y-3 text-sm text-slate-200">
          {guide.whoBenefitsMost.map((entry) => (
            <li key={entry} className="weather-surface flex gap-3 px-4 py-3">
              <span aria-hidden="true" className="text-sky-300">•</span>
              <span>{entry}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-slate-300">
          <span className="font-semibold text-slate-100">Best use:</span> {guide.bestUse}
        </p>
        {guide.failureMode ? (
          <p className="text-sm text-amber-200">
            <span className="font-semibold text-amber-100">Failure mode:</span> {guide.failureMode}
          </p>
        ) : null}
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Role-specific guidance for this stage</h2>
        <ul className="space-y-3 text-sm text-slate-200">
          {relatedStakeholderGuides.map((role) => (
            <li key={role.slug} className="weather-surface space-y-2 px-4 py-3">
              <p className="font-semibold text-slate-100">{role.title}</p>
              <p>{role.guidance}</p>
              <Link
                href={`/brief/${role.slug}`}
                className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.14em] text-sky-200 underline decoration-slate-500 underline-offset-4 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
              >
                Open role page →
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/brief/stage"
            className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            Back to stage map
          </Link>
          <Link
            href="/brief"
            className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            Back to overview
          </Link>
        </div>
      </section>
    </main>
  );
}
