import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../lib/seo";
import { serializeJsonLd } from "../../../lib/seo";
import { findStageGuide } from "../stageGuides";
import {
  findStakeholderGuide,
} from "../stakeholderGuides";
import { SecondaryPageHeader, SecondaryPageSection, SecondaryPageShell } from "../../components/secondaryPageShell";
import { ButtonLink } from "../../components/ui/buttonLink";

type StakeholderPageProps = {
  params: Promise<{ stakeholder: string }>;
};

export const runtime = "edge";
export const revalidate = 86400;

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
    <SecondaryPageShell width="narrow">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqData) }}
      />
      <SecondaryPageHeader
        eyebrow="Stakeholder guide"
        title={`For ${guide.title}`}
        description={guide.seoDescription}
        aside={(
          <div className="weather-surface space-y-2 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Tagline</p>
            <p className="text-sm font-semibold text-sky-200">{guide.tagline}</p>
          </div>
        )}
      />

      <SecondaryPageSection title="How Whether helps this role">
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
      </SecondaryPageSection>

      <SecondaryPageSection title="Stage-specific playbook">
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
      </SecondaryPageSection>

      {guide.promotionAccelerator ? (
        <SecondaryPageSection title={guide.promotionAccelerator.title}>
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
        </SecondaryPageSection>
      ) : null}

      <SecondaryPageSection
        eyebrow="Open the live app"
        actions={(
          <>
            <ButtonLink href="/" variant="primary">Weekly Brief</ButtonLink>
            <ButtonLink href="/operations" variant="pill">Planning</ButtonLink>
          </>
        )}
      />

      <SecondaryPageSection eyebrow="Positioning line">
        <p className="weather-surface px-4 py-3 text-sm font-semibold text-slate-100">
          {guide.positioning}
        </p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/guides/stage" variant="pill">Company stage pages</ButtonLink>
          <ButtonLink href="/guides" variant="pill">Back to overview</ButtonLink>
        </div>
      </SecondaryPageSection>
    </SecondaryPageShell>
  );
}
