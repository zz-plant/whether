import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../../lib/seo";
import { findStageGuide } from "../../stageGuides";
import { stakeholderGuides } from "../../stakeholderGuides";
import { SecondaryPageHeader, SecondaryPageSection, SecondaryPageShell } from "../../../components/secondaryPageShell";
import { ButtonLink } from "../../../components/ui/buttonLink";
import { ActionLink } from "../../../components/ui/actionLink";

type StagePageProps = {
  params: Promise<{ stage: string }>;
};

export const runtime = "edge";
export const revalidate = 86400;

export async function generateMetadata({ params }: StagePageProps): Promise<Metadata> {
  const { stage } = await params;
  const guide = findStageGuide(stage);

  if (!guide) {
    return buildPageMetadata({
      title: "Company stage guide — Whether",
      description: "Stage-specific guidance for leadership teams.",
      path: "/guides/stage",
      imageAlt: "Whether stage guidance",
      imageParams: {
        template: "guides",
        eyebrow: "Company stage guide",
        title: "Stage-specific macro guidance",
        subtitle: "Map capital posture posture to planning expectations at your company stage.",
        kicker: "Whether stage playbooks.",
      },
    });
  }

  return buildPageMetadata({
    title: `${guide.seoTitle} — Whether`,
    description: guide.seoDescription,
    path: `/guides/stage/${guide.slug}`,
    imageAlt: `${guide.title} company stage guidance`,
    imageParams: {
      template: "guides",
      eyebrow: "Company stage guide",
      title: guide.title,
      subtitle: guide.seoDescription,
      kicker: "Stage-specific operating guidance.",
    },
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
    <SecondaryPageShell width="narrow">
      <SecondaryPageHeader
        eyebrow="Company stage guide"
        title={guide.title}
        description={guide.summary}
        aside={(
          <div className="weather-surface space-y-2 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Primary value</p>
            <p className="text-sm text-slate-200">{guide.primaryValue}</p>
          </div>
        )}
      />

      <SecondaryPageSection title="Who 10x&apos;s at this stage">
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
      </SecondaryPageSection>

      <SecondaryPageSection title="Role-specific guidance for this stage">
        <ul className="space-y-3 text-sm text-slate-200">
          {relatedStakeholderGuides.map((role) => (
            <li key={role.slug} className="weather-surface space-y-2 px-4 py-3">
              <p className="font-semibold text-slate-100">{role.title}</p>
              <p>{role.guidance}</p>
              <ActionLink href={`/guides/${role.slug}`} variant="inline">
                Open role page
              </ActionLink>
            </li>
          ))}
        </ul>
      </SecondaryPageSection>

      <SecondaryPageSection
        eyebrow="Open the live app"
        actions={(
          <>
            <ButtonLink href="/" variant="primary">Weekly Brief</ButtonLink>
            <ButtonLink href="/operations" variant="pill">Planning</ButtonLink>
          </>
        )}
      />

      <SecondaryPageSection
        actions={(
          <>
            <ButtonLink href="/guides/stage" variant="pill">Back to stage map</ButtonLink>
            <ButtonLink href="/guides" variant="pill">Back to overview</ButtonLink>
          </>
        )}
      />
    </SecondaryPageShell>
  );
}
