import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../lib/seo";
import {
  findStakeholderGuide,
  stakeholderGuides,
} from "../stakeholderGuides";

type StakeholderPageProps = {
  params: Promise<{ stakeholder: string }>;
};

export function generateStaticParams() {
  return stakeholderGuides.map((guide) => ({ stakeholder: guide.slug }));
}

export async function generateMetadata({
  params,
}: StakeholderPageProps): Promise<Metadata> {
  const { stakeholder } = await params;
  const guide = findStakeholderGuide(stakeholder);

  if (!guide) {
    return buildPageMetadata({
      title: "Stakeholder guide — Whether",
      description: "Role-based guidance for leadership teams.",
      path: "/brief",
      imageAlt: "Whether stakeholder guidance",
    });
  }

  return buildPageMetadata({
    title: `${guide.seoTitle} — Whether`,
    description: guide.seoDescription,
    path: `/brief/${guide.slug}`,
    imageAlt: `${guide.title} stakeholder guidance`,
  });
}

export default async function StakeholderGuidePage({ params }: StakeholderPageProps) {
  const { stakeholder } = await params;
  const guide = findStakeholderGuide(stakeholder);

  if (!guide) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Stakeholder guide
        </p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">For {guide.title}</h1>
        <p className="text-base text-sky-200">{guide.tagline}</p>
        <p className="text-sm text-slate-300">{guide.seoDescription}</p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">How Whether helps this role</h2>
        <ul className="space-y-3 text-sm text-slate-200">
          {guide.bullets.map((bullet) => (
            <li key={bullet} className="weather-surface flex gap-3 px-4 py-3">
              <span aria-hidden="true" className="text-sky-300">
                •
              </span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Positioning line
        </p>
        <p className="weather-surface px-4 py-3 text-sm font-semibold text-slate-100">
          {guide.positioning}
        </p>
        <div className="flex flex-wrap gap-3">
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
