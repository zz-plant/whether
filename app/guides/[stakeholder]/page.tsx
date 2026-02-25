import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../lib/seo";
import { serializeJsonLd } from "../../../lib/seo";
import { findStageGuide } from "../stageGuides";
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
      path: "/guides",
      imageAlt: "Whether stakeholder guidance",
      imageParams: {
        template: "guides",
        eyebrow: "Stakeholder guide",
        title: "Role-specific macro guidance",
        subtitle: "Use Whether to translate signal posture into role-level planning decisions.",
        kicker: "Guides for leadership stakeholders.",
      },
    });
  }

  return buildPageMetadata({
    title: `${guide.seoTitle} — Whether`,
    description: guide.seoDescription,
    path: `/guides/${guide.slug}`,
    imageAlt: `${guide.title} stakeholder guidance`,
    imageParams: {
      template: "guides",
      eyebrow: "Stakeholder guide",
      title: `For ${guide.title}`,
      subtitle: guide.seoDescription,
      kicker: "Role-based operating guidance.",
    },
  });
}

export default async function StakeholderGuidePage({ params }: StakeholderPageProps) {
  const { stakeholder } = await params;
  const guide = findStakeholderGuide(stakeholder);

  if (!guide) {
    notFound();
  }

  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `How does Whether help ${guide.title}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: guide.seoDescription,
        },
      },
      {
        "@type": "Question",
        name: "How should this role use Whether by company stage?",
        acceptedAnswer: {
          "@type": "Answer",
          text: guide.stageSpecificContent
            .map((entry) => `${findStageGuide(entry.stageSlug)?.title}: ${entry.guidance}`)
            .join(" "),
        },
      },
    ],
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqData) }}
      />
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
        <h2 className="text-lg font-semibold text-slate-100">Stage-specific playbook</h2>
        <ul className="space-y-3 text-sm text-slate-200">
          {guide.stageSpecificContent.map((entry) => {
            const stage = findStageGuide(entry.stageSlug);
            return (
              <li key={entry.stageSlug} className="weather-surface space-y-2 px-4 py-3">
                <p className="font-semibold text-slate-100">{stage?.title}</p>
                <p>{entry.guidance}</p>
              </li>
            );
          })}
        </ul>
      </section>

      {guide.promotionAccelerator ? (
        <section className="weather-panel space-y-4 px-6 py-6">
          <h2 className="text-lg font-semibold text-slate-100">{guide.promotionAccelerator.title}</h2>
          <p className="text-sm text-slate-200">{guide.promotionAccelerator.summary}</p>
          <ul className="space-y-2 text-sm text-slate-300">
            {guide.promotionAccelerator.signals.map((signal) => (
              <li key={signal} className="weather-surface flex gap-3 px-4 py-3">
                <span aria-hidden="true" className="text-sky-300">
                  •
                </span>
                <span>{signal}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Open the live app</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="weather-button-primary inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold tracking-[0.12em]"
          >
            Weekly briefing
          </Link>
          <Link
            href="/operations"
            className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            Operations workspace
          </Link>
        </div>
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
            href="/guides/stage"
            className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            Company stage pages
          </Link>
          <Link
            href="/guides"
            className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            Back to overview
          </Link>
        </div>
      </section>
    </main>
  );
}
